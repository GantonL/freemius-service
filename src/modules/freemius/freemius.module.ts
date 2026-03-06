import { Module } from "@danet/core";
import { FreemiusService } from "./freemius.service.ts";

@Module({
  injectables: [FreemiusService],
  exports: [FreemiusService],
})
export class FreemiusModule {}
