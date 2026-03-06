import { Controller, Get } from "@danet/core";
import { config } from "../../config.ts";

@Controller("health")
export class HealthController {
  @Get("")
  getHealth() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: config.version,
      service: "freemius-service",
    };
  }
}
