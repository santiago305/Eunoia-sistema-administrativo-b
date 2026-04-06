export abstract class SuppliersApplicationError extends Error {
  abstract readonly code: string;
  abstract readonly identifier: string;
  readonly layer = "application";

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
