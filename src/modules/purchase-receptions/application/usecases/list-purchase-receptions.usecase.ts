import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import {
  PURCHASE_RECEPTION_REPOSITORY,
  PurchaseReceptionRepository,
} from "../../domain/ports/purchase-reception.repository";
import { PurchaseReceptionOutput } from "../dtos/purchase-reception.output";
import { PurchaseReceptionOutputMapper } from "../mappers/purchase-reception-output.mapper";

@Injectable()
export class ListPurchaseReceptionsUsecase {
  constructor(
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    @Inject(PURCHASE_RECEPTION_REPOSITORY)
    private readonly receptionRepo: PurchaseReceptionRepository,
  ) {}

  async execute(purchaseId: string): Promise<PurchaseReceptionOutput[]> {
    const purchase = await this.purchaseRepo.findById(purchaseId);
    if (!purchase) throw new NotFoundException("Orden de compra no encontrada");
    const rows = await this.receptionRepo.listByPurchaseId(purchaseId);
    return rows.map(PurchaseReceptionOutputMapper.toOutput);
  }
}
