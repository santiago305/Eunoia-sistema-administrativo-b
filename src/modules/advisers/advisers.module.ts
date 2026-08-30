import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from 'src/modules/access-control/infrastructure/access-control.module';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { AdvisersController } from './adapters/in/controllers/advisers.controller';
import { AdviserEntity } from './adapters/out/persistence/typeorm/entities/adviser.entity';
import { CreateAdviserUsecase } from './application/usecases/create-adviser.usecase';
import { ListAdvisersUsecase } from './application/usecases/list-advisers.usecase';
import { ListAdviserSummaryUsecase } from './application/usecases/list-adviser-summary.usecase';
import { SetAdviserActiveUsecase } from './application/usecases/set-adviser-active.usecase';
import { UpdateAdviserUsecase } from './application/usecases/update-adviser.usecase';
import { SaleOrderEntity } from 'src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order.entity';
import { SalePaymentEntity } from 'src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdviserEntity, User, SaleOrderEntity, SalePaymentEntity]),
    AccessControlModule,
  ],
  controllers: [AdvisersController],
  providers: [ListAdvisersUsecase, CreateAdviserUsecase, ListAdviserSummaryUsecase, SetAdviserActiveUsecase, UpdateAdviserUsecase],
  exports: [ListAdvisersUsecase],
})
export class AdvisersModule {}
