import { Module } from "@danet/core";
import { HealthController } from "./health.controller.ts";

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
