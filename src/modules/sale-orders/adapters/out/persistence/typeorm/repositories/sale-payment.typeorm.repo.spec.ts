import { In } from "typeorm";
import { CompanyPaymentAccountEntity } from "src/modules/company-payment-accounts/adapters/out/persistence/typeorm/entities/company-payment-account.entity";
import { SalePaymentEntity } from "../entities/sale-payment.entity";
import { SalePaymentTypeormRepository } from "./sale-payment.typeorm.repo";

describe("SalePaymentTypeormRepository", () => {
  it("calculates order receipts from posted payment allocations, including credits applied from another order", async () => {
    const manager = {
      query: jest.fn().mockResolvedValue([
        { saleOrderId: "order-target", amount: "45.50" },
        { saleOrderId: "order-source", amount: "30.00" },
      ]),
    };
    const repository = new SalePaymentTypeormRepository({ manager } as any);

    await expect(repository.getPostedAppliedTotalsBySaleOrderIds(["order-target", "order-source"])).resolves.toEqual([
      { saleOrderId: "order-target", amount: 45.5 },
      { saleOrderId: "order-source", amount: 30 },
    ]);
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("sale_payment_allocations"), [["order-target", "order-source"]]);
  });

  it("loads company payment account data when listing payments by sale order ids", async () => {
    const paymentDate = new Date("2026-06-13T00:00:00.000Z");
    const createdAt = new Date("2026-06-15T23:08:16.892Z");
    const paymentRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: "payment-1",
          saleOrderId: "order-1",
          companyPaymentAccountId: "bank-1",
          date: paymentDate,
          method: "EFECTIVO",
          operationNumber: "",
          amount: "10",
          note: "ADELANTO",
          createdAt,
        },
      ]),
    };
    const bankAccountRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: "bank-1",
          name: "BCP Soles",
          accountNumber: null,
          accountLastFour: "0001",
        },
      ]),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === SalePaymentEntity) return paymentRepo;
        if (entity === CompanyPaymentAccountEntity) return bankAccountRepo;
        throw new Error("Unexpected repository");
      }),
    };
    const repository = new SalePaymentTypeormRepository({ manager } as any);

    const result = await repository.listBySaleOrderIds(["order-1"]);

    expect(paymentRepo.find).toHaveBeenCalledWith({
      where: { saleOrderId: In(["order-1"]) },
      order: { saleOrderId: "ASC", createdAt: "ASC" },
    });
    expect(bankAccountRepo.find).toHaveBeenCalledWith({ where: { id: In(["bank-1"]) } });
    expect(result).toEqual([
      expect.objectContaining({
        id: "payment-1",
        saleOrderId: "order-1",
        bankAccountId: "bank-1",
        companyPaymentAccountId: "bank-1",
        bankAccount: {
          id: "bank-1",
          name: "BCP Soles",
          number: "****0001",
        },
        date: paymentDate,
        method: "EFECTIVO",
        operationNumber: "",
        amount: 10,
        note: "ADELANTO",
        paymentPhoto: null,
        currency: "PEN",
        paymentMethodId: null,
        operationCode: null,
        status: "PENDING_CONFIRMATION",
        voidedAt: null,
        voidReason: null,
        createdAt,
      }),
    ]);
  });

  it('updates and deletes selected payments through the transaction manager', async () => {
    const query = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const paymentRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(query),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === SalePaymentEntity) return paymentRepo;
        throw new Error('Unexpected repository');
      }),
    };
    const repository = new SalePaymentTypeormRepository({ manager } as any);
    const tx = { manager } as any;

    await repository.update(
      {
        saleOrderId: 'order-1',
        paymentId: 'payment-1',
        bankAccountId: null,
        date: new Date('2026-07-03T00:00:00.000Z'),
        method: 'EFECTIVO',
        amount: 80,
      },
      tx,
    );
    await repository.deleteByIds(
      { saleOrderId: 'order-1', paymentIds: ['payment-2'] },
      tx,
    );

    expect(query.set).toHaveBeenCalledWith(expect.objectContaining({ amount: 80, method: 'EFECTIVO', version: expect.any(Function) }));
    expect(query.where).toHaveBeenCalledWith(expect.stringContaining("status = :status"), expect.objectContaining({ status: 'PENDING_CONFIRMATION' }));
    expect(paymentRepo.delete).toHaveBeenCalledWith({
      id: In(['payment-2']),
      saleOrderId: 'order-1',
    });
  });
});
