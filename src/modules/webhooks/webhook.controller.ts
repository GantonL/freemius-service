import { Controller, Post, Req, Res } from "@danet/core";
import { FreemiusService } from "../freemius/freemius.service.ts";

@Controller("webhooks")
export class WebhookController {
  constructor(private readonly freemiusService: FreemiusService) {
    this.registerListeners();
  }

  private registerListeners() {
    const listener = this.freemiusService.getWebhookListener();

    listener.on("subscription.activated", async (event: any) => {
      const { subscription, user, plan } = event.objects;
      console.log(`[Webhook] ✅ Subscription activated — user: ${user?.email}, plan: ${plan?.name}, id: ${subscription?.id}`);
    });

    listener.on("subscription.cancelled", async (event: any) => {
      const { subscription, user } = event.objects;
      console.log(`[Webhook] ❌ Subscription cancelled — user: ${user?.email}, id: ${subscription?.id}`);
    });

    listener.on("subscription.expired", async (event: any) => {
      const { subscription, user } = event.objects;
      console.log(`[Webhook] ⏰ Subscription expired — user: ${user?.email}, id: ${subscription?.id}`);
    });

    listener.on("subscription.charged_successfully", async (event: any) => {
      const { subscription, user } = event.objects;
      console.log(`[Webhook] 🔄 Subscription renewed — user: ${user?.email}, id: ${subscription?.id}`);
    });

    listener.on("subscription.charged_failed", async (event: any) => {
      const { subscription, user } = event.objects;
      console.warn(`[Webhook] ⚠️  Charge failed — user: ${user?.email}, id: ${subscription?.id}`);
    });

    listener.on("license.activated", async (event: any) => {
      const { license, user } = event.objects;
      console.log(`[Webhook] 🔑 License activated — user: ${user?.email}, key: ${license?.secret_key}`);
    });

    listener.on("license.deactivated", async (event: any) => {
      const { license, user } = event.objects;
      console.log(`[Webhook] 🔒 License deactivated — user: ${user?.email}, key: ${license?.secret_key}`);
    });

    listener.on("license.expired", async (event: any) => {
      const { license, user } = event.objects;
      console.log(`[Webhook] ⌛ License expired — user: ${user?.email}, key: ${license?.secret_key}`);
    });
  }

  /**
   * POST /webhooks/freemius
   *
   * Receives Freemius webhook events. Handled and verified by `@freemius/sdk`.
   */
  @Post("freemius")
  async handleFreemiusWebhook(@Req() req: any, @Res() res: any) {
    // Determine the raw web request. Danet may pass different req objects.
    // If req is a standard Request, proxy it; if it is a deno std/http request, map it.
    const standardRequest = req instanceof Request ? req : req.request || req;

    const event = await this.freemiusService.processWebhookRequest(standardRequest);

    if (!event) {
      console.warn("[WebhookController] Invalid signature received or unmapped event.");
      res.status = 401;
      return { error: "Invalid webhook signature or unrecognized format." };
    }

    // Forward to your app (fire-and-forget)
    this.freemiusService.forwardEvent(event as any);

    return { received: true };
  }
}
