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
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";

@Controller("imports")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImportsController {
  constructor(private readonly previewOrdersImport: PreviewOrdersImportUseCase) {}

  @Post("orders/preview")
  @RequirePermissions("sale_orders.import")
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
  @RequirePermissions("sale_orders.import")
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
