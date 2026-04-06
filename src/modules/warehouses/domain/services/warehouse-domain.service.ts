export class WarehouseDomainService {
  static normalizeText(value?: string) {
    return value?.trim() || undefined;
  }
}
