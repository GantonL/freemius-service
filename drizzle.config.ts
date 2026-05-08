import { defineConfig } from "drizzle-kit";

const basePath = "./src/modules/database";

export default defineConfig({
  out: `${basePath}/migrations`,
  schema: `${basePath}/schema.ts`,
  dialect: "postgresql",
  dbCredentials: {
    url: Deno.env.get("DATABASE_URL")!,
  },
});
