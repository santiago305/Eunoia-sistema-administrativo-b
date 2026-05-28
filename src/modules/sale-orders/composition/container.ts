import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { SALE_ORDER_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SALE_ORDER_ITEM_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order-item.repository";
import { SALE_ORDER_ITEM_COMPONENT_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import { SALE_PAYMENT_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { SaleOrderTypeormRepository } from "src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order.typeorm.repo";
import { SaleOrderItemTypeormRepository } from "src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order-item.typeorm.repo";
import { SaleOrderItemComponentTypeormRepository } from "src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order-item-component.typeorm.repo";
import { SalePaymentTypeormRepository } from "src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-payment.typeorm.repo";
import { CreateSaleOrderUsecase } from "src/modules/sale-orders/application/usecases/sale-order/create.usecase";

export const saleOrdersModuleProviders = [
  { provide: SALE_ORDER_REPOSITORY, useClass: SaleOrderTypeormRepository },
  { provide: SALE_ORDER_ITEM_REPOSITORY, useClass: SaleOrderItemTypeormRepository },
  { provide: SALE_ORDER_ITEM_COMPONENT_REPOSITORY, useClass: SaleOrderItemComponentTypeormRepository },
  { provide: SALE_PAYMENT_REPOSITORY, useClass: SalePaymentTypeormRepository },
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  CreateSaleOrderUsecase,
];
