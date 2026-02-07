import { Inject, Injectable } from '@nestjs/common';
import { LEDGER_REPOSITORY, LedgerRepository } from '../../../domain/ports/ledger.repository.port';
import { GetLedgerInput } from '../../dto/inputs';
import { LedgerEntryOutput } from '../../dto/outputs';


@Injectable()
export class GetLedgerUseCase {
  constructor(
    @Inject(LEDGER_REPOSITORY)
    private readonly ledgerRepo: LedgerRepository,
  ) {}

  async execute(input: GetLedgerInput): Promise<LedgerEntryOutput[]> {
    const entries = await this.ledgerRepo.list(input);
    return entries.map((e) => ({
      id: e.id!,
      docId: e.docId,
      warehouseId: e.warehouseId,
      locationId: e.locationId,
      variantId: e.variantId,
      direction: e.direction,
      quantity: e.quantity,
      unitCost: e.unitCost ?? null,
      createdAt: e.createdAt,
    }));
  }
}
