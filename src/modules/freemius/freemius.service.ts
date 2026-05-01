import { Injectable } from "@danet/core";
import { config } from "../../config.ts";
import type {
  FreemiusPayment,
  FreemiusSubscription,
  FreemiusWebhookEvent,
  LicenseValidationResult,
  PaymentResult,
  PaymentsResult,
  SubscriptionResult,
  SubscriptionsResult,
  SubscriptionStatus,
} from "../../types.ts";
import { FreemiusClient, type FreemiusClientInterface } from "./freemius.client.ts";
import { HttpClient } from "../../utils/http.util.ts";

/**
 * Core Freemius service.
 * Delegates all API communication to the FreemiusClient, which provides
 * strongly-typed methods generated from `freemius.endpoints.ts`.
 * This service is intentionally unaware of URL construction.
 */
@Injectable()
export class FreemiusService {
  private readonly client: FreemiusClientInterface;

  constructor(client: FreemiusClient, private readonly http: HttpClient) {
    // Cast to the full interface that includes Proxy-generated endpoint methods.
    this.client = client as FreemiusClientInterface;
  }

  /**
   * Resolves the product ID to use (from argument or environment fallback).
   */
  private getProductId(productId?: string): string {
    return productId || config.freemius.productId;
  }

  // ─── Webhook Verification ────────────────────────────────────────────────────

  /**
   * Verifies an incoming Freemius webhook signature and returns the parsed event.
   */
  processWebhookRequest(
    rawBody: string,
    signatureHeader: string | null,
  ): FreemiusWebhookEvent | null {
    return this.client.verifyWebhookSignature(rawBody, signatureHeader);
  }

  // ─── License Validation ──────────────────────────────────────────────────────

  /**
   * Validates a license key against the Freemius API.
   */
  async validateLicense(
    licenseKey: string,
    productId?: string,
  ): Promise<LicenseValidationResult> {
    try {
      const pId = this.getProductId(productId);

      const response = await this.client.getLicenses({
        productId: pId,
        search: licenseKey,
      }) as { licenses?: any[] };

      const licenses = response.licenses || [];
      const license = licenses.find((l: any) => l.secret_key === licenseKey);

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
    } catch (err: any) {
      console.error("[FreemiusService] validateLicense error:", err.message || err);
      return { valid: false, message: "An error occurred while validating the license." };
    }
  }

  // ─── Subscription Queries ────────────────────────────────────────────────────

  async getSubscriptions(
    params: { userId?: string; licenseKey?: string; productId?: string },
  ): Promise<SubscriptionsResult> {
    try {
      const pId = this.getProductId(params.productId);

      const [subRes, plansRes] = await Promise.all([
        this.client.getSubscriptions({
          productId: pId,
          ...(params.userId && { user_id: params.userId }),
          ...(params.licenseKey && { license_key: params.licenseKey }),
        }) as Promise<{ subscriptions?: any[] }>,
        this.client.getPlans({ productId: pId }) as Promise<{ plans?: any[] }>,
      ]);

      const planMap = new Map<number, string>(
        (plansRes.plans || []).map((p: any) => [p.id, p.name]),
      );

      const mappedSubscriptions = (subRes.subscriptions || []).map((s: any) =>
        this.buildSubscriptionResult(s, planMap)
      );

      return { subscriptions: mappedSubscriptions, total: mappedSubscriptions.length };
    } catch (err: any) {
      console.error("[FreemiusService] getSubscriptions error:", err.message || err);
      return { subscriptions: [], total: 0 };
    }
  }

  async getSubscriptionById(
    subscriptionId: string | number,
    productId?: string,
  ): Promise<SubscriptionResult | null> {
    try {
      const pId = this.getProductId(productId);

      const [subRes, plansRes] = await Promise.all([
        this.client.getSubscription({
          productId: pId,
          subscriptionId,
        }) as Promise<any>,
        this.client.getPlans({ productId: pId }) as Promise<{ plans?: any[] }>,
      ]);

      if (!subRes) return null;

      const planMap = new Map<number, string>(
        (plansRes.plans || []).map((p: any) => [p.id, p.name]),
      );

      return this.buildSubscriptionResult(subRes, planMap);
    } catch (err: any) {
      if (err.status === 404) return null;
      console.error("[FreemiusService] getSubscriptionById error:", err.message || err);
      return null;
    }
  }

  // ─── Payment Queries ─────────────────────────────────────────────────────────

  async getPayments(
    params: { userId?: string; subscriptionId?: string; productId?: string },
  ): Promise<PaymentsResult> {
    try {
      const pId = this.getProductId(params.productId);

      const res = await this.client.getPayments({
        productId: pId,
        ...(params.userId && { user_id: params.userId }),
        ...(params.subscriptionId && { subscription_id: params.subscriptionId }),
      }) as { payments?: any[] };

      const mappedPayments = (res.payments || []).map((p: any) =>
        this.buildPaymentResult(p)
      );

      return { payments: mappedPayments, total: mappedPayments.length };
    } catch (err: any) {
      console.error("[FreemiusService] getPayments error:", err.message || err);
      return { payments: [], total: 0 };
    }
  }

  async getPaymentById(
    paymentId: string | number,
    productId?: string,
  ): Promise<PaymentResult | null> {
    try {
      const pId = this.getProductId(productId);

      const payment = await this.client.getPayment({
        productId: pId,
        paymentId,
      }) as any;

      if (!payment) return null;
      return this.buildPaymentResult(payment);
    } catch (err: any) {
      if (err.status === 404) return null;
      console.error("[FreemiusService] getPaymentById error:", err.message || err);
      return null;
    }
  }

  async getInvoicePdf(
    paymentId: string | number,
    productId?: string,
  ): Promise<ArrayBuffer | null> {
    try {
      const pId = this.getProductId(productId);

      return await this.client.getInvoicePdf({
        productId: pId,
        paymentId,
      }) as ArrayBuffer;
    } catch (err: any) {
      if (err.status === 404) return null;
      console.error("[FreemiusService] getInvoicePdf error:", err.message || err);
      return null;
    }
  }

  // ─── Webhook Forwarding ───────────────────────────────────────────────────────

  async forwardEvent(event: FreemiusWebhookEvent): Promise<void> {
    const { forwardUrl, forwardSecret } = config.webhook;
    if (!forwardUrl) return;

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };

      if (forwardSecret) {
        headers["x-webhook-secret"] = forwardSecret;
      }

      await this.http.post(forwardUrl, {
        headers,
        body: JSON.stringify(event),
      });
    } catch (err: any) {
      console.warn(
        `[FreemiusService] Forward to ${forwardUrl} failed:`,
        err.status || err.message || err,
      );
    }
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private deriveStatus(sub: FreemiusSubscription): SubscriptionStatus {
    if (sub.is_cancelled) return "cancelled";
    if (sub.billing_cycle !== 0 && sub.next_payment) {
      const next = new Date(sub.next_payment);
      if (next < new Date()) return "past_due";
    }
    return "active";
  }

  private buildSubscriptionResult(
    s: FreemiusSubscription,
    planMap: Map<number, string>,
  ): SubscriptionResult {
    const cycleLabel = s.billing_cycle === 0
      ? "lifetime"
      : s.billing_cycle === 1
      ? "monthly"
      : s.billing_cycle === 12
      ? "annual"
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
