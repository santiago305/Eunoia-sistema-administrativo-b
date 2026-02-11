import { Inject, Injectable } from '@nestjs/common';
import { LEDGER_REPOSITORY, LedgerRepository } from '../../../domain/ports/ledger.repository.port';
import { GetLedgerInput } from '../../dto/ledger/input/get-ledger';
import { PaginatedLedgerResult } from '../../dto/ledger/output/paginated-ledger';


@Injectable()
export class GetLedgerUseCase {
  constructor(
    @Inject(LEDGER_REPOSITORY)
    private readonly ledgerRepo: LedgerRepository,
  ) {}

  async execute(input: GetLedgerInput): Promise<PaginatedLedgerResult> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 20;
    const { items, total } = await this.ledgerRepo.list({
          ...input,
          page,
          limit,
        });

        return {
          items: items.map((e) => ({
            id: e.id!,
            docId: e.docId,
            warehouseId: e.warehouseId,
            locationId: e.locationId,
            variantId: e.variantId,
            direction: e.direction,
            quantity: e.quantity,
            unitCost: e.unitCost ?? null,
            createdAt: e.createdAt,
          })),
          total,
          page,
          limit,
        };
    }
  }