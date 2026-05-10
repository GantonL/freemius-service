export function createApi(baseUrl: string) {
  return {
    health: {
      check: async () => {
        const res = await fetch(`${baseUrl}/health`);
        return { status: res.status, body: await res.json() };
      },
    },
    licenses: {
      validate: async (key: string, productId?: string) => {
        const url = new URL(`${baseUrl}/licenses/validate`);
        url.searchParams.set("license_id", key);
        if (productId) url.searchParams.set("product_id", productId);
        const res = await fetch(url);
        return { status: res.status, body: await res.json() };
      },
    },
    subscriptions: {
      list: async (params: { user_email?: string; license_key?: string; product_id?: string }) => {
        const url = new URL(`${baseUrl}/subscriptions`);
        if (params.user_email) url.searchParams.set("user_email", params.user_email);
        if (params.license_key) url.searchParams.set("license_key", params.license_key);
        if (params.product_id) url.searchParams.set("product_id", params.product_id);
        const res = await fetch(url);
        return { status: res.status, body: await res.json() };
      },
      get: async (id: string, productId?: string) => {
        const url = new URL(`${baseUrl}/subscriptions/${id}`);
        if (productId) url.searchParams.set("product_id", productId);
        const res = await fetch(url);
        return { status: res.status, body: await res.json() };
      },
    },
    invoices: {
      list: async (params: { user_id?: string; subscription_id?: string }) => {
        const url = new URL(`${baseUrl}/invoices`);
        if (params.user_id) url.searchParams.set("user_id", params.user_id);
        if (params.subscription_id) url.searchParams.set("subscription_id", params.subscription_id);
        const res = await fetch(url);
        return { status: res.status, body: await res.json() };
      },
      get: async (id: string) => {
        const res = await fetch(`${baseUrl}/invoices/${id}`);
        return { status: res.status, body: await res.json() };
      },
      getPdf: async (id: string) => {
        const res = await fetch(`${baseUrl}/invoices/${id}/pdf`);
        if (res.status === 200) {
          return { status: res.status, body: await res.arrayBuffer(), headers: res.headers };
        }
        return { status: res.status, body: await res.json() };
      },
    },
    webhooks: {
      sendFreemius: async (payload: Record<string, unknown>, signature?: string) => {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (signature) headers["x-signature"] = signature;
        const res = await fetch(`${baseUrl}/webhooks/freemius`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        return { status: res.status, body: await res.json() };
      },
    },
    events: {
      get: async (id: string, productId?: string) => {
        const url = new URL(`${baseUrl}/events/${id}`);
        if (productId) url.searchParams.set("product_id", productId);
        const res = await fetch(url);
        return { status: res.status, body: await res.json() };
      },
    },
  };
}
