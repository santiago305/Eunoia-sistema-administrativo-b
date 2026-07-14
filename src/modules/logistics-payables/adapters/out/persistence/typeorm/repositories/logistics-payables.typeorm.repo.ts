import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { AccountPayableEntity } from "src/modules/accounts-payable/adapters/out/persistence/typeorm/entities/account-payable.entity";
import { SubsidiaryEntity } from "src/modules/agencies/adapters/out/persistence/typeorm/entities/subsidiary.entity";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { PurchaseOrderEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order.entity";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PurchasePaymentStatus } from "src/modules/purchases/domain/value-objects/purchase-payment-status";
import { PurchaseType } from "src/modules/purchases/domain/value-objects/purchase-type";
import { ReceptionStatus } from "src/modules/purchases/domain/value-objects/reception-status";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import {
  InternalLogisticsPurchaseInput,
  LogisticsAccountPayableInput,
  LogisticsPayablesRepository,
  SaleOrderLogisticsPayableLinkInput,
} from "src/modules/logistics-payables/domain/ports/logistics-payables.repository";
import { SaleOrderLogisticsPayableEntity } from "../entities/sale-order-logistics-payable.entity";

@Injectable()
export class LogisticsPayablesTypeormRepository implements LogisticsPayablesRepository {
  constructor(
    @InjectRepository(SaleOrderLogisticsPayableEntity)
    private readonly linkRepo: Repository<SaleOrderLogisticsPayableEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.linkRepo.manager;
  }

  async findSubsidiaryPayableConfig(agencySubsidiaryId: string, tx?: TransactionContext) {
    const row = await this.getManager(tx).getRepository(SubsidiaryEntity).findOne({
      where: { id: agencySubsidiaryId },
    });
    if (!row) return null;
    return {
      generatesPayable: Boolean((row as any).generatesPayable),
      payableSupplierId: (row as any).payableSupplierId ?? null,
      payableDescription: (row as any).payableDescription ?? null,
    };
  }

  async findActiveBySaleOrderId(saleOrderId: string, tx?: TransactionContext) {
    const manager = this.getManager(tx);
    const row = await manager.getRepository(SaleOrderLogisticsPayableEntity).findOne({
      where: { saleOrderId, status: "ACTIVE" },
    });
    if (!row) return null;
    const payable = await manager.getRepository(AccountPayableEntity).findOne({
      where: { id: row.accountPayableId },
    });
    return {
      purchaseId: row.purchaseId,
      accountPayableId: row.accountPayableId,
      amount: Number(row.amount ?? 0),
      amountPaid: Number(payable?.amountPaid ?? 0),
    };
  }

  async createInternalPurchase(input: InternalLogisticsPurchaseInput, tx?: TransactionContext) {
    const saved = await this.getManager(tx).getRepository(PurchaseOrderEntity).save({
      supplierId: input.supplierId,
      currency: input.currency as any,
      paymentForm: PaymentFormType.CREDITO,
      creditDays: 0,
      numQuotas: 1,
      totalTaxed: 0,
      totalExempted: input.total,
      totalIgv: 0,
      purchaseValue: input.total,
      total: input.total,
      note: input.note,
      status: PurchaseOrderStatus.RECEIVED,
      purchaseType: PurchaseType.SERVICE,
      receptionStatus: ReceptionStatus.NOT_REQUIRED,
      paymentStatus: PurchasePaymentStatus.PENDING,
      requiresReceipt: false,
      requiresStockEntry: false,
      requiresAssetCreation: false,
      isActive: true,
      dateIssue: input.dateIssue,
      dateExpiration: input.dateExpiration,
      createdBy: input.createdByUserId ?? null,
      approvalStatus: "NOT_REQUIRED",
      imageProdution: [],
    });
    return { purchaseId: saved.id };
  }

  async createAccountPayable(input: LogisticsAccountPayableInput, tx?: TransactionContext) {
    const saved = await this.getManager(tx).getRepository(AccountPayableEntity).save({
      purchaseId: input.purchaseId,
      quotaId: null,
      supplierId: input.supplierId,
      description: input.description,
      currency: input.currency,
      amountTotal: input.amountTotal,
      amountPaid: 0,
      amountPending: input.amountTotal,
      dueDate: input.dueDate,
      status: "PENDING",
      createdByUserId: input.createdByUserId ?? null,
    });
    return { accountPayableId: saved.id };
  }

  async createLink(input: SaleOrderLogisticsPayableLinkInput, tx?: TransactionContext) {
    const saved = await this.getManager(tx).getRepository(SaleOrderLogisticsPayableEntity).save(input);
    return { id: saved.id };
  }

  async updatePendingAmounts(
    input: { saleOrderId: string; purchaseId: string; accountPayableId: string; amount: number },
    tx?: TransactionContext,
  ): Promise<void> {
    const manager = this.getManager(tx);
    await manager.getRepository(PurchaseOrderEntity).update(
      { id: input.purchaseId },
      {
        totalExempted: input.amount,
        purchaseValue: input.amount,
        total: input.amount,
      },
    );
    await manager.getRepository(AccountPayableEntity).update(
      { id: input.accountPayableId },
      {
        amountTotal: input.amount,
        amountPending: input.amount,
      },
    );
    await manager.getRepository(SaleOrderLogisticsPayableEntity).update(
      { saleOrderId: input.saleOrderId, status: "ACTIVE" },
      { amount: input.amount },
    );
  }

  async cancelPending(
    input: { saleOrderId: string; purchaseId: string; accountPayableId: string },
    tx?: TransactionContext,
  ): Promise<void> {
    const manager = this.getManager(tx);
    await manager.getRepository(AccountPayableEntity).update(
      { id: input.accountPayableId },
      { status: "CANCELLED", amountPending: 0 },
    );
    await manager.getRepository(PurchaseOrderEntity).update(
      { id: input.purchaseId },
      { status: PurchaseOrderStatus.CANCELLED, paymentStatus: PurchasePaymentStatus.CANCELLED },
    );
    await manager.getRepository(SaleOrderLogisticsPayableEntity).update(
      { saleOrderId: input.saleOrderId, status: "ACTIVE" },
      { status: "CANCELLED" },
    );
  }
}
