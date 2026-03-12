import {
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Inject,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CsrfGuard } from "src/shared/utilidades/guards/csrf.guard";
import { CreateCompanyUsecase } from "src/modules/companies/application/usecases/company/create.usecase";
import { UpdateCompanyUsecase } from "src/modules/companies/application/usecases/company/update.usecase";
import { GetCompanyUsecase } from "src/modules/companies/application/usecases/company/get.usecase";
import { UpdateCompanyLogoUsecase } from "src/modules/companies/application/usecases/company/update-logo.usecase";
import { UpdateCompanyCertUsecase } from "src/modules/companies/application/usecases/company/update-cert.usecase";
import { HttpCreateCompanyDto } from "../dtos/company/http-company-create.dto";
import { HttpUpdateCompanyDto } from "../dtos/company/http-company-update.dto";
import { IMAGE_PROCESSOR, ImageProcessor } from "src/shared/application/ports/image-processor.port";
import { FILE_STORAGE, FileStorage } from "src/shared/application/ports/file-storage.port";
import { ImageProcessingError } from "src/shared/application/errors/image-processing.error";
import {
  FileStorageConflictError,
  InvalidFileStoragePathError,
} from "src/shared/application/errors/file-storage.errors";

@Controller("company")
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(
    private readonly createCompany: CreateCompanyUsecase,
    private readonly updateCompany: UpdateCompanyUsecase,
    private readonly getCompany: GetCompanyUsecase,
    private readonly updateCompanyLogo: UpdateCompanyLogoUsecase,
    private readonly updateCompanyCert: UpdateCompanyCertUsecase,
    @Inject(IMAGE_PROCESSOR)
    private readonly imageProcessor: ImageProcessor,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: FileStorage,
  ) {}

  @Post()
  @UseGuards(CsrfGuard)
  create(@Body() dto: HttpCreateCompanyDto) {
    return this.createCompany.execute(dto);
  }

  @Patch()
  @UseGuards(CsrfGuard)
  update(@Body() dto: HttpUpdateCompanyDto) {
    return this.updateCompany.execute(dto);
  }

  @Get()
  get() {
    return this.getCompany.execute();
  }

  @Post("logo")
  @UseGuards(CsrfGuard)
  @UseInterceptors(
    FileInterceptor("logo", {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowed.includes(file.mimetype)) {
          return cb(new BadRequestException("Solo se permiten imagenes JPG/PNG/WEBP/GIF"), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BadRequestException("Debes enviar un archivo de logo");
    }

    let savedRelativePath: string | null = null;
    try {
      savedRelativePath = await this.processAndSaveImage(file, "company-logo");
      return await this.updateCompanyLogo.execute(savedRelativePath);
    } catch (error) {
      await this.tryCleanupFile(savedRelativePath);
      this.handleFileErrors(error, "logo");
    }
  }

  @Post("cert")
  @UseGuards(CsrfGuard)
  @UseInterceptors(
    FileInterceptor("cert", {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowedExts = [".pem", ".pfx", ".p12", ".cer"];
        const ext = (() => {
          const name = file.originalname ?? "";
          const idx = name.lastIndexOf(".");
          return idx === -1 ? "" : name.slice(idx).toLowerCase();
        })();
        if (!ext || !allowedExts.includes(ext)) {
          return cb(new BadRequestException("Solo se permiten archivos PEM/PFX/P12/CER"), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadCert(@UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer) {
      throw new BadRequestException("Debes enviar un archivo de certificado");
    }

    let savedRelativePath: string | null = null;
    try {
      savedRelativePath = await this.saveCertFile(file);
      return await this.updateCompanyCert.execute(savedRelativePath);
    } catch (error) {
      await this.tryCleanupFile(savedRelativePath);
      this.handleFileErrors(error, "certificado");
    }
  }

  private async processAndSaveImage(file: Express.Multer.File, filenamePrefix: string) {
    const processed = await this.imageProcessor.toWebp({
      buffer: file.buffer,
      maxWidth: 512,
      maxHeight: 512,
      quality: 80,
      maxInputBytes: 50 * 1024 * 1024,
      maxInputPixels: 20_000_000,
      maxOutputBytes: 1 * 1024 * 1024,
    });

    const { relativePath } = await this.fileStorage.save({
      directory: "company",
      buffer: processed.buffer,
      extension: processed.extension,
      filenamePrefix,
    });

    return relativePath;
  }

  private async saveCertFile(file: Express.Multer.File) {
    const allowedExts = [".pem", ".pfx", ".p12", ".cer"];
    const ext = this.getLowerExt(file.originalname);
    if (!ext || !allowedExts.includes(ext)) {
      throw new BadRequestException("Solo se permiten archivos PEM/PFX/P12/CER");
    }

    const { relativePath } = await this.fileStorage.save({
      directory: "company",
      buffer: file.buffer,
      extension: ext.replace(".", ""),
      filenamePrefix: "company-cert",
    });

    return relativePath;
  }

  private getLowerExt(filename?: string) {
    if (!filename) return "";
    const idx = filename.lastIndexOf(".");
    if (idx === -1) return "";
    return filename.slice(idx).toLowerCase();
  }

  private async tryCleanupFile(path: string | null) {
    if (!path) return;
    try {
      await this.fileStorage.delete(path);
    } catch (cleanupError) {
      console.error("[CompanyController] No se pudo limpiar archivo temporal tras error:", cleanupError);
    }
  }

  private handleFileErrors(error: unknown, label: string): never {
    if (error instanceof ImageProcessingError || error instanceof InvalidFileStoragePathError) {
      throw new BadRequestException(error.message);
    }
    if (error instanceof FileStorageConflictError) {
      throw new ConflictException(error.message);
    }

    if (error instanceof Error) {
      console.error(`[CompanyController] Error al subir ${label}:`, error);
    }
    throw error;
  }
}
