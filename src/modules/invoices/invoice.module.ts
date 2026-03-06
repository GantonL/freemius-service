import { Module } from "@danet/core";
import { InvoiceController } from "./invoice.controller.ts";
import { FreemiusModule } from "../freemius/freemius.module.ts";

@Module({
    imports: [FreemiusModule],
    controllers: [InvoiceController],
})
export class InvoiceModule { }
