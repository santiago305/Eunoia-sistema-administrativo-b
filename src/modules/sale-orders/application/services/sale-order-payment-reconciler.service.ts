import {
  ConflictException,
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { TypeormTransactionContext } from 'src/shared/domain/ports/typeorm-transaction-context';
import {
  fromMinorUnits,
  toMinorUnits,
} from 'src/modules/sale-orders/domain/value-objects/money';
import {
  SALE_PAYMENT_REPOSITORY,
  SalePaymentRepository,
} from '../../domain/ports/sale-payment.repository';
import { canonicalPaymentMethodName } from 'src/modules/payment-methods/domain/value-objects/payment-method-catalog';
import { isCompanyPaymentAccountCompatible } from 'src/modules/company-payment-accounts/domain/policies/payment-account-compatibility';

export type SaleOrderPaymentCommand = {
  id?: string;
  version?: number;
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
      executedBy: string;
      payments: SaleOrderPaymentCommand[];
    },
    tx: TransactionContext,
  ): Promise<SaleOrderPaymentReconciliation> {
    if (!input.executedBy) {
      throw new BadRequestException('No se pudo identificar al usuario que guarda los ingresos');
    }
    const manager = (tx as TypeormTransactionContext).manager;
    if (!manager) {
      throw new BadRequestException('El registro de ingresos requiere una transaccion del pedido');
    }
    const orderRows = await manager.query(
      'SELECT currency, company_id AS "companyId" FROM sale_orders WHERE id = $1 FOR UPDATE',
      [input.saleOrderId],
    );
    const orderCurrency = orderRows[0]?.currency;
    const orderCompanyId = orderRows[0]?.companyId;
    if (orderCurrency !== 'PEN' && orderCurrency !== 'USD') {
      throw new BadRequestException('No se pudo determinar la moneda del pedido');
    }
    if (!orderCompanyId) {
      throw new BadRequestException('No se pudo determinar la compañía del pedido');
    }
    const payments = input.payments.map((payment) => ({
      ...payment,
      amount: this.normalizeAmount(payment.amount),
    }));
    this.assertUniqueKeys(payments);

    const existing = await this.paymentRepo.listBySaleOrderId(
      input.saleOrderId,
      tx,
    );
    if (existing.some((payment) => payment.currency && payment.currency !== orderCurrency)) {
      throw new ConflictException('La moneda del pedido no coincide con la de sus ingresos; no se puede editar desde Pedidos.');
    }
    const existingById = new Map(existing.map((payment) => [payment.id, payment]));
    const retainedIds = new Set<string>();
    const paymentIdByClientKey = new Map<string, string>();
    const newPayments: SaleOrderPaymentCommand[] = [];

    for (const payment of payments) {
      if (!payment.id) {
        await this.validatePendingPaymentConfiguration(
          manager,
          payment,
          orderCurrency,
          input.executedBy,
          orderCompanyId,
        );
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
      const changedFields: string[] = [];
      if (toMinorUnits(existingPayment.amount) !== toMinorUnits(payment.amount)) changedFields.push('amount');
      if (canonicalPaymentMethodName(existingPayment.method) !== canonicalPaymentMethodName(payment.method)) changedFields.push('method');
      if ((existingPayment.operationNumber ?? null) !== (payment.operationNumber ?? null)) changedFields.push('operationNumber');
      if ((existingPayment.note ?? null) !== (payment.note ?? null)) changedFields.push('note');
      if (existingPayment.date.toISOString().slice(0, 10) !== payment.date.toISOString().slice(0, 10)) changedFields.push('paymentDate');
      if ((existingPayment.companyPaymentAccountId ?? existingPayment.bankAccountId ?? null) !== (payment.companyPaymentAccountId ?? payment.bankAccountId ?? null)) changedFields.push('receiverAccount');
      if ((existingPayment.paymentMethodId ?? null) !== (payment.paymentMethodId ?? null)) changedFields.push('paymentMethodId');
      if (changedFields.length === 0) continue;

      await this.validatePendingPaymentConfiguration(
        manager,
        payment,
        orderCurrency,
        input.executedBy,
        orderCompanyId,
      );

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
          updatedByUserId: input.executedBy ?? null,
          expectedVersion: payment.version ?? existingPayment.version,
        },
        tx,
      );
      await this.writeAuditAndOutbox(
        tx,
        input.saleOrderId,
        input.executedBy,
        'payment_pending_edited',
        payment.id,
        {
          status: 'PENDING_CONFIRMATION',
          amount: fromMinorUnits(toMinorUnits(payment.amount)),
          currency: orderCurrency,
          changedFields,
        },
      );
    }

    const retiredPaymentIds = existing
      .filter((payment) => !retainedIds.has(payment.id))
      .map((payment) => payment.id);
    if (retiredPaymentIds.length) {
      throw new ConflictException({
        code: 'FINANCIAL_HISTORY_IMMUTABLE',
        message: 'No se pueden quitar ingresos persistidos desde el editor. Cancela el ingreso pendiente desde Finanzas > Ingresos para conservar su historial.',
      });
    }

    const created = await this.paymentRepo.bulkCreate(
      newPayments.map((payment) => ({
        saleOrderId: input.saleOrderId,
        bankAccountId: payment.bankAccountId ?? null,
        companyPaymentAccountId: payment.companyPaymentAccountId ?? payment.bankAccountId ?? null,
        paymentMethodId: payment.paymentMethodId ?? null,
        currency: orderCurrency,
        operationCode: payment.operationCode ?? payment.operationNumber ?? null,
        date: payment.date,
        method: canonicalPaymentMethodName(payment.method),
        operationNumber: payment.operationNumber ?? null,
        amount: payment.amount,
        note: payment.note ?? null,
        createdByUserId: input.executedBy ?? null,
      })),
      tx,
    );

    for (let index = 0; index < newPayments.length; index++) {
      const payment = newPayments[index];
      const createdPayment = created[index];
      if (!createdPayment) {
        throw new Error('No se pudo asociar el pago creado');
      }
      paymentIdByClientKey.set(payment.clientKey, createdPayment.id);
      await this.writeAuditAndOutbox(
        tx,
        input.saleOrderId,
        input.executedBy,
        'payment_pending_created',
        createdPayment.id,
        {
          status: 'PENDING_CONFIRMATION',
          amount: payment.amount,
          currency: createdPayment.currency,
        },
      );
    }

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

  private normalizeAmount(amount: number): number {
    try {
      const cents = toMinorUnits(amount);
      if (cents <= 0) {
        throw new BadRequestException('El monto del ingreso debe ser mayor que cero');
      }
      return fromMinorUnits(cents);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        error instanceof Error ? error.message : 'El monto del ingreso es invalido',
      );
    }
  }

  private async validatePendingPaymentConfiguration(
    manager: TypeormTransactionContext['manager'],
    payment: SaleOrderPaymentCommand,
    orderCurrency: string,
    userId: string,
    orderCompanyId: string,
  ): Promise<void> {
    const accountId = payment.companyPaymentAccountId ?? payment.bankAccountId;
    if (!accountId || !payment.paymentMethodId) {
      throw new BadRequestException('Selecciona una cuenta receptora y un metodo de pago activos.');
    }
    const rows = await manager.query(
      `SELECT account.currency AS "accountCurrency", account.usage AS "accountUsage",
              account.is_active AS "accountIsActive", account.type AS "accountType",
              method.is_active AS "methodIsActive", method.code AS "methodCode",
              configured.requires_operation_number AS "requiresOperationNumber"
       FROM company_payment_accounts account
       JOIN companies company ON company.company_id = account.company_id AND company.is_active = true
       JOIN users actor ON actor.user_id = $3 AND actor.deleted = false
       JOIN payment_methods method ON method.method_id = $2
       JOIN company_methods configured
         ON configured.company_id = account.company_id
        AND configured.method_id = method.method_id
        AND configured.enabled = true
       WHERE account.company_payment_account_id = $1
         AND account.company_id = $4
         AND (actor.is_super_admin = true OR actor.company_id = account.company_id)
       FOR UPDATE OF account, method`,
      [accountId, payment.paymentMethodId, userId, orderCompanyId],
    );
    const configuration = rows[0];
    if (
      !configuration ||
      !configuration.accountIsActive ||
      !['INFLOW', 'BOTH'].includes(configuration.accountUsage) ||
      configuration.accountCurrency !== orderCurrency
    ) {
      throw new BadRequestException('Selecciona una cuenta receptora activa y compatible con la moneda del pedido.');
    }
    if (!configuration.methodIsActive) {
      throw new BadRequestException('Selecciona un metodo de pago activo.');
    }
    if (!isCompanyPaymentAccountCompatible(configuration.methodCode, configuration.accountType)) {
      throw new BadRequestException('La cuenta receptora no es compatible con el metodo de pago.');
    }
    if (configuration.requiresOperationNumber && !payment.operationNumber?.trim()) {
      throw new BadRequestException('Este metodo de pago requiere un numero de operacion.');
    }
  }

  private async writeAuditAndOutbox(
    tx: TransactionContext,
    saleOrderId: string,
    userId: string,
    action: string,
    incomeId: string,
    details: unknown,
  ): Promise<void> {
    const manager = (tx as TypeormTransactionContext).manager;
    if (!manager) {
      throw new BadRequestException('La auditoria financiera requiere la transaccion del pedido');
    }
    await manager.query(
      `INSERT INTO sale_order_auditory (sale_order_id, executed_by, action_execution)
       VALUES ($1, $2, $3)`,
      [saleOrderId, userId, action],
    );
    await manager.query(
      `INSERT INTO financial_outbox_events (event_type, aggregate_type, aggregate_id, payload)
       VALUES ($1, 'sale_payment', $2, $3::jsonb)`,
      [
        `income.${action}`,
        incomeId,
        JSON.stringify({ incomeId, saleOrderId, actorId: userId, details }),
      ],
    );
  }
}
