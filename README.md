# freemius-service

A standalone payments microservice built with **Deno** and **Danet**
(NestJS-like framework) that handles everything Freemius: webhook processing,
license validation, subscription lifecycle events, invoices, and checkout.

Deploy it once on Railway and reuse it across all your projects.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

---

## Features

- **License validation** — validate any Freemius license key via REST API
- **Webhook processing** — HMAC-SHA256 signature verification + event routing
- **Subscription lifecycle** — handles activated, cancelled, expired, renewed events
- **Subscription management** — list, get, and cancel subscriptions
- **Payment querying** — list payments by user or license
- **Invoice proxying** — fetch invoice PDFs from Freemius
- **Checkout** — generate checkout links and validate checkout completion (internal)
- **Event forwarding** — forward verified events to your app with a shared secret
- **DB persistence** — optional entitlements persistence via Drizzle ORM + PostgreSQL
- **Health check** — `/health` endpoint for Railway / uptime monitoring
- **Railway ready** — one-click deploy with `railway.json` + `Dockerfile`

---

## Quick Start

### Prerequisites

- [Deno 2.x](https://deno.land) installed

### Local Development

```bash
# 1. Clone and enter the directory
git clone https://github.com/GantonL/freemius-service.git
cd freemius-service

# 2. Set up environment
cp .env.example .env
# Edit .env and fill in your Freemius credentials

# 3. Start the dev server (auto-restarts on file changes)
deno task dev
```

The server starts at `http://localhost:8080`.

---

## Environment Variables

| Variable                 | Required | Description                                                   |
| ------------------------ | -------- | ------------------------------------------------------------- |
| `PORT`                   | No       | Server port (default: `8080`)                                 |
| `FREEMIUS_STORE_ID`      | Yes      | Your Freemius store ID                                        |
| `FREEMIUS_PRODUCT_ID`    | Yes      | Your Freemius product/plugin ID                               |
| `FREEMIUS_API_TOKEN`     | Yes      | Bearer token for the Freemius API                             |
| `FREEMIUS_PRODUCT_SECRET`| Yes      | HMAC secret for webhook & checkout signature verification     |
| `DATABASE_URL`           | No       | PostgreSQL connection string — enables entitlement persistence|
| `WEBHOOK_FORWARD_URL`    | No       | Your app's URL to forward verified events to                  |
| `WEBHOOK_FORWARD_SECRET` | No       | Secret included in `x-webhook-secret` header when forwarding |

---

## Extending Webhook Handlers

Open `src/modules/webhooks/webhook.controller.ts` to add your own logic inside
the handler methods — e.g., send emails, update a database, trigger n8n
workflows:

```typescript
private handleSubscriptionActivated(event: FreemiusWebhookEvent) {
  const { user, plan, subscription } = event.objects;
  // → Send welcome email, update your DB, etc.
}
```

---

## SvelteKit Integration

In your SvelteKit app, call the service for license validation:

```typescript
// src/lib/server/license.ts
const PAYMENT_SERVICE_URL = env.PAYMENT_SERVICE_URL;

export async function validateLicense(licenseKey: string) {
  const res = await fetch(
    `${PAYMENT_SERVICE_URL}/licenses/validate?key=${licenseKey}`,
  );
  return res.json() as Promise<
    { valid: boolean; plan?: string; message: string }
  >;
}
```

Protect routes using a server hook:

```typescript
// src/hooks.server.ts
import { validateLicense } from "$lib/server/license";

export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname.startsWith("/app")) {
    const key = event.cookies.get("license_key");
    const result = key ? await validateLicense(key) : { valid: false };
    if (!result.valid) {
      return redirect(302, "/pricing");
    }
  }
  return resolve(event);
};
```

To receive webhook events forwarded from this service, add a route:

```typescript
// src/routes/api/webhooks/payments/+server.ts
export const POST: RequestHandler = async ({ request }) => {
  const secret = request.headers.get("x-webhook-secret");
  if (secret !== env.WEBHOOK_FORWARD_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  const event = await request.json();
  // Handle the event — update user records, send emails, etc.
  return new Response("OK");
};
```

---

## Deployment

### Railway (Recommended)

1. Fork this repo
2. Create a new Railway project → **Deploy from GitHub repo**
3. Set all required environment variables in the Railway dashboard
4. Railway auto-detects `railway.json` and builds via `Dockerfile`

### Docker

```bash
docker build -t freemius-service .
docker run -p 8080:8080 --env-file .env freemius-service
```

---

## Project Structure

```
freemius-service/
├── src/
│   ├── main.ts                          # Entry point
│   ├── app.module.ts                    # Root module
│   ├── config.ts                        # Typed env config
│   ├── types.ts                         # Freemius TypeScript types
│   ├── guards/
│   │   └── internal-network-request.guard.ts  # Internal-only endpoint guard
│   ├── utils/
│   │   ├── http.util.ts                 # Generic fetch wrapper
│   │   └── pagination.util.ts           # Pagination helper
│   └── modules/
│       ├── freemius/
│       │   ├── freemius.endpoints.ts    # Declarative API endpoint map
│       │   ├── freemius.client.ts       # Proxy-based typed API client
│       │   └── freemius.service.ts      # Business logic
│       ├── health/
│       │   └── health.controller.ts     # GET /health
│       ├── webhooks/
│       │   ├── guards/freemius-event-webhook.guard.ts
│       │   └── webhook.controller.ts    # POST /webhooks/freemius
│       ├── licenses/
│       │   └── license.controller.ts    # GET /licenses/validate
│       ├── subscriptions/
│       │   └── subscription.controller.ts  # GET|DELETE /subscriptions[/:id]
│       ├── invoices/
│       │   └── invoice.controller.ts    # GET /invoices/:id
│       ├── checkout/
│       │   └── checkout.controller.ts   # POST /checkout/validate, GET /checkout/link
│       ├── events/
│       │   └── events.controller.ts     # GET /events/:id
│       ├── database/
│       │   ├── schema.ts                # Drizzle schema: user + user_fs_entitlements
│       │   ├── client.provider.ts       # PostgreSQL connection via Drizzle
│       │   └── services/
│       │       ├── abstract-crud.service.ts
│       │       ├── entitlements.service.ts
│       │       └── user.service.ts
│       └── cache/
│           └── cache.service.ts         # In-memory cache
├── drizzle.config.ts
├── Dockerfile
├── railway.json
├── deno.json
└── .env.example
```

---

## License

MIT
