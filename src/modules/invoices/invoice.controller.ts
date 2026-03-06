import { Controller, Get, Query, Param, Req, Res, BadRequestException, NotFoundException } from "@danet/core";
import { FreemiusService } from "../freemius/freemius.service.ts";

@Controller("invoices")
export class InvoiceController {
    constructor(private readonly freemiusService: FreemiusService) { }

    @Get()
    async getInvoices(
        @Query("user_id") userId?: string,
        @Query("subscription_id") subscriptionId?: string
    ) {
        if (!userId && !subscriptionId) {
            throw new BadRequestException("Must provide either user_id or subscription_id");
        }

        return this.freemiusService.getPayments({ userId, subscriptionId });
    }

    @Get(":id")
    async getInvoiceById(@Param("id") id: string) {
        const payment = await this.freemiusService.getPaymentById(id);
        if (!payment) {
            throw new NotFoundException("Payment not found");
        }
        return payment;
    }

    @Get(":id/pdf")
    async getInvoicePdf(@Param("id") id: string, @Res() response: any) {
        const pdfBuffer = await this.freemiusService.getInvoicePdf(id);
        if (!pdfBuffer) {
            throw new NotFoundException("Invoice PDF not found or payment does not exist");
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
