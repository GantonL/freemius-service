import { Module } from "@danet/core";
import { FreemiusService } from "./freemius.service.ts";
import { FreemiusClient } from "./freemius.client.ts";
import { HttpClient } from "../../utils/http.util.ts";

@Module({
  injectables: [HttpClient, FreemiusClient, FreemiusService],
})
export class FreemiusModule {}
