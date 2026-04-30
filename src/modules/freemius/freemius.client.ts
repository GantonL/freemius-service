import { Injectable } from "@danet/core";
import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import { config } from "../../config.ts";
import { HttpClient } from "../../utils/http.util.ts";
import type { FreemiusWebhookEvent } from "../../types.ts";

@Injectable()
export class FreemiusClient {

  constructor(private readonly http: HttpClient) { }

  /**
   * Helper to ensure storeId and productId match the environment if provided.
   */
  validateContext(params: { storeId?: string; productId?: string }) {
    if (params.storeId && params.storeId !== config.freemius.storeId) {
      throw new Error("Invalid storeId");
    }
    if (params.productId && params.productId !== config.freemius.productId) {
      throw new Error("Invalid productId");
    }
  }

  /**
   * Helper to merge default headers (Authorization) into options
   */
  private buildOptions(options: any = {}): any {
    return {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${config.freemius.apiToken}`,
        "Content-Type": "application/json",
      },
    };
  }

  async get<T>(path: string, query?: Record<string, any>): Promise<T> {
    const url = `${config.freemius.apiBase}${path}`;
    return this.http.get<T>(url, this.buildOptions({ query }));
  }

  async getBuffer(path: string): Promise<ArrayBuffer> {
    const url = `${config.freemius.apiBase}${path}`;
    return this.http.get<ArrayBuffer>(
      url,
      this.buildOptions({ responseType: "arrayBuffer" })
    );
  }

  // ─── Webhook Signature Verification ─────────────────────────────────────────

  /**
   * Validates and parses an incoming webhook payload using Node's crypto for signature verification.
   */
  verifyWebhookSignature(
    rawBody: string,
    signature: string | null,
  ): FreemiusWebhookEvent | null {
    if (!signature) {
      console.error("[FreemiusClient] Missing signature header.");
      return null;
    }

    const secretKey = config.freemius.productSecret;

    const hash = crypto
      .createHmac("sha256", secretKey)
      .update(rawBody)
      .digest("hex");

    let isValid = false;
    try {
      isValid = crypto.timingSafeEqual(
        Buffer.from(hash, "hex"),
        Buffer.from(signature, "hex"),
      );
    } catch {
      // Ignore comparison errors (e.g. length mismatch)
    }

    if (!isValid) {
      console.error("[FreemiusClient] Webhook signature validation failed.");
      return null;
    }

    try {
      return JSON.parse(rawBody) as FreemiusWebhookEvent;
    } catch (err) {
      console.error("[FreemiusClient] Webhook JSON parse error:", err);
      return null;
    }
  }
}
