import { PdfGeneratedApplicationError } from "./pdf-generated-application.error";

export class PdfGeneratedValidationError extends PdfGeneratedApplicationError {
  readonly code = "PDF_GENERATED_APPLICATION_VALIDATION";
  readonly identifier = "PDF_GENERATED_VALIDATION_ERROR";

  constructor(message: string) {
    super(message);
  }
}
