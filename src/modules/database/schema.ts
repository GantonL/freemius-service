import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("user", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).unique().notNull(),
});

export const userFsEntitlements = pgTable("user_fs_entitlements", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id),
  fsLicenseId: varchar("fs_license_id", { length: 255 }).unique().notNull(),
  fsPlanId: varchar("fs_plan_id", { length: 255 }).notNull(),
  fsPricingId: varchar("fs_pricing_id", { length: 255 }),
  fsUserId: varchar("fs_user_id", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }), // e.g., subscription, lifetime
  expiration: timestamp("expiration"),
  isCanceled: boolean("is_canceled").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type UserFsEntitlement = typeof userFsEntitlements.$inferSelect;
export type NewUserFsEntitlement = typeof userFsEntitlements.$inferInsert;
