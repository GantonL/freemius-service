import { Controller, Get, Query, Res } from "@danet/core";
import type { Response } from "@danet/core";
import { FreemiusService } from "../freemius/freemius.service.ts";

@Controller("licenses")
export class LicenseController {
  constructor(private readonly freemiusService: FreemiusService) {}

  /**
   * GET /licenses/validate?key=XXX&product_id=YYY
   *
   * Validates a Freemius license key against the API.
   * `product_id` is optional — falls back to FREEMIUS_STORE_ID env var.
   *
   * Response:
   * - 200: { valid: true/false, plan, expiration, quota, activated, message }
   * - 400: Missing key parameter
   */
  @Get("validate")
  async validate(
    @Query("key") key: string,
    @Query("product_id") productId: string,
    @Res() res: Response
  ) {
    if (!key) {
      res.status = 400;
      return { error: "Missing required query parameter: key" };
    }

    const result = await this.freemiusService.validateLicense(key, productId);
    return result;
  }
}
