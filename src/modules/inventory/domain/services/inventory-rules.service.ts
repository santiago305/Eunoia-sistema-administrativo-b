import { DocumentSeriesRepository } from '../ports/document-series.repository.port';
import { Quantity } from '../value-objects/quantity.vo';

export class InventoryRulesService {
  constructor(private readonly seriesRepo: DocumentSeriesRepository) {}

  async ensureSeriesExists(serieId: string) {
    const series = await this.seriesRepo.findById(serieId);
    if (!series) {
      throw new Error('Serie invalida');
    }
  }

  async normalizeQuantity(params: {
    quantity: number;
    allowNegative?: boolean;
  }): Promise<number> {
    const value = params.quantity;

    if (params.allowNegative) {
      if (!Number.isInteger(value) || value === 0) {
        throw new Error('Cantidad invalida');
      }
      return value;
    }

    const qty = new Quantity(value).value;
    return qty;
  }
}
