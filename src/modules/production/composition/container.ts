import { Provider } from "@nestjs/common";
import { CLOCK } from "src/shared/application/ports/clock.port";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { ProductionOrderTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/production-order.typeorm.repo";
import { PRODUCTION_ORDER_REPOSITORY } from "../application/ports/production-order.repository";
import { productionUsecasesProviders } from "../application/providers/production-usecases.providers";

export const productionModuleProviders: Provider[] = [
  ...productionUsecasesProviders,
  { provide: PRODUCTION_ORDER_REPOSITORY, useClass: ProductionOrderTypeormRepository },
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  { provide: CLOCK, useValue: { now: () => new Date() } },
];
