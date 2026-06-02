import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { PreviewOrdersImportUseCase } from "../../application/preview-orders-import.use-case";
import { User as UserDecorator } from "src/shared/utilidades/decorators";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";

@Controller("imports")
@UseGuards(JwtAuthGuard)
export class ImportsController {
  constructor(private readonly previewOrdersImport: PreviewOrdersImportUseCase) {}

  @Post("orders/preview")
  @UseInterceptors(FileInterceptor("file"))
  previewOrders(
    @UploadedFile() file: Express.Multer.File,
    @UserDecorator() user: { id: string; sessionId?: string },
  ) {
    if (!file) {
      throw new BadRequestException("El archivo es obligatorio");
    }

    if (!file.originalname.toLowerCase().endsWith(".xlsx")) {
      throw new BadRequestException("Solo se permiten archivos .xlsx");
    }

    return this.previewOrdersImport.execute(file, user.id);
  }

  @Post("orders/create")
  @UseInterceptors(FileInterceptor("file"))
  createOrders(
    @UploadedFile() file: Express.Multer.File,
    @UserDecorator() user: { id: string; sessionId?: string },
  ) {
    if (!file) {
      throw new BadRequestException("El archivo es obligatorio");
    }

    if (!file.originalname.toLowerCase().endsWith(".xlsx")) {
      throw new BadRequestException("Solo se permiten archivos .xlsx");
    }

    return this.previewOrdersImport.createClientsFromPreview(file, user.id);
  }
}