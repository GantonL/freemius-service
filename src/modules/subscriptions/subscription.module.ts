import { Module } from "@danet/core";
import { FreemiusModule } from "../freemius/freemius.module.ts";
import { SubscriptionController } from "./subscription.controller.ts";

@Module({
  imports: [FreemiusModule],
  controllers: [SubscriptionController],
})
export class SubscriptionModule {}
