import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaymentMethodsModule } from "src/modules/payment-methods/payment-methods.module";
import { SuppliersModule } from "src/modules/suppliers/suppliers.module";
import { AccessControlModule } from "src/modules/access-control/infrastructure/access-control.module";
import { SupplierPaymentDestinationEntity } from "./adapters/out/persistence/typeorm/entities/supplier-payment-destination.entity";
import { SupplierPaymentDestinationsController } from "./adapters/in/controllers/supplier-payment-destinations.controller";
import { SupplierPaymentDestinationTypeormRepository } from "./adapters/out/persistence/typeorm/repositories/supplier-payment-destination.typeorm.repo";
import { SUPPLIER_PAYMENT_DESTINATION_REPOSITORY } from "./domain/ports/supplier-payment-destination.repository";
import { CreateSupplierPaymentDestinationUsecase } from "./application/usecases/create-destination.usecase";
import { ListSupplierPaymentDestinationsUsecase } from "./application/usecases/list-destinations.usecase";
import { UpdateSupplierPaymentDestinationUsecase } from "./application/usecases/update-destination.usecase";
import { SetDefaultSupplierPaymentDestinationUsecase } from "./application/usecases/set-default-destination.usecase";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";

@Module({
  imports: [TypeOrmModule.forFeature([SupplierPaymentDestinationEntity]), PaymentMethodsModule, SuppliersModule, AccessControlModule],
  controllers: [SupplierPaymentDestinationsController],
  providers: [
    CreateSupplierPaymentDestinationUsecase, ListSupplierPaymentDestinationsUsecase, UpdateSupplierPaymentDestinationUsecase, SetDefaultSupplierPaymentDestinationUsecase,
    { provide: SUPPLIER_PAYMENT_DESTINATION_REPOSITORY, useClass: SupplierPaymentDestinationTypeormRepository },
    { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  ],
  exports: [SUPPLIER_PAYMENT_DESTINATION_REPOSITORY],
})
export class SupplierPaymentDestinationsModule {}
