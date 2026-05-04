import { Injectable } from "@danet/core";
import { eq, type SQL } from "drizzle-orm";
import { AbstractCrudService } from "./abstract-crud.service.ts";
import { users } from "../schema.ts";
import { ClientProvider } from "../client.provider.ts";

@Injectable()
export class UserService extends AbstractCrudService<typeof users> {
  constructor(clientProvider: ClientProvider) {
    super(clientProvider, users);
  }

  protected getFilters(filters: SQL): SQL | undefined {
    return filters;
  }

  /**
   * Get a single user by email.
   */
  async getOne(email: string) {
    return await this.findOne(eq(users.email, email));
  }
}
