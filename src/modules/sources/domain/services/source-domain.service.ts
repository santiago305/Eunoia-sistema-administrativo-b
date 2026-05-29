export class SourceDomainService {
  static normalizeOptionalText(value?: string) {
    return value?.trim() || undefined;
  }
}

