import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CsrfGuard } from "src/shared/utilidades/guards/csrf.guard";
import { CreateCompanyUsecase } from "src/modules/companies/application/usecases/create.usecase";
import { GetCompanyUsecase } from "src/modules/companies/application/usecases/get.usecase";
import { GetCompanyBrandingUsecase } from "src/modules/companies/application/usecases/get-branding.usecase";
import { UpdateCompanyUsecase } from "src/modules/companies/application/usecases/update.usecase";
import { UpdateCompanyLogoUsecase } from "src/modules/companies/application/usecases/update-logo.usecase";
import { UpdateCompanyIsotypeUsecase } from "src/modules/companies/application/usecases/update-isotype.usecase";
import { UpdateCompanyCertUsecase } from "src/modules/companies/application/usecases/update-cert.usecase";
import { FILE_STORAGE, FileStorage } from "src/shared/application/ports/file-storage.port";
import { IMAGE_PROCESSOR, ImageProcessor } from "src/shared/application/ports/image-processor.port";
import { ImageProcessingError } from "src/shared/application/errors/image-processing.error";
import {
  FileStorageConflictError,
  InvalidFileStoragePathError,
} from "src/shared/application/errors/file-storage.errors";

import { HttpCreateCompanyDto } from "../dtos/http-company-create.dto";
import { HttpUpdateCompanyDto } from "../dtos/http-company-update.dto";
import { CompanyHttpMapper } from "../mappers/company-http.mapper";

@Controller("company")
export class CompanyController {
  constructor(
    private readonly createCompanyUsecase: CreateCompanyUsecase,
    private readonly getCompanyUsecase: GetCompanyUsecase,
    private readonly getCompanyBrandingUsecase: GetCompanyBrandingUsecase,
    private readonly updateCompanyUsecase: UpdateCompanyUsecase,
    private readonly updateCompanyLogoUsecase: UpdateCompanyLogoUsecase,
    private readonly updateCompanyIsotypeUsecase: UpdateCompanyIsotypeUsecase,
    private readonly updateCompanyCertUsecase: UpdateCompanyCertUsecase,
    @Inject(IMAGE_PROCESSOR)
    private readonly imageProcessor: ImageProcessor,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: FileStorage,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseGuards(CsrfGuard)
  async create(@Body() dto: HttpCreateCompanyDto) {
    return this.createCompanyUsecase.execute(
      CompanyHttpMapper.toCreateInput(dto),
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async get() {
    return this.getCompanyUsecase.execute();
  }

  @Get("branding")
  async getBranding() {
    return this.getCompanyBrandingUsecase.execute();
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @UseGuards(CsrfGuard)
  async update(@Body() dto: HttpUpdateCompanyDto) {
    return this.updateCompanyUsecase.execute(
      CompanyHttpMapper.toUpdateInput(dto),
    );
  }

  @Patch("logo")
  @UseGuards(JwtAuthGuard)
  @UseGuards(CsrfGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ["image/png", "image/svg+xml"];
        if (!allowed.includes(file.mimetype)) {
          return cb(new BadRequestException("Solo se permiten imagenes PNG o SVG"), false);
        }
        cb(null, true);
      },
    }),
  )
  async updateLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BadRequestException("Debes enviar un archivo de logo");
    }

    try {
      const isSvg = file.mimetype === "image/svg+xml";

      const logoFile = isSvg
        ? { buffer: file.buffer, extension: "svg" }
        : await this.imageProcessor.toWebp({
            buffer: file.buffer,
            maxWidth: 512,
            maxHeight: 512,
            quality: 80,
            maxInputBytes: 10 * 1024 * 1024,
            maxInputPixels: 20_000_000,
            maxOutputBytes: 1 * 1024 * 1024,
          });

      const { relativePath } = await this.fileStorage.save({
        directory: "company",
        buffer: logoFile.buffer,
        extension: logoFile.extension,
        filenamePrefix: "logo",
      });

      return this.updateCompanyLogoUsecase.execute(relativePath);
    } catch (error) {
      if (
        error instanceof ImageProcessingError ||
        error instanceof InvalidFileStoragePathError
      ) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof FileStorageConflictError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }

  @Patch("isotype")
  @UseGuards(JwtAuthGuard)
  @UseGuards(CsrfGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ["image/png", "image/svg+xml"];
        if (!allowed.includes(file.mimetype)) {
          return cb(new BadRequestException("Solo se permiten imagenes PNG o SVG"), false);
        }
        cb(null, true);
      },
    }),
  )
  async updateIsotype(@UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BadRequestException("Debes enviar un archivo de isotipo");
    }

    try {
      const isSvg = file.mimetype === "image/svg+xml";

      const isotypeFile = isSvg
        ? { buffer: file.buffer, extension: "svg" }
        : await this.imageProcessor.toWebp({
            buffer: file.buffer,
            maxWidth: 512,
            maxHeight: 512,
            quality: 80,
            maxInputBytes: 10 * 1024 * 1024,
            maxInputPixels: 20_000_000,
            maxOutputBytes: 1 * 1024 * 1024,
          });

      const { relativePath } = await this.fileStorage.save({
        directory: "company",
        buffer: isotypeFile.buffer,
        extension: isotypeFile.extension,
        filenamePrefix: "isotype",
      });

      return this.updateCompanyIsotypeUsecase.execute(relativePath);
    } catch (error) {
      if (
        error instanceof ImageProcessingError ||
        error instanceof InvalidFileStoragePathError
      ) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof FileStorageConflictError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }

  @Patch("cert")
  @UseGuards(JwtAuthGuard)
  @UseGuards(CsrfGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async updateCert(@UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BadRequestException("Debes enviar un archivo de certificado");
    }

    const extension = this.resolveCertExtension(file.originalname);
    if (!extension) {
      throw new BadRequestException("Formato de certificado no permitido");
    }

    try {
      const { relativePath } = await this.fileStorage.save({
        directory: "company",
        buffer: file.buffer,
        extension,
        filenamePrefix: "cert",
      });

      return this.updateCompanyCertUsecase.execute(relativePath);
    } catch (error) {
      if (error instanceof InvalidFileStoragePathError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof FileStorageConflictError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }

  private resolveCertExtension(filename?: string) {
    const extension = (filename?.split(".").pop() ?? "").trim().toLowerCase();
    const allowed = new Set(["pfx", "p12", "pem", "crt", "cer"]);
    return allowed.has(extension) ? extension : null;
  }
}
