import { Module } from "@danet/core";
import { FreemiusService } from "./freemius.service.ts";
import { FreemiusClient } from "./freemius.client.ts";
import { HttpClient } from "../../utils/http.util.ts";
import { CacheModule } from "../cache/cache.module.ts";

@Module({
  imports: [CacheModule],
  injectables: [HttpClient, FreemiusClient, FreemiusService],
})
export class FreemiusModule {}
