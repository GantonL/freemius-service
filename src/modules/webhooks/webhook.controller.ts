import { Controller, Post, Req, Res } from "@danet/core";
import { FreemiusService } from "../freemius/freemius.service.ts";

@Controller("webhooks")
export class WebhookController {
  constructor(private readonly service: FreemiusService) {}

  /**
   * POST /webhooks/freemius
   *
   * Receives Freemius webhook events and verifies their HMAC signature.
   */
  @Post("freemius")
  async handleFreemiusWebhook(@Req() req: any, @Res() res: any) {
    // Determine the raw web request. Danet may pass different req objects.
    const standardRequest = req instanceof Request ? req : req.request || req;

    const signature = standardRequest.headers.get("x-signature") ||
      standardRequest.headers.get("signature");
    const rawBody = await standardRequest.text();

    const event = this.service.processWebhookRequest(
      rawBody,
      signature,
    );

    if (!event) {
      console.warn(
        "[WebhookController] Invalid signature received or unmapped event.",
      );
      res.status = 401;
      return { error: "Invalid webhook signature or unrecognized format." };
    }

    // Process event types
    const { type, objects } = event;
    const { user, subscription, license, plan } = objects || {};

    if (type === "subscription.activated") {
      console.log(
        `[Webhook] ✅ Subscription activated — user: ${user?.email}, plan: ${plan?.name}, id: ${subscription?.id}`,
      );
    } else if (type === "subscription.cancelled") {
      console.log(
        `[Webhook] ❌ Subscription cancelled — user: ${user?.email}, id: ${subscription?.id}`,
      );
    } else if (type === "subscription.expired") {
      console.log(
        `[Webhook] ⏰ Subscription expired — user: ${user?.email}, id: ${subscription?.id}`,
      );
    } else if (type === "subscription.charged_successfully") {
      console.log(
        `[Webhook] 🔄 Subscription renewed — user: ${user?.email}, id: ${subscription?.id}`,
      );
    } else if (type === "subscription.charged_failed") {
      console.warn(
        `[Webhook] ⚠️  Charge failed — user: ${user?.email}, id: ${subscription?.id}`,
      );
    } else if (type === "license.activated") {
      console.log(
        `[Webhook] 🔑 License activated — user: ${user?.email}, key: ${license?.secret_key}`,
      );
    } else if (type === "license.deactivated") {
      console.log(
        `[Webhook] 🔒 License deactivated — user: ${user?.email}, key: ${license?.secret_key}`,
      );
    } else if (type === "license.expired") {
      console.log(
        `[Webhook] ⌛ License expired — user: ${user?.email}, key: ${license?.secret_key}`,
      );
    }

    // Forward to your app (fire-and-forget)
    this.service.forwardEvent(event as any);

    return { received: true };
  }
}
