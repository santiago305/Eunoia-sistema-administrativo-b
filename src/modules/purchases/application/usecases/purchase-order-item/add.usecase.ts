import { BadRequestException, Inject } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PURCHASE_ORDER_ITEM, PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { AddPurchaseOrderItemInput } from "../../dtos/purchase-order-item/input/add.input";
import { PurchaseOrderItemFactory } from "src/modules/purchases/domain/factories/purchase-order-item.factory";
import { PurchaseOrderId } from "src/modules/purchases/domain/value-objects/purchase-order-id.vo";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { DomainError } from "src/modules/purchases/domain/errors/domain.error";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PurchaseOrderNotFoundApplicationError } from "../../errors/purchase-order-not-found.error";
import { PurchaseUnitConversionService } from "../../services/purchase-unit-conversion.service";

export class AddPurchaseOrderItemUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PURCHASE_ORDER_ITEM)
    private readonly itemRepo: PurchaseOrderItemRepository,
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    private readonly purchaseUnitConversionService: PurchaseUnitConversionService,
  ) {}

  async execute(items: AddPurchaseOrderItemInput[], po_id: string): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      let poId: string;
      try {
        poId = new PurchaseOrderId(po_id).value;
      } catch (err) {
        if (err instanceof DomainError || (err as any)?.name === "InvalidMoneyError") {
          throw new BadRequestException((err as Error).message);
        }
        throw err;
      }

      const order = await this.purchaseRepo.findById(poId, tx);
      if (!order) {
        throw new BadRequestException(new PurchaseOrderNotFoundApplicationError().message);
      }

      for (const item of items) {
        let data: any;
        const conversion = await this.purchaseUnitConversionService.resolveFactor({
          skuId: item.skuId!,
          unitBase: item.unitBase,
          factor: item.factor,
          tx,
        });
        try {
          data = PurchaseOrderItemFactory.createNew({
            poId,
            stockItemId: item.skuId,
            unitBase: (conversion.unitBase ?? item.unitBase) as any,
            equivalence: (conversion.equivalence ?? item.equivalence) as any,
            factor: conversion.factor as any,
            afectType: item.afectType as any,
            quantity: item.quantity as any,
            porcentageIgv: item.porcentageIgv ?? 0,
            baseWithoutIgv: item.baseWithoutIgv ?? 0,
            amountIgv: item.amountIgv ?? 0,
            unitValue: item.unitValue ?? 0,
            unitPrice: item.unitPrice ?? 0,
            purchaseValue: item.purchaseValue ?? 0,
            currency: order.currency ?? CurrencyType.PEN,
          });
        } catch (err) {
          if (err instanceof DomainError || (err as any)?.name === "InvalidMoneyError") {
            throw new BadRequestException((err as Error).message);
          }
          throw err;
        }

        try {
          await this.itemRepo.add(data, tx);
        } catch {
          throw new BadRequestException("No se pudo agregar items a la orden de compra");
        }
      }

      return { message: "Items agregados con exito" };
    });
  }
}
