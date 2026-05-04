import { Module } from "@danet/core";
import { CacheService } from "./cache.service.ts";

@Module({
  injectables: [CacheService],
})
export class CacheModule {}
