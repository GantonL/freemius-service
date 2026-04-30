/**
 * Typed environment configuration.
 * Throws on startup if a required variable is missing so problems surface
 * immediately rather than at request time.
 */

function getRequiredEnvVar(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. Check your .env file.`,
    );
  }
  return value;
}

function optional(key: string, fallback = ""): string {
  return Deno.env.get(key) ?? fallback;
}

export const config = {
  port: parseInt(optional("PORT", "8000"), 10),

  freemius: {
    storeId: getRequiredEnvVar("FREEMIUS_STORE_ID"),
    productId: getRequiredEnvVar("FREEMIUS_PRODUCT_ID"),
    apiToken: getRequiredEnvVar("FREEMIUS_API_TOKEN"),
    productSecret: getRequiredEnvVar("FREEMIUS_PRODUCT_SECRET"),
    /** Base URL of the Freemius API */
    apiBase: "https://api.freemius.com/v1",
  },

  webhook: {
    /** Optional: Forward verified events to your app */
    forwardUrl: optional("WEBHOOK_FORWARD_URL"),
    forwardSecret: optional("WEBHOOK_FORWARD_SECRET"),
  },

  /** Service metadata */
  version: "1.0.0",
} as const;
