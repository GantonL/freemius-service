import { AuthGuard, ExecutionContext, Injectable } from "@danet/core";
import { FreemiusService } from "../freemius/freemius.service.ts";

export const FREEMIUS_EVENT_KEY = "freemiusEvent";

@Injectable()
export class FreemiusWebhookGuard implements AuthGuard {
  constructor(private readonly service: FreemiusService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rawBody = await context.req.text();
    const signature =
      context.req.raw.headers.get("x-signature") ||
      context.req.raw.headers.get("signature");

    const event = this.service.processWebhookRequest(rawBody, signature);
    if (!event) return false;

    context.set(FREEMIUS_EVENT_KEY, event);
    return true;
  }
}
