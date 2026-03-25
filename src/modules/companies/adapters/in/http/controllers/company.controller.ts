import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

import { CreateCompanyUsecase } from "src/modules/companies/application/usecases/create.usecase";
import { GetCompanyUsecase } from "src/modules/companies/application/usecases/get.usecase";
import { UpdateCompanyUsecase } from "src/modules/companies/application/usecases/update.usecase";
import { UpdateCompanyLogoUsecase } from "src/modules/companies/application/usecases/update-logo.usecase";
import { UpdateCompanyCertUsecase } from "src/modules/companies/application/usecases/update-cert.usecase";

import { HttpCreateCompanyDto } from "../dtos/http-company-create.dto";
import { HttpUpdateCompanyDto } from "../dtos/http-company-update.dto";
import { CompanyHttpMapper } from "../mappers/company-http.mapper";

@Controller("company")
export class CompanyController {
  constructor(
    private readonly createCompanyUsecase: CreateCompanyUsecase,
    private readonly getCompanyUsecase: GetCompanyUsecase,
    private readonly updateCompanyUsecase: UpdateCompanyUsecase,
    private readonly updateCompanyLogoUsecase: UpdateCompanyLogoUsecase,
    private readonly updateCompanyCertUsecase: UpdateCompanyCertUsecase,
  ) {}

  @Post()
  async create(@Body() dto: HttpCreateCompanyDto) {
    return this.createCompanyUsecase.execute(
      CompanyHttpMapper.toCreateInput(dto),
    );
  }

  @Get()
  async get() {
    return this.getCompanyUsecase.execute();
  }

  @Patch()
  async update(@Body() dto: HttpUpdateCompanyDto) {
    return this.updateCompanyUsecase.execute(
      CompanyHttpMapper.toUpdateInput(dto),
    );
  }

  @Patch("logo")
  @UseInterceptors(FileInterceptor("file"))
  async updateLogo(@UploadedFile() file: Express.Multer.File) {
    return this.updateCompanyLogoUsecase.execute(file.path);
  }

  @Patch("cert")
  @UseInterceptors(FileInterceptor("file"))
  async updateCert(@UploadedFile() file: Express.Multer.File) {
    return this.updateCompanyCertUsecase.execute(file.path);
  }
}