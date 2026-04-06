export class SupplierDomainService {
  static normalizeOptionalText(value?: string) {
    return value?.trim() || undefined;
  }
}
