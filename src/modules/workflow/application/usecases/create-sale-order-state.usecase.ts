import { BadRequestException, Inject } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import {
  SALE_ORDER_STATES_REPOSITORY,
  SaleOrderStatesRepository,
} from "../../domain/ports/sale-order-states.repository";
import { CreateSaleOrderStateInput } from "../dtos/create-sale-order-state.input";

export class CreateSaleOrderStateUseCase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SALE_ORDER_STATES_REPOSITORY)
    private readonly saleOrderStatesRepo: SaleOrderStatesRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: CreateSaleOrderStateInput) {
    const name = input.name?.trim();
    const code = input.code?.trim().toUpperCase() || name?.replace(/\s+/g, "_").toUpperCase();
    if (!code || !name) {
      throw new BadRequestException("Codigo y nombre de estado de orden de venta son obligatorios");
    }
    const color = input.color?.trim();
    if (!color) {
      throw new BadRequestException("Color de estado de orden de venta es obligatorio");
    }

    return this.uow.runInTransaction((tx) =>
      this.saleOrderStatesRepo.create(
        {
          id: crypto.randomUUID(),
          code,
          name,
          color,
          createdAt: this.clock.now(),
          updatedAt: null,
        },
        tx,
      ),
    );
  }
}
