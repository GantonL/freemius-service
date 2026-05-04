import { Module } from "@danet/core";
import { ClientProvider } from "../../../src/modules/database/client.provider.ts";
import { EntitlementsService } from "../../../src/modules/database/services/entitlements.service.ts";
import { UserService } from "../../../src/modules/database/services/user.service.ts";
import { MockClientProvider } from "./mock-client-provider.ts";

@Module({
  injectables: [
    // deno-lint-ignore no-explicit-any
    { useClass: MockClientProvider, token: ClientProvider as any },
    EntitlementsService,
    UserService,
  ],
})
export class MockDatabaseModule {}
