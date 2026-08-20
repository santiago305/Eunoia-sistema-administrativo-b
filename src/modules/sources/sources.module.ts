import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessControlModule } from "src/modules/access-control/infrastructure/access-control.module";
import { ListingSearchMetricEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-metric.entity";
import { ListingSearchRecentEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-recent.entity";
import { SourcesController } from "./adapters/in/controllers/sources.controller";
import { SourceEntity } from "./adapters/out/persistence/typeorm/entities/source.entity";
import { SourceRecognitionCodeEntity } from "./adapters/out/persistence/typeorm/entities/source-recognition-code.entity";
import { SourceRecognitionCodeService } from "./application/services/source-recognition-code.service";
import { sourcesModuleProviders } from "./composition/container";
import { SOURCE_REPOSITORY } from "./domain/ports/source.repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SourceEntity,
      SourceRecognitionCodeEntity,
      ListingSearchRecentEntity,
      ListingSearchMetricEntity,
    ]),
    AccessControlModule,
  ],
  controllers: [SourcesController],
  providers: [...sourcesModuleProviders, SourceRecognitionCodeService],
  exports: [SOURCE_REPOSITORY, SourceRecognitionCodeService],
})
export class SourcesModule {}

