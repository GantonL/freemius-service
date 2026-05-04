import { Injectable } from "@danet/core";
import { OnAppClose } from "@danet/core/hook";
import { drizzle as drizzlePg, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

@Injectable()
export class ClientProvider implements OnAppClose {
  public readonly client: PostgresJsDatabase<typeof schema>;
  private postgresClient: ReturnType<typeof postgres>;

  constructor() {
    const url = Deno.env.get("DATABASE_URL");
    if (!url) throw new Error("DATABASE_URL is required");
    this.postgresClient = postgres(url);
    this.client = drizzlePg(this.postgresClient, { schema });
  }

  async onAppClose() {
    await this.postgresClient.end();
  }
}
