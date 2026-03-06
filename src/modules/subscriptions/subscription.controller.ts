import { Controller, Get, Param, Query, Res } from "@danet/core";
import type { Response } from "@danet/core";
import { FreemiusService } from "../freemius/freemius.service.ts";

/**
 * Subscription status endpoints.
 *
 * GET /subscriptions?user_id=X            — list subscriptions for a user
 * GET /subscriptions?license_key=Y        — list subscriptions for a license
 * GET /subscriptions/:id                  — fetch a single subscription by ID
 *
 * All queries are scoped to the product configured via FREEMIUS_STORE_ID
 * unless overridden with the `product_id` query param.
 */
@Controller("subscriptions")
export class SubscriptionController {
  constructor(private readonly freemiusService: FreemiusService) {}

  /**
   * GET /subscriptions?user_id=X&license_key=Y&product_id=Z
   *
   * Returns all subscriptions for a given user or license.
   * At least one of `user_id` or `license_key` must be supplied.
   */
  @Get("")
  async list(
    @Query("user_id") userId: string,
    @Query("license_key") licenseKey: string,
    @Query("product_id") productId: string,
    @Res() res: Response,
  ) {
    if (!userId && !licenseKey) {
      res.status = 400;
      return {
        error:
          "At least one of `user_id` or `license_key` query parameters is required.",
      };
    }

    const result = await this.freemiusService.getSubscriptions({
      userId: userId || undefined,
      licenseKey: licenseKey || undefined,
      productId: productId || undefined,
    });

    return result;
  }

  /**
   * GET /subscriptions/:id?product_id=Z
   *
   * Returns a single subscription by its Freemius subscription ID.
   */
  @Get(":id")
  async getById(
    @Param("id") id: string,
    @Query("product_id") productId: string,
    @Res() res: Response,
  ) {
    const result = await this.freemiusService.getSubscriptionById(
      id,
      productId || undefined,
    );

    if (!result) {
      res.status = 404;
      return { error: `Subscription ${id} not found.` };
    }

    return result;
  }
}
