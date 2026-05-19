import { Body, Controller, Post, UseGuard } from "@danet/core";
import { FreemiusService } from "../freemius/freemius.service.ts";
import { InternalNetworkRequestGuard } from "../../guards/internal-network-request.guard.ts";
import { CheckoutValidateRequestDto } from "./dtos/checkout-validate-request.dto.ts";

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
}
