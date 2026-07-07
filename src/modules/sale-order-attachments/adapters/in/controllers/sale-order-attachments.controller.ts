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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { CompanyConfiguredGuard } from 'src/shared/utilidades/guards/company-configured.guard';
import { User as CurrentUser } from 'src/shared/utilidades/decorators/user.decorator';
import { DeleteSaleOrderAttachmentUsecase } from '../../../application/usecases/delete-sale-order-attachment.usecase';
import { ListSaleOrderAttachmentsUsecase } from '../../../application/usecases/list-sale-order-attachments.usecase';
import { UploadSaleOrderAttachmentUsecase } from '../../../application/usecases/upload-sale-order-attachment.usecase';
import { SaleOrderAttachmentType } from '../../../domain/value-objects/sale-order-attachment-type';
import { HttpUploadSaleOrderAttachmentDto } from '../dtos/http-upload-sale-order-attachment.dto';

@Controller('sale-order-attachments')
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard)
export class SaleOrderAttachmentsController {
  constructor(
    private readonly uploadAttachment: UploadSaleOrderAttachmentUsecase,
    private readonly listAttachments: ListSaleOrderAttachmentsUsecase,
    private readonly deleteAttachment: DeleteSaleOrderAttachmentUsecase,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Solo se permiten imagenes JPEG, PNG o WEBP',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  upload(
    @Body() dto: HttpUploadSaleOrderAttachmentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string },
  ) {
    return this.uploadAttachment.execute(
      {
        saleOrderId: dto.saleOrderId,
        saleOrderPaymentId: dto.saleOrderPaymentId,
        type: dto.type,
        note: dto.note,
        file,
      },
      user.id,
    );
  }

  @Get()
  list(
    @Query('saleOrderId') saleOrderId?: string,
    @Query('saleOrderPaymentId') saleOrderPaymentId?: string,
    @Query('type') type?: SaleOrderAttachmentType,
  ) {
    return this.listAttachments.execute({
      saleOrderId,
      saleOrderPaymentId,
      type,
    });
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.deleteAttachment.execute(id);
    return { type: 'success', message: 'Adjunto eliminado' };
  }
}
