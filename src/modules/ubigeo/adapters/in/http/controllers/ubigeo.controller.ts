import { Controller, Get, Param, Query } from "@nestjs/common";
import { GetUbigeoByCodeUsecase } from "src/modules/ubigeo/application/usecases/get-ubigeo-by-code.usecase";
import { GetUbigeoCatalogUsecase } from "src/modules/ubigeo/application/usecases/get-ubigeo-catalog.usecase";
import { ListDepartmentsUsecase } from "src/modules/ubigeo/application/usecases/list-departments.usecase";
import { ListDistrictsUsecase } from "src/modules/ubigeo/application/usecases/list-districts.usecase";
import { ListProvincesUsecase } from "src/modules/ubigeo/application/usecases/list-provinces.usecase";
import { ListUbigeoDistrictsQueryDto } from "../dtos/list-ubigeo-districts.query.dto";
import { ListUbigeoProvincesQueryDto } from "../dtos/list-ubigeo-provinces.query.dto";

@Controller("ubigeo")
export class UbigeoController {
  constructor(
    private readonly getUbigeoCatalog: GetUbigeoCatalogUsecase,
    private readonly listDepartments: ListDepartmentsUsecase,
    private readonly listProvinces: ListProvincesUsecase,
    private readonly listDistricts: ListDistrictsUsecase,
    private readonly getUbigeoByCode: GetUbigeoByCodeUsecase,
  ) {}

  @Get()
  getCatalog() {
    return this.getUbigeoCatalog.execute();
  }

  @Get("departments")
  getDepartments() {
    return this.listDepartments.execute();
  }

  @Get("provinces")
  getProvinces(@Query() query: ListUbigeoProvincesQueryDto) {
    return this.listProvinces.execute(query);
  }

  @Get("districts")
  getDistricts(@Query() query: ListUbigeoDistrictsQueryDto) {
    return this.listDistricts.execute(query);
  }

  @Get("by-code/:code")
  getByCode(@Param("code") code: string) {
    return this.getUbigeoByCode.execute(code);
  }
}
