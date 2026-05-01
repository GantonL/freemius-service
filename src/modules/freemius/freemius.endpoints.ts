/**
 * Freemius API endpoint configuration.
 *
 * Each entry describes a named client method.
 * - `method`: HTTP method to use.
 * - `path`: URL path template. Parameters prefixed with `:` (e.g. `:productId`)
 *   will be extracted from the arguments object and interpolated into the URL.
 *   Any remaining arguments are appended as query-string parameters.
 * - `responseType` (optional): Set to `"arrayBuffer"` for binary responses (e.g. PDFs).
 *
 * To expose a new Freemius API resource, simply add a new entry here.
 * The FreemiusClient will automatically generate a strongly-typed method for it.
 */

export const freemiusEndpoints = {
  // ─── Licenses ──────────────────────────────────────────────────────────────
  getLicenses: {
    method: "GET",
    path: "/products/:productId/licenses.json",
  },

  // ─── Plans ─────────────────────────────────────────────────────────────────
  getPlans: {
    method: "GET",
    path: "/products/:productId/plans.json",
  },

  // ─── Subscriptions ─────────────────────────────────────────────────────────
  getSubscriptions: {
    method: "GET",
    path: "/products/:productId/subscriptions.json",
  },
  getSubscription: {
    method: "GET",
    path: "/products/:productId/subscriptions/:subscriptionId.json",
  },

  // ─── Payments ──────────────────────────────────────────────────────────────
  getPayments: {
    method: "GET",
    path: "/products/:productId/payments.json",
  },
  getPayment: {
    method: "GET",
    path: "/products/:productId/payments/:paymentId.json",
  },
  getInvoicePdf: {
    method: "GET",
    path: "/products/:productId/payments/:paymentId/invoice.pdf",
    responseType: "arrayBuffer" as const,
  },
} as const satisfies Record<string, EndpointConfig>;

// ─── Supporting types ─────────────────────────────────────────────────────────

export interface EndpointConfig {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  responseType?: "json" | "arrayBuffer";
}

/**
 * Extracts the parameter names declared in a path template.
 * E.g. `/products/:productId/subscriptions/:subscriptionId.json`
 *   → `"productId" | "subscriptionId"`
 */
type ExtractPathParams<P extends string> =
  P extends `${infer _Before}:${infer Param}/${infer Rest}`
    ? Param | ExtractPathParams<`/${Rest}`>
    : P extends `${infer _Before}:${infer Param}`
    ? // Strip trailing file extension from the last segment (e.g. `.json`, `.pdf`)
      Param extends `${infer Clean}.${infer _Ext}`
      ? Clean
      : Param
    : never;

/**
 * The argument object expected by each generated client method.
 * Path parameters are required; any additional key becomes a query-string param.
 */
export type EndpointArgs<P extends string> = {
  [K in ExtractPathParams<P>]: string | number;
} & Record<string, string | number | undefined>;

/**
 * The return type for a single endpoint, based on its `responseType`.
 */
export type EndpointReturn<C extends EndpointConfig> =
  C["responseType"] extends "arrayBuffer" ? ArrayBuffer : unknown;

/**
 * A mapped type that turns the endpoint config map into a set of async methods
 * with typed arguments and return types.
 */
export type FreemiusClientMethods<
  E extends Record<string, EndpointConfig>,
> = {
  [K in keyof E]: (
    args?: EndpointArgs<E[K]["path"]>,
  ) => Promise<EndpointReturn<E[K]>>;
};
