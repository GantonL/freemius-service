import { Injectable } from "@danet/core";
import { eq, type SQL } from "drizzle-orm";
import { AbstractCrudService } from "./abstract-crud.service.ts";
import { users } from "../schema.ts";
import { ClientProvider } from "../client.provider.ts";
import { CacheService } from "../../cache/cache.service.ts";

@Injectable()
export class UserService extends AbstractCrudService<typeof users> {
  constructor(
    clientProvider: ClientProvider,
    private readonly cache: CacheService,
  ) {
    super(clientProvider, users);
  }

  protected getFilters(filters: SQL): SQL | undefined {
    return filters;
  }

  async getOne(email: string) {
    const key = `user:email:${email}`;
    const cached = this.cache.get<typeof users.$inferSelect>(key);
    if (cached !== undefined) return cached;

    const user = await this.findOne(eq(users.email, email));
    if (user !== null) this.cache.set(key, user);
    return user;
  }
}
