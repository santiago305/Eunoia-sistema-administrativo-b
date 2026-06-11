import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PACK_REPOSITORY, PackRepository } from "src/modules/packs/domain/ports/pack.repository";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SALE_ORDER_ITEM_REPOSITORY, SaleOrderItemRepository } from "src/modules/sale-orders/domain/ports/sale-order-item.repository";
import { SALE_ORDER_ITEM_COMPONENT_REPOSITORY, SaleOrderItemComponentRepository } from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import { SALE_PAYMENT_REPOSITORY, SalePaymentRepository } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { WORKFLOW_REPOSITORY, WorkflowRepository } from "src/modules/workflow/domain/ports/workflow.repository";
import { WORKFLOW_STATE_REPOSITORY, WorkflowStateRepository } from "src/modules/workflow/domain/ports/workflow-state.repository";
import { SaleOrderNumberingService } from "../../services/sale-order-numbering.service";

type CreateSaleOrderInput = {
  warehouseId: string;
  clientId: string;
  workflowId: string;
  agencyDetail?: string;
  sourceId?: string;
  scheduleDate?: string;
  deliveryDate?: string;
  note?: string;
  subTotal?: number;
  deliveryCost?: number;
  total?: number;
  items: Array<{
    quantity: number;
    unitPrice: number;
    total: number;
    description?: string;
    referencePackId?: string;
    components?: Array<{
      skuId: string;
      quantity: number;
      unitPrice: number;
      total: number;
      referencePackItemId?: string;
    }>;
  }>;
  payments?: Array<{
    bankAccountId?: string;
    method: string;
    amount: number;
    date?: string;
    operationNumber?: string;
    note?: string;
  }>;
};

@Injectable()
export class CreateSaleOrderUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PACK_REPOSITORY)
    private readonly packRepo: PackRepository,
    private readonly numbering: SaleOrderNumberingService,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(SALE_ORDER_ITEM_REPOSITORY)
    private readonly saleOrderItemRepo: SaleOrderItemRepository,
    @Inject(SALE_ORDER_ITEM_COMPONENT_REPOSITORY)
    private readonly componentRepo: SaleOrderItemComponentRepository,
    @Inject(SALE_PAYMENT_REPOSITORY)
    private readonly paymentRepo: SalePaymentRepository,
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
    @Inject(WORKFLOW_STATE_REPOSITORY)
    private readonly workflowStateRepo: WorkflowStateRepository,
  ) {}

  async execute(input: CreateSaleOrderInput, createdBy: string) {
    return this.uow.runInTransaction(async (tx) => {
      if (!input.workflowId) {
        throw new BadRequestException("workflowId es obligatorio");
      }

      const { serie, correlative } = await this.numbering.reserveNext(tx);
      const workflow = await this.workflowRepo.findById(input.workflowId, tx);
      const initialState = await this.workflowStateRepo.findInitialByWorkflowId(input.workflowId, tx);
      if (!workflow?.isActive || !initialState) {
        throw new BadRequestException("Workflow invalido para crear pedido");
      }

      const order = await this.saleOrderRepo.create(
        {
          serie,
          correlative,
          warehouseId: input.warehouseId,
          clientId: input.clientId,
          agencyDetail: input.agencyDetail?.trim() ? input.agencyDetail.trim() : null,
          sourceId: input.sourceId ?? null,
          scheduleDate: input.scheduleDate ?? null,
          deliveryDate: input.deliveryDate ?? null,
          subTotal: input.subTotal ?? 0,
          deliveryCost: input.deliveryCost ?? 0,
          total: input.total ?? 0,
          note: input.note ?? null,
          createdBy,
          workflowId: workflow.id,
          currentStateId: initialState.id,
          isActive: true,
        },
        tx,
      );

      const items = await this.saleOrderItemRepo.bulkCreate(
        input.items.map((row) => ({
          saleOrderId: order.id,
          referencePackId: row.referencePackId ?? null,
          description: row.description ?? null,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          total: row.total,
        })),
        tx,
      );

      const componentsInput: Array<{
        saleOrderItemId: string;
        skuId: string;
        referencePackItemId?: string | null;
        quantity: number;
        unitPrice: number;
        total: number;
      }> = [];

      for (let index = 0; index < items.length; index += 1) {
        const savedItem = items[index];
        const requestedItem = input.items[index];

        const referencePackId = requestedItem.referencePackId?.trim();
        const requestedComponents = requestedItem.components ?? [];

        if (!requestedComponents.length && !referencePackId) {
          throw new BadRequestException("Cada item debe incluir components[] o referencePackId");
        }

        if (!referencePackId) {
          for (const c of requestedComponents) {
            componentsInput.push({
              saleOrderItemId: savedItem.id,
              skuId: c.skuId,
              referencePackItemId: c.referencePackItemId ?? null,
              quantity: c.quantity,
              unitPrice: c.unitPrice,
              total: c.total,
            });
          }
          continue;
        }

        const pack = await this.packRepo.findByIdWithItems(referencePackId, tx);
        if (!pack) {
          throw new BadRequestException("Pack inválido");
        }

        const overridesBySkuId = new Map(
          requestedComponents.map((c) => [
            c.skuId,
            {
              skuId: c.skuId,
              referencePackItemId: c.referencePackItemId ?? null,
              quantity: c.quantity,
              unitPrice: c.unitPrice,
              total: c.total,
            },
          ]),
        );

        for (const packItem of pack.items) {
          const override = overridesBySkuId.get(packItem.skuId);
          if (override) {
            componentsInput.push({
              saleOrderItemId: savedItem.id,
              skuId: override.skuId,
              referencePackItemId: override.referencePackItemId ?? packItem.id,
              quantity: override.quantity,
              unitPrice: override.unitPrice,
              total: override.total,
            });
            overridesBySkuId.delete(packItem.skuId);
            continue;
          }

          componentsInput.push({
            saleOrderItemId: savedItem.id,
            skuId: packItem.skuId,
            referencePackItemId: packItem.id,
            quantity: Number(savedItem.quantity) * Number(packItem.quantity),
            unitPrice: Number(packItem.price ?? 0),
            total: Number(packItem.lineTotal ?? 0) * Number(savedItem.quantity),
          });
        }

        if (overridesBySkuId.size) {
          throw new BadRequestException("Components contiene SKU(s) que no pertenecen al pack");
        }
      }

      await this.componentRepo.bulkCreate(componentsInput, tx);

      const paymentsInput = (input.payments ?? []).map((p) => {
        const date = p.date ? new Date(p.date) : new Date();
        if (Number.isNaN(date.getTime())) {
          throw new BadRequestException("Fecha de pago inválida");
        }
        return {
          saleOrderId: order.id,
          bankAccountId: p.bankAccountId?.trim() ? p.bankAccountId.trim() : null,
          date,
          method: p.method,
          operationNumber: p.operationNumber ?? null,
          amount: p.amount,
          note: p.note ?? null,
        };
      });
      try {
        await this.paymentRepo.bulkCreate(paymentsInput, tx);
      } catch (error: any) {
        if (error?.code === "23503") {
          throw new BadRequestException("Cuenta bancaria inválida");
        }
        throw error;
      }

      return {
        orderId: order.id,
        serie: order.serie,
        correlative: order.correlative,
        workflowId: order.workflowId,
        currentStateId: order.currentStateId,
      };
    });
  }
}
