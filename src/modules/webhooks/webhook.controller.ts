import { Controller, Post, Req, Res } from "@danet/core";
import type { Request, Response } from "@danet/core";
import { FreemiusService } from "../freemius/freemius.service.ts";
import type { FreemiusWebhookEvent } from "../../types.ts";

@Controller("webhooks")
export class WebhookController {
  constructor(private readonly freemiusService: FreemiusService) {}

  /**
   * POST /webhooks/freemius
   *
   * Receives Freemius webhook events. Verifies the HMAC-SHA256 signature
   * before processing. Forwards verified events to your app if configured.
   *
   * Freemius includes the signature in the `X-Freemius-Signature` header.
   */
  @Post("freemius")
  async handleFreemiusWebhook(@Req() req: Request, @Res() res: Response) {
    const rawBody = await req.text();
    const signature = req.headers.get("X-Freemius-Signature") ?? "";

    if (!signature) {
      res.status = 401;
      return { error: "Missing webhook signature." };
    }

    const isValid = await this.freemiusService.verifyWebhookSignature(
      rawBody,
      signature
    );

    if (!isValid) {
      console.warn("[WebhookController] Invalid signature received.");
      res.status = 401;
      return { error: "Invalid webhook signature." };
    }

    let event: FreemiusWebhookEvent;
    try {
      event = JSON.parse(rawBody) as FreemiusWebhookEvent;
    } catch {
      res.status = 400;
      return { error: "Invalid JSON body." };
    }

    console.log(`[WebhookController] Received event: ${event.type}`);

    // Route to specific handlers
    switch (event.type) {
      case "subscription.activated":
        this.handleSubscriptionActivated(event);
        break;
      case "subscription.cancelled":
        this.handleSubscriptionCancelled(event);
        break;
      case "subscription.expired":
        this.handleSubscriptionExpired(event);
        break;
      case "subscription.charged_successfully":
        this.handleSubscriptionRenewed(event);
        break;
      case "subscription.charged_failed":
        this.handleSubscriptionChargeFailed(event);
        break;
      case "license.activated":
        this.handleLicenseActivated(event);
        break;
      case "license.deactivated":
        this.handleLicenseDeactivated(event);
        break;
      case "license.expired":
        this.handleLicenseExpired(event);
        break;
      default:
        console.log(`[WebhookController] Unhandled event type: ${event.type}`);
    }

    // Forward to your app (fire-and-forget)
    this.freemiusService.forwardEvent(event);

    return { received: true };
  }

  // ─── Event Handlers ─────────────────────────────────────────────────────────
  // Extend these to persist state, send emails, update your DB, etc.

  private handleSubscriptionActivated(event: FreemiusWebhookEvent) {
    const { subscription, user, plan } = event.objects;
    console.log(
      `[Webhook] ✅ Subscription activated — user: ${user?.email}, plan: ${plan?.name}, id: ${subscription?.id}`
    );
  }

  private handleSubscriptionCancelled(event: FreemiusWebhookEvent) {
    const { subscription, user } = event.objects;
    console.log(
      `[Webhook] ❌ Subscription cancelled — user: ${user?.email}, id: ${subscription?.id}`
    );
  }

  private handleSubscriptionExpired(event: FreemiusWebhookEvent) {
    const { subscription, user } = event.objects;
    console.log(
      `[Webhook] ⏰ Subscription expired — user: ${user?.email}, id: ${subscription?.id}`
    );
  }

  private handleSubscriptionRenewed(event: FreemiusWebhookEvent) {
    const { subscription, user } = event.objects;
    console.log(
      `[Webhook] 🔄 Subscription renewed — user: ${user?.email}, id: ${subscription?.id}`
    );
  }

  private handleSubscriptionChargeFailed(event: FreemiusWebhookEvent) {
    const { subscription, user } = event.objects;
    console.warn(
      `[Webhook] ⚠️  Charge failed — user: ${user?.email}, id: ${subscription?.id}`
    );
  }

  private handleLicenseActivated(event: FreemiusWebhookEvent) {
    const { license, user } = event.objects;
    console.log(
      `[Webhook] 🔑 License activated — user: ${user?.email}, key: ${license?.secret_key}`
    );
  }

  private handleLicenseDeactivated(event: FreemiusWebhookEvent) {
    const { license, user } = event.objects;
    console.log(
      `[Webhook] 🔒 License deactivated — user: ${user?.email}, key: ${license?.secret_key}`
    );
  }

  private handleLicenseExpired(event: FreemiusWebhookEvent) {
    const { license, user } = event.objects;
    console.log(
      `[Webhook] ⌛ License expired — user: ${user?.email}, key: ${license?.secret_key}`
    );
  }
}
