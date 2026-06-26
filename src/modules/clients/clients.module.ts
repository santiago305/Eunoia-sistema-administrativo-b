import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessControlModule } from "src/modules/access-control/infrastructure/access-control.module";
import { UbigeoModule } from "src/modules/ubigeo/ubigeo.module";
import { ClientsController } from "./adapters/in/controllers/clients.controller";
import { ClientTelephonesController } from "./adapters/in/controllers/client-telephones.controller";
import { ClientEntity } from "./adapters/out/persistence/typeorm/entities/client.entity";
import { TelephoneEntity } from "./adapters/out/persistence/typeorm/entities/telephone.entity";
import { ListingSearchMetricEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-metric.entity";
import { ListingSearchRecentEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-recent.entity";
import { clientsModuleProviders } from "./composition/container";
import { CLIENT_REPOSITORY } from "./domain/ports/client.repository";
import { TELEPHONE_REPOSITORY } from "./domain/ports/telephone.repository";
import { CLIENT_REALTIME } from "./integration/client/ports/client-realtime.port";

@Module({
  imports: [TypeOrmModule.forFeature([ClientEntity, TelephoneEntity, ListingSearchRecentEntity, ListingSearchMetricEntity]), UbigeoModule, AccessControlModule],
  controllers: [ClientsController, ClientTelephonesController],
  providers: [...clientsModuleProviders],
  exports: [CLIENT_REPOSITORY, TELEPHONE_REPOSITORY, CLIENT_REALTIME],
})
export class ClientsModule {}
