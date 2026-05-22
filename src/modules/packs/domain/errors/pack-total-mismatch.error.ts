export class PackTotalMismatchError extends Error {
  constructor(message: string = "Total no coincide con items") {
    super(message);
    this.name = "PackTotalMismatchError";
  }
}

