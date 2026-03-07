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
  FreemiusPayment,
  PaymentResult,
  PaymentsResult,
} from "../../types.ts";
import { Freemius } from "@freemius/sdk";

/**
 * Core Freemius service.
 * Handles API communication, HMAC signature verification, and license validation.
 */
@Injectable()
export class FreemiusService {
  private readonly storeId = config.freemius.storeId;
  private readonly freemius: Freemius;

  constructor() {
    this.freemius = new Freemius({
      productId: Number(this.storeId),
      publicKey: config.freemius.publicKey,
      secretKey: config.freemius.secretKey,
      apiKey: config.freemius.publicKey, // We map apiKey to publicKey if no distinct apiKey is provided
    });
  }

  /**
   * Returns a Freemius SDK instance. If a custom productId is provided,
   * it instantiates a temporary client for that product ID using the same keys.
   */
  private getSDK(productId?: string): Freemius {
    if (!productId || productId === this.storeId) {
      return this.freemius;
    }
    return new Freemius({
      productId: Number(productId),
      publicKey: config.freemius.publicKey,
      secretKey: config.freemius.secretKey,
      apiKey: config.freemius.publicKey,
    });
  }

  // ─── Webhook Verification ───────────────────────────────────────────────────

  /**
   * Returns a configured webhook listener from the SDK.
   */
  getWebhookListener() {
    return this.getSDK().webhook.createListener();
  }

  /**
   * Verifies an incoming Freemius webhook.
   * Uses the official SDK's built-in fetch request processor.
   */
  async processWebhookRequest(req: Request) {
    try {
      const sdk = this.getSDK();
      const listener = sdk.webhook.createListener();

      const event = await sdk.webhook.processFetch(listener, req);
      return event;
    } catch (err) {
      console.error("[FreemiusService] Webhook processing failed:", err);
      return null;
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
      const sdk = this.getSDK(productId);

      const licenses = await sdk.api.license.list({ search: licenseKey });

      const license = (licenses || []).find(
        (l: any) => l.secret_key === licenseKey
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
        plan: license.plan_id?.toString(),
        expiration: license.expiration ?? null,
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
      const sdk = this.getSDK(params.productId);

      const qs: Record<string, string> = {};
      if (params.userId) qs.user_id = params.userId;
      if (params.licenseKey) qs.license_key = params.licenseKey;

      const [subscriptions, plans] = await Promise.all([
        sdk.api.subscription.list(qs),
        sdk.api.plan.list()
      ]);

      const planMap = new Map<number, string>(
        (plans || []).map((p: any) => [p.id, p.name])
      );

      const mappedSubscriptions = (subscriptions || []).map((s: any) =>
        this.buildSubscriptionResult(s, planMap)
      );

      return { subscriptions: mappedSubscriptions, total: mappedSubscriptions.length };
    } catch (err: any) {
      console.error("[FreemiusService] getSubscriptions error:", err.message || err);
      return { subscriptions: [], total: 0 };
    }
  }

  /**
   * Fetches a single subscription by its ID.
   */
  async getSubscriptionById(
    subscriptionId: string | number,
    productId?: string
  ): Promise<SubscriptionResult | null> {
    try {
      const sdk = this.getSDK(productId);

      const [sub, plans] = await Promise.all([
        sdk.api.subscription.retrieve(subscriptionId as number),
        sdk.api.plan.list()
      ]);

      if (!sub) return null;

      const planMap = new Map<number, string>(
        (plans || []).map((p: any) => [p.id, p.name])
      );

      return this.buildSubscriptionResult(sub as any, planMap);
    } catch (err: any) {
      if (err.status === 404) return null;
      console.error("[FreemiusService] getSubscriptionById error:", err.message || err);
      return null;
    }
  }

  // ─── Payment Queries ────────────────────────────────────────────────────────────

  /**
   * Fetches payments for a given user ID, subscription ID, or product ID.
   */
  async getPayments(
    params: { userId?: string; subscriptionId?: string; productId?: string }
  ): Promise<PaymentsResult> {
    try {
      const sdk = this.getSDK(params.productId);

      const qs: Record<string, string | number> = {};
      if (params.userId) qs.user_id = params.userId;
      if (params.subscriptionId) qs.subscription_id = params.subscriptionId;

      const payments = await sdk.api.payment.list(qs);

      const mappedPayments = (payments || []).map((p: any) => this.buildPaymentResult(p));

      return { payments: mappedPayments, total: mappedPayments.length };
    } catch (err: any) {
      console.error("[FreemiusService] getPayments error:", err.message || err);
      return { payments: [], total: 0 };
    }
  }

  /**
   * Fetches a single payment by its ID.
   */
  async getPaymentById(
    paymentId: string | number,
    productId?: string
  ): Promise<PaymentResult | null> {
    try {
      const sdk = this.getSDK(productId);

      const payment = await sdk.api.payment.retrieve(paymentId as number);
      if (!payment) return null;

      return this.buildPaymentResult(payment as any);
    } catch (err: any) {
      if (err.status === 404) return null;
      console.error("[FreemiusService] getPaymentById error:", err.message || err);
      return null;
    }
  }

  /**
   * Fetches the raw PDF invoice for a given payment.
   */
  async getInvoicePdf(
    paymentId: string | number,
    productId?: string
  ): Promise<ArrayBuffer | null> {
    try {
      const sdk = this.getSDK(productId);

      // We can use the SDK's internal HTTP client to make authenticated requests naturally.
      // Although `payment.retrieve` returns JSON, we can bypass the JSON parsing for a PDF.
      const url = `/${sdk.api.payment.getBaseUrl(paymentId as number)}/invoice.pdf`;

      const res = await sdk.api.http.get(url, { __rawResponse: true } as any);

      if (!res.ok) {
        if (res.status === 404) return null;
        const body = await res.text();
        console.error("[FreemiusService] Invoice PDF API error:", res.status, body);
        return null;
      }

      return await res.arrayBuffer();
    } catch (err: any) {
      if (err.status === 404) return null;
      console.error("[FreemiusService] getInvoicePdf error:", err.message || err);
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
   * Builds a PaymentResult from a raw FreemiusPayment.
   */
  private buildPaymentResult(p: FreemiusPayment): PaymentResult {
    return {
      id: p.id,
      user_id: p.user_id,
      subscription_id: p.subscription_id,
      plan_id: p.plan_id,
      license_id: p.license_id,
      amount: p.amount,
      gross: p.gross,
      tax: p.tax,
      currency: p.currency,
      created: p.created,
      is_refunded: p.is_refunded,
    };
  }

}
