import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UbigeoController } from "./adapters/in/http/controllers/ubigeo.controller";
import { UbigeoDepartmentEntity } from "./adapters/out/persistence/typeorm/entities/ubigeo-department.entity";
import { UbigeoDistrictEntity } from "./adapters/out/persistence/typeorm/entities/ubigeo-district.entity";
import { UbigeoProvinceEntity } from "./adapters/out/persistence/typeorm/entities/ubigeo-province.entity";
import { ubigeoModuleProviders } from "./composition/container";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UbigeoDepartmentEntity,
      UbigeoProvinceEntity,
      UbigeoDistrictEntity,
    ]),
  ],
  controllers: [UbigeoController],
  providers: [...ubigeoModuleProviders],
})
export class UbigeoModule {}
