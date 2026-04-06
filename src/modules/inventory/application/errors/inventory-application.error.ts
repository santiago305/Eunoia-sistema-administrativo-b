export abstract class InventoryApplicationError extends Error {
  abstract readonly code: string;
  abstract readonly identifier: string;
  readonly layer = "application";

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
