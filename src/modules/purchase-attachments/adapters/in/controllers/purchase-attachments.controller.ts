import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";
import { PurchaseAttachmentType } from "src/modules/purchase-attachments/domain/value-objects/purchase-attachment-type";
import { DeletePurchaseAttachmentUsecase } from "src/modules/purchase-attachments/application/usecases/delete-purchase-attachment.usecase";
import { ListPurchaseAttachmentsUsecase } from "src/modules/purchase-attachments/application/usecases/list-purchase-attachments.usecase";
import { UploadPurchaseAttachmentUsecase } from "src/modules/purchase-attachments/application/usecases/upload-purchase-attachment.usecase";
import { HttpUploadPurchaseAttachmentDto } from "../dtos/http-upload-purchase-attachment.dto";

const allowedMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

@Controller("purchase-attachments")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class PurchaseAttachmentsController {
  constructor(
    private readonly uploadAttachment: UploadPurchaseAttachmentUsecase,
    private readonly listAttachments: ListPurchaseAttachmentsUsecase,
    private readonly deleteAttachment: DeletePurchaseAttachmentUsecase,
  ) {}

  @Post()
  @RequirePermissions("purchases.attach_documents")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return cb(new BadRequestException("Tipo de archivo no permitido."), false);
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @Body() dto: HttpUploadPurchaseAttachmentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string },
  ) {
    const attachment = await this.uploadAttachment.execute(
      {
        purchaseId: dto.purchaseId,
        paymentId: dto.paymentId ?? null,
        receptionId: dto.receptionId ?? null,
        type: dto.type,
        note: dto.note,
        file,
      },
      user.id,
    );
    return { type: "success", message: "Documento subido.", attachment };
  }

  @Get()
  @RequirePermissions("purchases.view_detail")
  list(
    @Query("purchaseId") purchaseId?: string,
    @Query("paymentId") paymentId?: string,
    @Query("receptionId") receptionId?: string,
    @Query("type") type?: PurchaseAttachmentType,
  ) {
    return this.listAttachments.execute({ purchaseId, paymentId, receptionId, type });
  }

  @Delete(":id")
  @RequirePermissions("purchases.delete_documents")
  async remove(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: { id: string }) {
    await this.deleteAttachment.execute(id, user.id);
    return { type: "success", message: "Documento eliminado." };
  }
}

