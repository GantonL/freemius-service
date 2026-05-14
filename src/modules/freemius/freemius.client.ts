import { Injectable } from "@danet/core";
import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import { config } from "../../config.ts";
import { HttpClient } from "../../utils/http.util.ts";
import type { FreemiusWebhookEvent } from "../../types.ts";
import {
  type EndpointConfig,
  type FreemiusClientMethods,
  freemiusEndpoints,
} from "./freemius.endpoints.ts";

// ─── Proxy target type ────────────────────────────────────────────────────────

/**
 * The public interface of FreemiusClient includes both the hand-written
 * methods and the dynamically generated endpoint methods.
 */
export type FreemiusClientInterface =
  & FreemiusClient
  & FreemiusClientMethods<typeof freemiusEndpoints>;

@Injectable()
export class FreemiusClient {
  /**
   * Returns a Proxy-wrapped instance so callers transparently get both
   * the explicit methods on this class AND auto-generated endpoint methods
   * derived from `freemiusEndpoints`.
   */
  constructor(private readonly http: HttpClient) {
    // Return a Proxy so that property accesses for endpoint names are
    // intercepted and dispatched to `callEndpoint` automatically.
    return new Proxy(this, {
      get(target: FreemiusClient, prop: keyof FreemiusClient) {
        // If the property exists on the class, return it as-is.
        if (prop in target) {
          const value = target[prop];
          return typeof value === "function" ? value.bind(target) : value;
        }

        // If the name matches a configured endpoint, return a generated method.
        if (prop in freemiusEndpoints) {
          const endpointKey = prop as keyof typeof freemiusEndpoints;
          return (args?: Record<string, string | number | undefined>) =>
            target.callEndpoint(freemiusEndpoints[endpointKey], args);
        }

        return undefined;
      },
    }) as unknown as FreemiusClientInterface;
  }

  // ─── Endpoint Dispatcher ────────────────────────────────────────────────────

  /**
   * Resolves a path template, separating `:param` segments from query args,
   * then dispatches the HTTP request through `HttpClient`.
   */
  private async callEndpoint<C extends EndpointConfig>(
    endpoint: C,
    args: Record<string, string | number | undefined> = {},
  ): Promise<unknown> {
    // 1. Interpolate path parameters
    const pathParamRegex = /:([a-zA-Z][a-zA-Z0-9_]*)/g;
    const usedParams = new Set<string>();

    const resolvedPath = endpoint.path.replace(
      pathParamRegex,
      (_match, paramName: string) => {
        usedParams.add(paramName);
        const value = args[paramName];
        if (value === undefined || value === null) {
          throw new Error(
            `[FreemiusClient] Missing required path parameter: "${paramName}" for endpoint "${endpoint.path}"`,
          );
        }
        return String(value);
      },
    );

    // 2. The remaining args become query-string parameters
    const query: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(args)) {
      if (!usedParams.has(key) && value !== undefined) {
        query[key] = value;
      }
    }

    // 3. Build full URL and dispatch
    const url = `${config.freemius.apiBase}${resolvedPath}`;
    const options = this.buildOptions(
      endpoint.responseType === "arrayBuffer"
        ? { responseType: "arrayBuffer" }
        : Object.keys(query).length > 0
        ? { query }
        : {},
    );

    return this.http[endpoint.method]<unknown>(url, options);
  }

  // ─── Context Validation ─────────────────────────────────────────────────────

  /**
   * Validates that a given storeId / productId matches what is configured
   * in the environment.  Called by the service layer before invoking endpoints.
   */
  validateContext(params: { storeId?: string; productId?: string }) {
    if (params.storeId && params.storeId !== config.freemius.storeId) {
      throw new Error("Invalid storeId");
    }
    if (params.productId && params.productId !== config.freemius.productId) {
      throw new Error("Invalid productId");
    }
  }

  // ─── Webhook Signature Verification ─────────────────────────────────────────

  /**
   * Validates and parses an incoming webhook payload using Node's crypto for
   * HMAC-SHA256 signature verification.
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

  // ─── Auth Header Builder ─────────────────────────────────────────────────────

  private buildOptions(
    options: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      ...options,
      headers: {
        ...(options.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${config.freemius.apiToken}`,
        "Content-Type": "application/json",
      },
    };
  }
}
