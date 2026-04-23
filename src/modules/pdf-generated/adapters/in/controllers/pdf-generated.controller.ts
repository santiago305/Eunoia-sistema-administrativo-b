import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { GenerateInvoicePdfUseCase } from "src/modules/pdf-generated/application/usecases/generate-invoice-pdf.usecase";
import { HttpGenerateInvoiceDto } from "../dtos/http-generate-invoice.dto";
import { GeneratePurchaseOrderPdfUseCase } from "src/modules/pdf-generated/application/usecases/generate-purchase-order-pdf.usecase";
import { GenerateProductionOrderPdfUseCase } from "src/modules/pdf-generated/application/usecases/generate-production-order-pdf.usecase";
import { GenerateInventoryDocumentPdfUseCase } from "src/modules/pdf-generated/application/usecases/generate-inventory-document-pdf.usecase";
import { PdfGeneratedHttpMapper } from "src/modules/pdf-generated/application/mappers/pdf-generated-http.mapper";
import { SkipCsrf } from "src/shared/utilidades/decorators";

@Controller("pdf-generated")
@UseGuards(JwtAuthGuard)
export class PdfGeneratedController {
  constructor(
    private readonly generateInvoicePdf: GenerateInvoicePdfUseCase,
    private readonly generatePurchasePdf: GeneratePurchaseOrderPdfUseCase,
    private readonly generateProductionPdf: GenerateProductionOrderPdfUseCase,
    private readonly generateInventoryDocumentPdf: GenerateInventoryDocumentPdfUseCase
  ) {}

  @Post("invoice")
  @SkipCsrf()
  async createInvoice(@Body() dto: HttpGenerateInvoiceDto, @Res() res: Response) {
    const buffer = await this.generateInvoicePdf.execute(
      PdfGeneratedHttpMapper.toInvoiceInput(dto),
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=invoice.pdf");
    return res.status(200).send(buffer);
  }
  @Get("purchase/:id/pdf")
  async getPdf(@Param("id", ParseUUIDPipe) id: string, @Res() res: Response) {
    const buffer = await this.generatePurchasePdf.execute(
      PdfGeneratedHttpMapper.toPurchaseOrderInput(id),
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=purchase-order.pdf");
    return res.status(200).send(buffer);
  }

  @Get("production/:id/pdf")
  async getProductionPdf(@Param("id", ParseUUIDPipe) id: string, @Res() res: Response) {
    const buffer = await this.generateProductionPdf.execute(
      PdfGeneratedHttpMapper.toProductionOrderInput(id),
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=production-order.pdf");
    return res.status(200).send(buffer);
  }
  @Get("inventory/:id/pdf")
  async getInventoryDocumentPdf(@Param("id", ParseUUIDPipe) id: string, @Res() res: Response) {
    const buffer = await this.generateInventoryDocumentPdf.execute(
      PdfGeneratedHttpMapper.toInventoryDocumentInput(id),
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=inventory-document.pdf");
    return res.status(200).send(buffer);
  }
}

