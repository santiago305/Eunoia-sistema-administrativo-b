import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import {
  SALE_PAYMENT_REPOSITORY,
  SalePaymentRepository,
} from '../../domain/ports/sale-payment.repository';
import { canonicalPaymentMethodName } from 'src/modules/payment-methods/domain/value-objects/payment-method-catalog';

export type SaleOrderPaymentCommand = {
  id?: string;
  clientKey: string;
  bankAccountId?: string | null;
  companyPaymentAccountId?: string | null;
  paymentMethodId?: string | null;
  date: Date;
  method: string;
  operationNumber?: string | null;
  operationCode?: string | null;
  amount: number;
  note?: string | null;
};

export type SaleOrderPaymentReconciliation = {
  paymentIdByClientKey: Map<string, string>;
  retiredPaymentIds: string[];
};

@Injectable()
export class SaleOrderPaymentReconcilerService {
  constructor(
    @Inject(SALE_PAYMENT_REPOSITORY)
    private readonly paymentRepo: SalePaymentRepository,
  ) {}

  async reconcile(
    input: {
      saleOrderId: string;
      payments: SaleOrderPaymentCommand[];
    },
    tx: TransactionContext,
  ): Promise<SaleOrderPaymentReconciliation> {
    this.assertUniqueKeys(input.payments);

    const existing = await this.paymentRepo.listBySaleOrderId(
      input.saleOrderId,
      tx,
    );
    const existingById = new Map(existing.map((payment) => [payment.id, payment]));
    const retainedIds = new Set<string>();
    const paymentIdByClientKey = new Map<string, string>();
    const newPayments: SaleOrderPaymentCommand[] = [];

    for (const payment of input.payments) {
      if (!payment.id) {
        newPayments.push(payment);
        continue;
      }

      if (!existingById.has(payment.id)) {
        throw new BadRequestException(
          `El pago ${payment.id} no pertenece al pedido`,
        );
      }

      retainedIds.add(payment.id);
      paymentIdByClientKey.set(payment.clientKey, payment.id);
      const existingPayment = existingById.get(payment.id)!;
      if (existingPayment.status === 'POSTED' || existingPayment.status === 'CANCELLED' || existingPayment.status === 'REVERSED') {
        const changed =
          existingPayment.amount !== payment.amount ||
          existingPayment.method !== payment.method ||
          (existingPayment.operationNumber ?? null) !== (payment.operationNumber ?? null) ||
          (existingPayment.note ?? null) !== (payment.note ?? null) ||
          existingPayment.date.toISOString().slice(0, 10) !== payment.date.toISOString().slice(0, 10);
        if (changed) {
          throw new BadRequestException('Los pagos contabilizados o anulados son de solo lectura; anula y registra un nuevo ingreso');
        }
        continue;
      }
      await this.paymentRepo.update(
        {
          saleOrderId: input.saleOrderId,
          paymentId: payment.id,
          bankAccountId: payment.bankAccountId ?? null,
          companyPaymentAccountId: payment.companyPaymentAccountId ?? payment.bankAccountId ?? null,
          paymentMethodId: payment.paymentMethodId ?? null,
          operationCode: payment.operationCode ?? payment.operationNumber ?? null,
          date: payment.date,
          method: canonicalPaymentMethodName(payment.method),
          operationNumber: payment.operationNumber ?? null,
          amount: payment.amount,
          note: payment.note ?? null,
        },
        tx,
      );
    }

    const retiredPaymentIds = existing
      .filter((payment) => !retainedIds.has(payment.id))
      .map((payment) => payment.id);
    const protectedRetired = existing.filter(
      (payment) => !retainedIds.has(payment.id) && (payment.status === 'POSTED' || payment.status === 'CANCELLED' || payment.status === 'REVERSED'),
    );
    if (protectedRetired.length) {
      throw new BadRequestException('No se pueden quitar pagos contabilizados o anulados desde el editor; utiliza Anular ingreso');
    }
    await this.paymentRepo.deleteByIds(
      { saleOrderId: input.saleOrderId, paymentIds: retiredPaymentIds },
      tx,
    );

    const created = await this.paymentRepo.bulkCreate(
      newPayments.map((payment) => ({
        saleOrderId: input.saleOrderId,
        bankAccountId: payment.bankAccountId ?? null,
        companyPaymentAccountId: payment.companyPaymentAccountId ?? payment.bankAccountId ?? null,
        paymentMethodId: payment.paymentMethodId ?? null,
        operationCode: payment.operationCode ?? payment.operationNumber ?? null,
        date: payment.date,
        method: canonicalPaymentMethodName(payment.method),
        operationNumber: payment.operationNumber ?? null,
        amount: payment.amount,
        note: payment.note ?? null,
      })),
      tx,
    );

    newPayments.forEach((payment, index) => {
      const createdPayment = created[index];
      if (!createdPayment) {
        throw new Error('No se pudo asociar el pago creado');
      }
      paymentIdByClientKey.set(payment.clientKey, createdPayment.id);
    });

    return { paymentIdByClientKey, retiredPaymentIds };
  }

  private assertUniqueKeys(payments: SaleOrderPaymentCommand[]): void {
    const clientKeys = new Set<string>();
    const paymentIds = new Set<string>();

    for (const payment of payments) {
      if (!payment.clientKey || clientKeys.has(payment.clientKey)) {
        throw new BadRequestException(
          'Cada pago debe tener un clientKey unico',
        );
      }
      clientKeys.add(payment.clientKey);

      if (payment.id) {
        if (paymentIds.has(payment.id)) {
          throw new BadRequestException('No se puede repetir un pago');
        }
        paymentIds.add(payment.id);
      }
    }
  }
}
