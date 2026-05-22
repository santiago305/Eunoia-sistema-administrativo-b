import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessControlModule } from "src/modules/access-control/infrastructure/access-control.module";
import { PacksController } from "./adapters/in/controllers/packs.controller";
import { PackEntity } from "./adapters/out/persistence/typeorm/entities/pack.entity";
import { PackItemEntity } from "./adapters/out/persistence/typeorm/entities/pack-item.entity";
import { ListingSearchMetricEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-metric.entity";
import { ListingSearchRecentEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-recent.entity";
import { packsModuleProviders } from "./composition/container";
import { PACK_REPOSITORY } from "./domain/ports/pack.repository";
import { PACK_ITEM_REPOSITORY } from "./domain/ports/pack-item.repository";

@Module({
  imports: [TypeOrmModule.forFeature([PackEntity, PackItemEntity, ListingSearchRecentEntity, ListingSearchMetricEntity]), AccessControlModule],
  controllers: [PacksController],
  providers: [...packsModuleProviders],
  exports: [PACK_REPOSITORY, PACK_ITEM_REPOSITORY],
})
export class PacksModule {}
