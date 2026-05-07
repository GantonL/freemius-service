import { BadRequestException, Controller, Get, Query } from "@danet/core";
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
    @Query("license_id") licenseId: string,
    @Query("product_id") productId: string,
  ) {
    if (!licenseId) {
      const error = new BadRequestException();
      error.message = "license_id is required";
      throw error;
    }

    const result = await this.freemiusService.validateLicense(
      licenseId,
      productId,
    );
    return result;
  }
}
