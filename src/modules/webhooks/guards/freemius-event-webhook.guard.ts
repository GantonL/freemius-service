import { AuthGuard, ExecutionContext, Injectable } from "@danet/core";
import { FreemiusService } from "../../freemius/freemius.service.ts";
import { UserService } from "../../database/services/user.service.ts";
import { FreemiusWebhookEvent } from "../../../types.ts";
export const WEBHOOK_USER_ID_KEY = "webhookUserId";
export const FREEMIUS_EVENT_KEY = "freemiusEvent";

@Injectable()
export class FreemiusEventWebhookGuard implements AuthGuard {
  constructor(
    private readonly service: FreemiusService,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const canProcess = await this.canProcess(context);
    const eventBelongsToUser = await this.eventBelongsToUser(context);
    return canProcess && eventBelongsToUser;
  }

  private async canProcess(context: ExecutionContext): Promise<boolean> {
    const rawBody = await context.req.text();
    const signature = context.req.raw.headers.get("x-signature");

    const event = this.service.processWebhookRequest(rawBody, signature);
    if (!event) return false;

    context.set(FREEMIUS_EVENT_KEY, event);
    return true;
  }

  private async eventBelongsToUser(
    context: ExecutionContext,
  ): Promise<boolean> {
    const event = context.get(FREEMIUS_EVENT_KEY) as FreemiusWebhookEvent;
    if (!event || !event.objects?.user?.email) {
      return false;
    }

    const email = event.objects.user.email;
    const user = await this.userService.getOne(email);

    if (!user) {
      console.warn(
        `[Guard] ❌ Unauthorized webhook: User with email ${email} not found in database.`,
      );
      return false;
    }

    context.set(WEBHOOK_USER_ID_KEY, user.id);
    return true;
  }
}
