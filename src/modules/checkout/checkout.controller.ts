import { Body, Controller, Get, Post, Query, UseGuard } from "@danet/core";
import { FreemiusService } from "../freemius/freemius.service.ts";
import { InternalNetworkRequestGuard } from "../../guards/internal-network-request.guard.ts";
import { CheckoutValidateRequestDto } from "./dtos/checkout-validate-request.dto.ts";
import { FreemiusSupportedCheckoutLanguages } from "../../types.ts";

@Controller("checkout")
@UseGuard(InternalNetworkRequestGuard)
export class CheckoutController {
  constructor(private readonly freemiusService: FreemiusService) {}

  /**
   * POST /checkout/validate
   *
   * Validates a Freemius checkout completion url.
   *
   * Response:
   * - 200: { valid: true/false }
   * - 400: Bad request
   */
  @Post("validate")
  async validate(
    @Body() body: CheckoutValidateRequestDto,
  ) {
    const result = await this.freemiusService.validateCheckoutCompleted(
      body.url,
    );
    return result;
  }

  @Get("link")
  async getLink(
    @Query("productId") productId: string,
    @Query("planId") planId: string,
    @Query("userEmail") userEmail: string,
    @Query("readonlyUser") readonlyUser: boolean,
    @Query("environment") environment: string,
    @Query("language") language: FreemiusSupportedCheckoutLanguages,
  ) {
    const parameters = {
      planId,
      userEmail,
      productId,
      readonlyUser,
      environment,
      language,
    };
    return this.freemiusService.getCheckoutLink(parameters);
  }
}
