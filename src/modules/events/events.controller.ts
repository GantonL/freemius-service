import { Controller, Get, NotFoundException, Param, Query } from "@danet/core";
import { FreemiusService } from "../freemius/freemius.service.ts";

/**
 * Events status endpoints.
 *
 * GET /Events/:id                  — fetch a single Events by ID
 *
 * All queries are scoped to the product configured via FREEMIUS_STORE_ID
 * unless overridden with the `product_id` query param.
 */
@Controller("events")
export class EventsController {
  constructor(private readonly freemiusService: FreemiusService) {}

  /**
   * GET /Events/:id
   *
   * Returns a single Event by its Freemius Event ID.
   */
  @Get(":id")
  async getById(
    @Param("id") id: string,
    @Query("product_id") productId: string,
  ) {
    const result = await this.freemiusService.getEventById(
      id,
      productId,
    );

    if (!result) {
      const error = new NotFoundException();
      error.message = `Event ${id} not found.`;
      throw error;
    }

    return result;
  }
}
