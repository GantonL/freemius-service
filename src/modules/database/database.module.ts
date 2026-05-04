import { Module } from "@danet/core";
import { ClientProvider } from "./client.provider.ts";
import { EntitlementsService } from "./services/entitlements.service.ts";
import { UserService } from "./services/user.service.ts";

@Module({
  injectables: [
    ClientProvider,
    EntitlementsService,
    UserService,
  ]
})
export class DatabaseModule {}
