import { Provider } from "@nestjs/common";
import { ReactPdfRenderer } from "../adapters/out/react-pdf/react-pdf.renderer";
import { pdfGeneratedUsecasesProviders } from "../application/providers/pdf-generated-usecases.providers";
import { PDF_RENDERER } from "../domain/ports/pdf-renderer.port";

export const pdfGeneratedModuleProviders: Provider[] = [
  ...pdfGeneratedUsecasesProviders,
  { provide: PDF_RENDERER, useClass: ReactPdfRenderer },
];
