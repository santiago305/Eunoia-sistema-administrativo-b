import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import {
  SALE_ORDER_STATES_REPOSITORY,
  SaleOrderStatesRepository,
} from "../../domain/ports/sale-order-states.repository";
import { UpdateSaleOrderStateInput } from "../dtos/update-sale-order-state.input";

export class UpdateSaleOrderStateUseCase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SALE_ORDER_STATES_REPOSITORY)
    private readonly saleOrderStatesRepo: SaleOrderStatesRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: UpdateSaleOrderStateInput) {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.saleOrderStatesRepo.findById(input.saleOrderStateId, tx);
      if (!current) {
        throw new NotFoundException("Estado de orden de venta no encontrado");
      }

      const name = input.name?.trim() || current.name;
      if (!name) {
        throw new BadRequestException("Nombre de estado de orden de venta es obligatorio");
      }
      const color = input.color?.trim() || current.color;
      if (!color) {
        throw new BadRequestException("Color de estado de orden de venta es obligatorio");
      }

      return this.saleOrderStatesRepo.update(
        {
          id: current.id,
          code: current.code,
          name,
          color,
          createdAt: current.createdAt,
          updatedAt: this.clock.now(),
        },
        tx,
      );
    });
  }
}
