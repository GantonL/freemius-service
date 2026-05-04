import { AuthGuard, ExecutionContext, Injectable, UnauthorizedException } from "@danet/core";
import { UserService } from "../../database/services/user.service.ts";
import { FREEMIUS_EVENT_KEY } from "./freemius-webhook.guard.ts";
import type { FreemiusWebhookEvent } from "../../../types.ts";

export const WEBHOOK_USER_ID_KEY = "webhookUserId";

@Injectable()
export class WebhookUserGuard implements AuthGuard {
  constructor(private readonly userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const event = context.get(FREEMIUS_EVENT_KEY) as FreemiusWebhookEvent;
    if (!event || !event.objects?.user?.email) {
      throw new UnauthorizedException();
    }

    const email = event.objects.user.email;
    const user = await this.userService.getOne(email);

    if (!user) {
      console.warn(`[Guard] ❌ Unauthorized webhook: User with email ${email} not found in database.`);
      throw new UnauthorizedException();
    }

    context.set(WEBHOOK_USER_ID_KEY, user.id);
    return true;
  }
}
