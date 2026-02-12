import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import { INVENTORY_REPOSITORY, InventoryRepository } from '../ports/inventory.repository.port';
import { TransactionContext } from '../ports/unit-of-work.port';

@Injectable()
export class DocumentPostOutValidationService {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventoryRepo: InventoryRepository,
  ) {}

  async validateOutStock(
    items: Array<{ variantId: string; quantity: number; fromLocationId?: string }>,
    warehouseId: string,
    tx: TransactionContext,
  ): Promise<{
    insuficientes: Array<{ itemId: string; required: number; available: number; verify: string }>;
    suficientes: Array<{ itemId: string; required: number; available: number; verify: string }>;
  }> {
    //validar que no se repitan los mismos productos en salida (OUT)
    this.verifyVariantId(items);
    
    const insuficientes: Array<{ itemId: string; required: number; available: number; verify: string }> = [];
    const suficientes: Array<{ itemId: string; required: number; available: number; verify: string }> = [];

    for (const i of items) {
      const snapshot = await this.inventoryRepo.getSnapshot(
        {
          warehouseId,
          variantId: i.variantId,
          locationId: i.fromLocationId
        },
        tx,
      );

      const onHand = snapshot?.onHand ?? 0;
      const reserved = snapshot?.reserved ?? 0;
      const available = onHand - reserved;

      if (available < i.quantity) {
        insuficientes.push({
          itemId: i.variantId,
          required: i.quantity,
          available,
          verify: 'El stock es insuficiente',
        });
      } else {
        suficientes.push({
          itemId: i.variantId,
          required: i.quantity,
          available,
          verify: 'El stock es suficiente',
        });
      }
    }

    return { insuficientes, suficientes };
  }
  private verifyVariantId(items: any) {
    const seen = new Set<string>();
    const repeated: string[] = [];

    for (const i of items) {
      if (seen.has(i.variantId)) {
        repeated.push(i.variantId);
      } else {
        seen.add(i.variantId);
      }
    }

    if (repeated.length > 0) {
      throw new BadRequestException({
        message: "Items repetidos",
        ids: repeated,
      });
    }
  }
}
