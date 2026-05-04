import { Module } from "@danet/core";
import { CacheModule } from "../cache/cache.module.ts";
import { ClientProvider } from "./client.provider.ts";
import { EntitlementsService } from "./services/entitlements.service.ts";
import { UserService } from "./services/user.service.ts";

@Module({
  imports: [CacheModule],
  injectables: [
    ClientProvider,
    EntitlementsService,
    UserService,
  ],
})
export class DatabaseModule {}
