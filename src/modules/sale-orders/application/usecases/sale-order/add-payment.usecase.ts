import { BadRequestException, Inject, Injectable, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { SALE_PAYMENT_REPOSITORY, SalePaymentRepository } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { CompanyPaymentAccountEntity } from "src/modules/company-payment-accounts/adapters/out/persistence/typeorm/entities/company-payment-account.entity";
import { PaymentMethodEntity } from "src/modules/payment-methods/adapters/out/persistence/typeorm/entities/payment-method.entity";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { isCompanyPaymentAccountCompatible } from "src/modules/company-payment-accounts/domain/policies/payment-account-compatibility";

@Injectable()
export class AddSaleOrderPaymentUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SALE_PAYMENT_REPOSITORY)
    private readonly paymentRepo: SalePaymentRepository,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    @Optional() @InjectRepository(CompanyPaymentAccountEntity)
    private readonly paymentAccountRepo?: Repository<CompanyPaymentAccountEntity>,
    @Optional() @InjectRepository(PaymentMethodEntity)
    private readonly paymentMethodRepo?: Repository<PaymentMethodEntity>,
  ) {}

  async execute(input: {
    saleOrderId: string;
    bankAccountId?: string;
    companyPaymentAccountId?: string;
    paymentMethodId?: string;
    method: string;
    amount: number;
    date?: string;
    operationNumber?: string;
    operationCode?: string;
    note?: string;
    paymentPhoto?: string | null;
  }) {
    return this.uow.runInTransaction(async (tx) => {
      const order = await this.saleOrderRepo.findByIdForUpdate(input.saleOrderId, tx);
      if (!order) throw new BadRequestException("Pedido no encontrado");

      const date = input.date ? new Date(input.date) : new Date();
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException("Fecha de pago inválida");
      }

      if (!Number.isFinite(input.amount) || input.amount <= 0) {
        throw new BadRequestException("El monto del cobro debe ser mayor que cero");
      }

      const receiverId = (input.companyPaymentAccountId ?? input.bankAccountId)?.trim() || null;
      if (this.paymentAccountRepo && !receiverId) {
        throw new BadRequestException("Selecciona la cuenta receptora del cobro");
      }
      const account = this.paymentAccountRepo && receiverId
        ? await this.paymentAccountRepo.findOne({ where: { id: receiverId } })
        : null;
      if (this.paymentAccountRepo && receiverId) {
        if (!account || !account.isActive) throw new BadRequestException("La cuenta receptora no existe o está inactiva");
        if (account.usage !== "INFLOW" && account.usage !== "BOTH") throw new BadRequestException("La cuenta seleccionada no permite ingresos");
        if (account.currency !== "PEN") throw new BadRequestException("La moneda de la cuenta receptora no coincide con la venta");
      }
      if (this.paymentMethodRepo && !input.paymentMethodId) {
        throw new BadRequestException("Selecciona el método de pago del cobro");
      }
      if (this.paymentMethodRepo && input.paymentMethodId) {
        const paymentMethod = await this.paymentMethodRepo.findOne({ where: { id: input.paymentMethodId } });
        if (!paymentMethod || !paymentMethod.isActive) throw new BadRequestException("El método de pago no existe o está inactivo");

        if (account && !isCompanyPaymentAccountCompatible(paymentMethod.code, account.type)) {
          throw new BadRequestException("La cuenta receptora no es compatible con el método de pago");
        }
      }
      if (typeof this.paymentRepo.listBySaleOrderId === "function" && typeof order.total === "number") {
        const existing = await this.paymentRepo.listBySaleOrderId(input.saleOrderId, tx);
        const posted = existing.filter((payment) => payment.status === "POSTED").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        if (posted + input.amount > Number(order.total) + 0.01) throw new BadRequestException("El cobro supera el saldo pendiente de la venta");
      }

      const paymentsInput = [
        {
          saleOrderId: input.saleOrderId,
          bankAccountId: receiverId,
          companyPaymentAccountId: receiverId,
          paymentMethodId: input.paymentMethodId ?? null,
        currency: CurrencyType.PEN,
          status: "POSTED" as const,
          date,
          method: input.method,
          operationNumber: input.operationNumber ?? null,
          operationCode: input.operationCode ?? input.operationNumber ?? null,
          amount: input.amount,
          note: input.note ?? null,
          paymentPhoto: input.paymentPhoto ?? null,
        },
      ];

      try {
        const [created] = await this.paymentRepo.bulkCreate(paymentsInput, tx);
        return { paymentId: created.id };
      } catch (error: any) {
        if (error?.code === "23503") {
          throw new BadRequestException("Cuenta bancaria inválida");
        }
        throw error;
      }
    });
  }
}

