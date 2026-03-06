# freemius-service

A standalone payments microservice built with **Deno** and **Danet**
(NestJS-like framework) that handles everything Freemius: webhook processing,
license validation, and subscription lifecycle events.

Deploy it once on Railway and reuse it across all your projects.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

---

## Features

- ✅ **License validation** — validate any Freemius license key via REST API
- ✅ **Webhook processing** — HMAC-SHA256 signature verification + event routing
- ✅ **Subscription lifecycle** — handles activated, cancelled, expired, renewed
  events
- ✅ **Event forwarding** — optionally forward verified events to your app
- ✅ **Health check** — `/health` endpoint for Railway / uptime monitoring
- ✅ **Railway ready** — one-click deploy with `railway.json` + `Dockerfile`
- ✅ **Stateless** — no database required, easy to scale

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

The server starts at `http://localhost:8000`.

---

## Environment Variables

| Variable                  | Required | Description                                                  |
| ------------------------- | -------- | ------------------------------------------------------------ |
| `PORT`                    | No       | Server port (default: `8000`)                                |
| `FREEMIUS_STORE_ID`       | Yes      | Your Freemius product/plugin ID                              |
| `FREEMIUS_PUBLIC_KEY`     | Yes      | Freemius public key (Developer Dashboard → Keys)             |
| `FREEMIUS_SECRET_KEY`     | Yes      | Freemius secret key                                          |
| `FREEMIUS_WEBHOOK_SECRET` | Yes      | Webhook signing secret (Dashboard → Developer → Webhooks)    |
| `WEBHOOK_FORWARD_URL`     | No       | Your app's URL to forward verified events to                 |
| `WEBHOOK_FORWARD_SECRET`  | No       | Secret included in `x-webhook-secret` header when forwarding |

---

## API Reference

### `GET /health`

Returns service status.

```json
{
  "status": "ok",
  "timestamp": "2026-02-27T14:00:00.000Z",
  "version": "1.0.0",
  "service": "freemius-service"
}
```

---

### `GET /licenses/validate`

Validates a Freemius license key.

**Query params:**

- `key` (required) — the license secret key
- `product_id` (optional) — Freemius plugin ID, falls back to
  `FREEMIUS_STORE_ID`

**Example:**

```bash
curl "https://your-service.railway.app/licenses/validate?key=YOUR_LICENSE_KEY"
```

**Response (valid):**

```json
{
  "valid": true,
  "plan": "5",
  "expiration": "2027-02-27T00:00:00Z",
  "quota": 5,
  "activated": 1,
  "message": "License is valid."
}
```

**Response (invalid):**

```json
{
  "valid": false,
  "message": "License has expired."
}
```

---

### `POST /webhooks/freemius`

Receives Freemius webhook events. Must include the `X-Freemius-Signature`
header.

Point this URL in your Freemius Developer Dashboard under **Developer →
Webhooks**.

**Handled event types:**

| Event                               | Description                    |
| ----------------------------------- | ------------------------------ |
| `subscription.activated`            | New subscription created       |
| `subscription.cancelled`            | Subscription cancelled by user |
| `subscription.expired`              | Subscription period ended      |
| `subscription.charged_successfully` | Renewal payment succeeded      |
| `subscription.charged_failed`       | Renewal payment failed         |
| `license.activated`                 | License activated on a site    |
| `license.deactivated`               | License deactivated            |
| `license.expired`                   | License expired                |

---

### `GET /subscriptions`

Fetches all subscriptions for a given user or license key. Enriches each result
with a computed `status` field and a human-readable `billing_cycle_label`.

**Query params (at least one required):**

- `user_id` — Freemius user ID
- `license_key` — license secret key
- `product_id` (optional) — falls back to `FREEMIUS_STORE_ID`

**Example:**

```bash
curl "https://your-service.railway.app/subscriptions?user_id=12345"
# or
curl "https://your-service.railway.app/subscriptions?license_key=YOUR_LICENSE_KEY"
```

**Response:**

```json
{
  "subscriptions": [
    {
      "id": 9876,
      "plan_id": 5,
      "plan_name": "Business",
      "license_id": 1234,
      "billing_cycle": 12,
      "billing_cycle_label": "annual",
      "amount_per_cycle": 99.00,
      "currency": "USD",
      "status": "active",
      "is_cancelled": false,
      "next_payment": "2027-03-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

**Possible `status` values:** `active` | `cancelled` | `past_due` | `expired` |
`trialing` | `unknown`

---

### `GET /subscriptions/:id`

Fetches a single subscription by its Freemius subscription ID.

**Path params:**

- `:id` — the Freemius subscription ID

**Query params:**

- `product_id` (optional) — falls back to `FREEMIUS_STORE_ID`

**Example:**

```bash
curl "https://your-service.railway.app/subscriptions/9876"
```

**Response:** same shape as a single item from the list above, or `404` if not
found.

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
docker run -p 8000:8000 --env-file .env freemius-service
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
│   └── modules/
│       ├── freemius/
│       │   ├── freemius.service.ts      # API client + HMAC verification
│       │   └── freemius.module.ts
│       ├── health/
│       │   ├── health.controller.ts     # GET /health
│       │   └── health.module.ts
│       ├── webhooks/
│       │   ├── webhook.controller.ts    # POST /webhooks/freemius
│       │   └── webhook.module.ts
│       ├── licenses/
│       │   ├── license.controller.ts   # GET /licenses/validate
│       │   └── license.module.ts
│       └── subscriptions/
│           ├── subscription.controller.ts  # GET /subscriptions, GET /subscriptions/:id
│           └── subscription.module.ts
├── Dockerfile
├── railway.json
├── deno.json
└── .env.example
```

---

## License

MIT
