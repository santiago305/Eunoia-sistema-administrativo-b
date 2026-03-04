import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { UpdatePurchaseOrderInput } from "../../dtos/purchase-order/input/update.input";
import { Money } from "src/modules/catalog/domain/value-object/money.vo";

export class UpdatePurchaseOrderUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
  ) {}

  async execute(input: UpdatePurchaseOrderInput): Promise<{ type: string; message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const expectedAt = input.expectedAt ? new Date(input.expectedAt) : undefined;
      if (expectedAt && Number.isNaN(expectedAt.getTime())) {
        throw new BadRequestException({ type: "error", message: "Fecha esperada invalida" });
      }

      const dateIssue = input.dateIssue ? new Date(input.dateIssue) : undefined;
      if (dateIssue && Number.isNaN(dateIssue.getTime())) {
        throw new BadRequestException({ type: "error", message: "Fecha de emision invalida" });
      }

      const dateExpiration = input.dateExpiration ? new Date(input.dateExpiration) : undefined;
      if (dateExpiration && Number.isNaN(dateExpiration.getTime())) {
        throw new BadRequestException({ type: "error", message: "Fecha de vencimiento invalida" });
      }

      const currency = input.currency ?? "PEN";

      const updated = await this.purchaseRepo.update(
        {
          poId: input.poId,
          supplierId: input.supplierId,
          warehouseId: input.warehouseId,
          documentType: input.documentType,
          serie: input.serie,
          correlative: input.correlative,
          currency: input.currency,
          paymentForm: input.paymentForm,
          creditDays: input.creditDays,
          numQuotas: input.numQuotas,
          totalTaxed: input.totalTaxed !== undefined ? Money.create(input.totalTaxed, currency) : undefined,
          totalExempted: input.totalExempted !== undefined ? Money.create(input.totalExempted, currency) : undefined,
          totalIgv: input.totalIgv !== undefined ? Money.create(input.totalIgv, currency) : undefined,
          purchaseValue: input.purchaseValue !== undefined ? Money.create(input.purchaseValue, currency) : undefined,
          total: input.total !== undefined ? Money.create(input.total, currency) : undefined,
          note: input.note,
          status: input.status,
          expectedAt,
          dateIssue,
          dateExpiration,
        },
        tx,
      );

      if (!updated) {
        throw new NotFoundException({
          type: "error",
          message: "Orden de compra no encontrada",
        });
      }

      return { type: "success", message: "Orden de compra actualizada con exito" };
    });
  }
}
