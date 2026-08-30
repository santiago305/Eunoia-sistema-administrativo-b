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
import { AdviserSearchService } from './application/services/adviser-search.service';
import { ListingSearchMetricEntity } from 'src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-metric.entity';
import { ListingSearchRecentEntity } from 'src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-recent.entity';
import { ListingSearchTypeormRepository } from 'src/shared/listing-search/adapters/out/persistence/typeorm/repositories/listing-search.typeorm.repo';
import { LISTING_SEARCH_STORAGE } from 'src/shared/listing-search/domain/listing-search.repository';
import { ListAdviserOrdersUsecase } from './application/usecases/list-adviser-orders.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdviserEntity, User, SaleOrderEntity, SalePaymentEntity, ListingSearchRecentEntity, ListingSearchMetricEntity]),
    AccessControlModule,
  ],
  controllers: [AdvisersController],
  providers: [ListAdvisersUsecase, CreateAdviserUsecase, ListAdviserSummaryUsecase, ListAdviserOrdersUsecase, SetAdviserActiveUsecase, UpdateAdviserUsecase, AdviserSearchService, { provide: LISTING_SEARCH_STORAGE, useClass: ListingSearchTypeormRepository }],
  exports: [ListAdvisersUsecase],
})
export class AdvisersModule {}
