import { Module } from "@danet/core";
import { FreemiusModule } from "../freemius/freemius.module.ts";
import { CheckoutController } from "./checkout.controller.ts";

@Module({
  imports: [FreemiusModule],
  controllers: [CheckoutController],
})
export class CheckoutModule {}
