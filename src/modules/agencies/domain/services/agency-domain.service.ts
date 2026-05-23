export class AgencyDomainService {
  static normalizeOptionalText(value?: string) {
    return value?.trim() || undefined;
  }
}

