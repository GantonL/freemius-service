import { Injectable } from "@danet/core";
import { eq, and, type SQL } from "drizzle-orm";
import { AbstractCrudService } from "./abstract-crud.service.ts";
import { userFsEntitlements, type NewUserFsEntitlement } from "../schema.ts";
import type { FreemiusLicense } from "../../../types.ts";
import { ClientProvider } from "../client.provider.ts";

@Injectable()
export class EntitlementsService extends AbstractCrudService<typeof userFsEntitlements> {
  constructor(clientProvider: ClientProvider) {
    super(clientProvider, userFsEntitlements);
  }

  protected getFilters(filters: SQL): SQL | undefined {
    return filters;
  }

  /**
   * Maps a Freemius license to a new entitlement record for creation.
   */
  private mapLicenseToCreate(userId: number, license: FreemiusLicense): NewUserFsEntitlement {
    return {
      userId: userId,
      fsLicenseId: String(license.id),
      fsPlanId: String(license.plan_id),
      fsPricingId: license.pricing_id ? String(license.pricing_id) : null,
      fsUserId: String(license.user_id),
      type: license.type || null,
      expiration: license.expiration ? new Date(license.expiration) : null,
      isCanceled: license.is_cancelled,
    };
  }

  /**
   * Maps a Freemius license to a partial record for updating existing entitlements.
   * Excludes immutable fields like userId and fsLicenseId.
   */
  private mapLicenseToUpdate(license: FreemiusLicense): Partial<NewUserFsEntitlement> {
    return {
      fsPlanId: String(license.plan_id),
      fsPricingId: license.pricing_id ? String(license.pricing_id) : null,
      fsUserId: String(license.user_id),
      type: license.type || null,
      expiration: license.expiration ? new Date(license.expiration) : null,
      isCanceled: license.is_cancelled,
    };
  }

  /**
   * Create a new entitlement from a Freemius license for a specific user.
   */
  async createEntitlement(userId: number, license: FreemiusLicense) {
    const data = this.mapLicenseToCreate(userId, license);
    return await this.create(data);
  }

  /**
   * Update an entitlement for a specific user and license.
   */
  async updateEntitlement(userId: number, license: FreemiusLicense) {
    const data = this.mapLicenseToUpdate(license);
    return await this.update(
      data,
      and(
        eq(userFsEntitlements.userId, userId),
        eq(userFsEntitlements.fsLicenseId, String(license.id)),
      ),
    );
  }

}
