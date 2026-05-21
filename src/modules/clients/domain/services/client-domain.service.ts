export class ClientDomainService {
  static normalizeOptionalText(value?: string) {
    return value?.trim() || undefined;
  }
}

