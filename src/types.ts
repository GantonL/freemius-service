// ─── Freemius API Entities ────────────────────────────────────────────────────

export interface FreemiusLicense {
  id: number;
  plugin_id: number;
  user_id: number;
  plan_id: number;
  quota: number; // number of activations allowed
  activated: number; // number of activations used
  activated_local: number;
  expiration: string | null; // ISO 8601 or null for lifetime
  is_cancelled: boolean;
  is_whitelabeled: boolean;
  secret_key: string;
}

export interface FreemiusUser {
  id: number;
  email: string;
  first: string;
  last: string;
  is_verified: boolean;
}

export interface FreemiusPlan {
  id: number;
  plugin_id: number;
  name: string;
  title: string;
  is_free_localhost: boolean;
  is_block_features: boolean;
  license_type: number; // -1 = unlimited sites, 1 = 1 site, etc.
  trial_period: number;
  is_require_subscription: boolean;
}

export interface FreemiusSubscription {
  id: number;
  plugin_id: number;
  plan_id: number;
  user_id: number;
  license_id: number;
  billing_cycle: number; // 1=monthly, 12=annual, 0=lifetime
  amount_per_cycle: number;
  currency: string;
  is_cancelled: boolean;
  next_payment: string | null; // ISO 8601
}

// ─── Webhook ──────────────────────────────────────────────────────────────────

export type FreemiusWebhookType =
  | "install.installed"
  | "install.updated"
  | "install.activated"
  | "install.deactivated"
  | "install.uninstalled"
  | "subscription.created"
  | "subscription.activated"
  | "subscription.cancelled"
  | "subscription.expired"
  | "subscription.charged_successfully"
  | "subscription.charged_failed"
  | "license.activated"
  | "license.deactivated"
  | "license.expired"
  | "user.updated"
  | (string & Record<never, never>); // allow unknown types

export interface FreemiusWebhookEvent {
  /** The event type, e.g. "subscription.activated" */
  type: FreemiusWebhookType;
  /** Plugin / product ID */
  plugin_id: number;
  /** Timestamp of the event */
  timestamp: number;
  /** Event-specific objects */
  objects: {
    plugin?: { id: number; slug: string };
    user?: FreemiusUser;
    install?: Record<string, unknown>;
    subscription?: FreemiusSubscription;
    license?: FreemiusLicense;
    plan?: FreemiusPlan;
  };
  /** Raw signature header value for verification */
  signature?: string;
}

// ─── Service response types ───────────────────────────────────────────────────

export interface LicenseValidationResult {
  valid: boolean;
  plan?: string;
  expiration?: string | null;
  quota?: number;
  activated?: number;
  message: string;
}

export type SubscriptionStatus =
  | "active"
  | "cancelled"
  | "expired"
  | "past_due"
  | "trialing"
  | "unknown";

export interface SubscriptionResult {
  id: number;
  plan_id: number;
  plan_name?: string;
  license_id: number;
  billing_cycle: number;   // 1=monthly, 12=annual, 0=lifetime
  billing_cycle_label: "monthly" | "annual" | "lifetime" | string;
  amount_per_cycle: number;
  currency: string;
  status: SubscriptionStatus;
  is_cancelled: boolean;
  next_payment: string | null;
  user?: FreemiusUser;
}

export interface SubscriptionsResult {
  subscriptions: SubscriptionResult[];
  total: number;
}
