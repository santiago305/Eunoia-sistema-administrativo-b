import { Inject } from "@nestjs/common";
import { GenerateInvoiceInput } from "../dtos/invoice/input/generate-invoice.input";
import { PDF_RENDERER, PdfRendererPort } from "src/modules/pdf-generated/domain/ports/pdf-renderer.port";

export class GenerateInvoicePdfUseCase {
  constructor(
    @Inject(PDF_RENDERER)
    private readonly pdfRenderer: PdfRendererPort,
  ) {}

  async execute(input: GenerateInvoiceInput): Promise<Buffer> {
    return this.pdfRenderer.renderInvoice(input);
  }
}
