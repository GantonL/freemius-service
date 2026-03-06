import { Module } from "@danet/core";
import { FreemiusModule } from "../freemius/freemius.module.ts";
import { LicenseController } from "./license.controller.ts";

@Module({
  imports: [FreemiusModule],
  controllers: [LicenseController],
})
export class LicenseModule {}
