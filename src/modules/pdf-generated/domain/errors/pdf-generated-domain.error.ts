export abstract class PdfGeneratedDomainError extends Error {
  abstract readonly code: string;
  abstract readonly identifier: string;
  readonly layer = "domain";

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
