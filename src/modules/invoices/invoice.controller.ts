import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuard,
} from "@danet/core";
import { FreemiusService } from "../freemius/freemius.service.ts";
import { buildPaginationOptions } from "../../utils/pagination.util.ts";
import { InternalNetworkRequestGuard } from "../../guards/internal-network-request.guard.ts";

@Controller("invoices")
@UseGuard(InternalNetworkRequestGuard)
export class InvoiceController {
  constructor(private readonly freemiusService: FreemiusService) {}

  @Get("")
  async getInvoices(
    @Query("user_id") userId: string,
    @Query("count") count?: number,
    @Query("offset") offset?: number,
  ) {
    if (!userId) {
      throw new BadRequestException();
    }
    const params = { userId };
    const options = {
      pagination: buildPaginationOptions({ count, offset }),
    };
    return await this.freemiusService.getPayments(params, options);
  }

  @Get(":id")
  async getInvoiceById(@Param("id") id: string) {
    const payment = await this.freemiusService.getPaymentById(id);
    if (!payment) {
      throw new NotFoundException();
    }
    return payment;
  }

  @Get(":id/pdf")
  async getInvoicePdf(@Param("id") id: string) {
    const pdfBuffer = await this.freemiusService.getInvoicePdf(id);
    if (!pdfBuffer) {
      throw new NotFoundException();
    }

    const uint8Array = new Uint8Array(pdfBuffer);
    return new Response(uint8Array, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice_${id}.pdf"`,
      },
    });
  }
}
