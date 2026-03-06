import { Injectable } from "@danet/core";
import { config } from "../../config.ts";
import type {
  LicenseValidationResult,
  FreemiusWebhookEvent,
  FreemiusSubscription,
  FreemiusPlan,
  SubscriptionResult,
  SubscriptionsResult,
  SubscriptionStatus,
} from "../../types.ts";

/**
 * Core Freemius service.
 * Handles API communication, HMAC signature verification, and license validation.
 */
@Injectable()
export class FreemiusService {
  private readonly apiBase = config.freemius.apiBase;
  private readonly storeId = config.freemius.storeId;
  private readonly publicKey = config.freemius.publicKey;
  private readonly secretKey = config.freemius.secretKey;

  // ─── Webhook Verification ───────────────────────────────────────────────────

  /**
   * Verifies an incoming Freemius webhook using HMAC-SHA256.
   * Freemius signs the raw request body with the webhook secret.
   */
  async verifyWebhookSignature(
    rawBody: string,
    signature: string
  ): Promise<boolean> {
    try {
      const secret = config.freemius.webhookSecret;
      const encoder = new TextEncoder();

      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const signatureBytes = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(rawBody)
      );

      const expectedSignature = btoa(
        String.fromCharCode(...new Uint8Array(signatureBytes))
      );

      // Constant-time comparison to prevent timing attacks
      return this.safeCompare(expectedSignature, signature);
    } catch (err) {
      console.error("[FreemiusService] Signature verification error:", err);
      return false;
    }
  }

  // ─── License Validation ─────────────────────────────────────────────────────

  /**
   * Validates a license key against the Freemius API.
   * Returns structured validation result.
   */
  async validateLicense(
    licenseKey: string,
    productId?: string
  ): Promise<LicenseValidationResult> {
    try {
      const pluginId = productId ?? this.storeId;
      const auth = this.buildAuthHeader();

      const res = await fetch(
        `${this.apiBase}/products/${pluginId}/licenses.json?search=${encodeURIComponent(licenseKey)}`,
        {
          headers: {
            Authorization: auth,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        const body = await res.text();
        console.error("[FreemiusService] API error:", res.status, body);
        return {
          valid: false,
          message: `Freemius API error: ${res.status}`,
        };
      }

      const data = await res.json() as { licenses?: Array<Record<string, unknown>> };
      const licenses = data.licenses ?? [];

      const license = licenses.find(
        (l) => (l.secret_key as string) === licenseKey
      );

      if (!license) {
        return { valid: false, message: "License not found." };
      }

      if (license.is_cancelled) {
        return { valid: false, message: "License has been cancelled." };
      }

      if (license.expiration) {
        const expDate = new Date(license.expiration as string);
        if (expDate < new Date()) {
          return {
            valid: false,
            expiration: license.expiration as string,
            message: "License has expired.",
          };
        }
      }

      return {
        valid: true,
        plan: (license.plan_id as number)?.toString(),
        expiration: (license.expiration as string | null) ?? null,
        quota: license.quota as number,
        activated: license.activated as number,
        message: "License is valid.",
      };
    } catch (err) {
      console.error("[FreemiusService] validateLicense error:", err);
      return {
        valid: false,
        message: "An error occurred while validating the license.",
      };
    }
  }

  // ─── Subscription Queries ───────────────────────────────────────────────────────

  /**
   * Fetches subscriptions for a given user ID or license key.
   * At least one of the two must be provided.
   * Enriches each subscription with a derived `status` and `billing_cycle_label`.
   */
  async getSubscriptions(
    params: { userId?: string; licenseKey?: string; productId?: string }
  ): Promise<SubscriptionsResult> {
    try {
      const pluginId = params.productId ?? this.storeId;
      const auth = this.buildAuthHeader();

      // Build query string — Freemius supports ?user_id=X or ?license_key=X
      const qs = new URLSearchParams();
      if (params.userId) qs.set("user_id", params.userId);
      if (params.licenseKey) qs.set("license_key", params.licenseKey);

      const url = `${this.apiBase}/products/${pluginId}/subscriptions.json${qs.size ? "?" + qs.toString() : ""}`;

      const [subRes, planRes] = await Promise.all([
        fetch(url, { headers: { Authorization: auth } }),
        fetch(`${this.apiBase}/products/${pluginId}/plans.json`, { headers: { Authorization: auth } }),
      ]);

      if (!subRes.ok) {
        const body = await subRes.text();
        console.error("[FreemiusService] Subscriptions API error:", subRes.status, body);
        return { subscriptions: [], total: 0 };
      }

      const subData = await subRes.json() as { subscriptions?: FreemiusSubscription[] };
      const planData = planRes.ok
        ? (await planRes.json() as { plans?: FreemiusPlan[] })
        : { plans: [] };

      const planMap = new Map<number, string>(
        (planData.plans ?? []).map((p) => [p.id, p.name])
      );

      const subscriptions = (subData.subscriptions ?? []).map((s) =>
        this.buildSubscriptionResult(s, planMap)
      );

      return { subscriptions, total: subscriptions.length };
    } catch (err) {
      console.error("[FreemiusService] getSubscriptions error:", err);
      return { subscriptions: [], total: 0 };
    }
  }

  /**
   * Fetches a single subscription by its ID.
   */
  async getSubscriptionById(
    subscriptionId: string,
    productId?: string
  ): Promise<SubscriptionResult | null> {
    try {
      const pluginId = productId ?? this.storeId;
      const auth = this.buildAuthHeader();

      const [subRes, planRes] = await Promise.all([
        fetch(`${this.apiBase}/products/${pluginId}/subscriptions/${subscriptionId}.json`, {
          headers: { Authorization: auth },
        }),
        fetch(`${this.apiBase}/products/${pluginId}/plans.json`, {
          headers: { Authorization: auth },
        }),
      ]);

      if (!subRes.ok) {
        if (subRes.status === 404) return null;
        const body = await subRes.text();
        console.error("[FreemiusService] Subscription API error:", subRes.status, body);
        return null;
      }

      const sub = await subRes.json() as FreemiusSubscription;
      const planData = planRes.ok
        ? (await planRes.json() as { plans?: FreemiusPlan[] })
        : { plans: [] };

      const planMap = new Map<number, string>(
        (planData.plans ?? []).map((p) => [p.id, p.name])
      );

      return this.buildSubscriptionResult(sub, planMap);
    } catch (err) {
      console.error("[FreemiusService] getSubscriptionById error:", err);
      return null;
    }
  }

  // ─── Webhook Forwarding ───────────────────────────────────────────────────────

  /**
   * Optionally forwards verified webhook events to a configured URL
   * (e.g. your SvelteKit app). Silently fails if not configured.
   */
  async forwardEvent(event: FreemiusWebhookEvent): Promise<void> {
    const { forwardUrl, forwardSecret } = config.webhook;
    if (!forwardUrl) return;

    try {
      const body = JSON.stringify(event);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (forwardSecret) {
        headers["x-webhook-secret"] = forwardSecret;
      }

      const res = await fetch(forwardUrl, {
        method: "POST",
        headers,
        body,
      });

      if (!res.ok) {
        console.warn(
          `[FreemiusService] Forward to ${forwardUrl} failed: ${res.status}`
        );
      }
    } catch (err) {
      console.error("[FreemiusService] Event forwarding error:", err);
    }
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Derives a human-readable status from raw Freemius subscription fields.
   */
  private deriveStatus(sub: FreemiusSubscription): SubscriptionStatus {
    if (sub.is_cancelled) return "cancelled";
    if (sub.billing_cycle !== 0 && sub.next_payment) {
      const next = new Date(sub.next_payment);
      if (next < new Date()) return "past_due";
    }
    return "active";
  }

  /**
   * Builds a SubscriptionResult from a raw FreemiusSubscription.
   */
  private buildSubscriptionResult(
    s: FreemiusSubscription,
    planMap: Map<number, string>
  ): SubscriptionResult {
    const cycleLabel =
      s.billing_cycle === 0 ? "lifetime"
      : s.billing_cycle === 1 ? "monthly"
      : s.billing_cycle === 12 ? "annual"
      : `${s.billing_cycle} months`;

    return {
      id: s.id,
      plan_id: s.plan_id,
      plan_name: planMap.get(s.plan_id),
      license_id: s.license_id,
      billing_cycle: s.billing_cycle,
      billing_cycle_label: cycleLabel,
      amount_per_cycle: s.amount_per_cycle,
      currency: s.currency,
      status: this.deriveStatus(s),
      is_cancelled: s.is_cancelled,
      next_payment: s.next_payment,
    };
  }

  /**
   * Builds a Basic Auth header using the Freemius public/secret key pair.
   */
  private buildAuthHeader(): string {
    const credentials = btoa(`${this.publicKey}:${this.secretKey}`);
    return `Basic ${credentials}`;
  }

  /**
   * Constant-time string comparison to prevent timing attacks.
   */
  private safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) {
      mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return mismatch === 0;
  }
}
