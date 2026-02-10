import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { User as CurrentUser } from 'src/shared/utilidades/decorators/user.decorator';
import { CreateDocumentUseCase } from 'src/modules/inventory/application/use-cases/document-inventory/create-document.usecase';
import { AddItemUseCase } from 'src/modules/inventory/application/use-cases/document-inventory/add-item.usecase';
import { PostDocumentUseCase } from 'src/modules/inventory/application/use-cases/document-inventory/post-document.usecase';
import { ListDocumentsUseCase } from 'src/modules/inventory/application/use-cases/document-inventory/list-documents.usecase';
import { GetDocumentUseCase } from 'src/modules/inventory/application/use-cases/document-inventory/get-document.usecase';
import { ListDocumentItemsUseCase } from 'src/modules/inventory/application/use-cases/document-inventory/list-items.usecase';
import { UpdateItemUseCase } from 'src/modules/inventory/application/use-cases/document-inventory/update-item.usecase';
import { RemoveItemUseCase } from 'src/modules/inventory/application/use-cases/document-inventory/remove-item.usecase';
import { CancelDocumentUseCase } from 'src/modules/inventory/application/use-cases/document-inventory/cancel-document.usecase';
import { HttpCreateDocumentDto } from '../dto/http-create-document.dto';
import { HttpAddItemDto } from '../dto/http-add-item.dto';
import { HttpPostDto } from '../dto/http-post.dto';
import { HttpUpdateItemDto } from '../dto/http-update-item.dto';
import { DocStatus } from 'src/modules/inventory/domain/value-objects/doc-status';
import { DocType } from 'src/modules/inventory/domain/value-objects/doc-type';
import { PostDocumentoOut } from 'src/modules/inventory/application/use-cases/document-inventory/post-document-out.usecase';
import { PostDocumentoIn } from 'src/modules/inventory/application/use-cases/document-inventory/post-document-in.usecase';
import { PostDocumentoTransfer } from 'src/modules/inventory/application/use-cases/document-inventory/post-document-transfer.usecase';
import { PostDocumentoAdjustment } from 'src/modules/inventory/application/use-cases/document-inventory/post-document-adjustment.usecase';

@Controller('inventory/documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly createDocument: CreateDocumentUseCase,
    private readonly addItem: AddItemUseCase,
    private readonly postDocument: PostDocumentUseCase,
    private readonly listDocuments: ListDocumentsUseCase,
    private readonly getDocument: GetDocumentUseCase,
    private readonly listItems: ListDocumentItemsUseCase,
    private readonly updateItem: UpdateItemUseCase,
    private readonly removeItem: RemoveItemUseCase,
    private readonly cancelDocument: CancelDocumentUseCase,
    private readonly postDocumentOut: PostDocumentoOut,
    private readonly postDocumentIn: PostDocumentoIn,
    private readonly postDocumentTransfer: PostDocumentoTransfer,
    private readonly postDocumentAdjustment: PostDocumentoAdjustment,
  ) {}

  @Get()
  list(
    @Query('status') status?: DocStatus,
    @Query('docType') docType?: DocType,
    @Query('warehouseId') warehouseId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?:string
  ) {
    return this.listDocuments.execute({
      status,
      docType,
      warehouseId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  get(@Param('id') docId: string) {
    return this.getDocument.execute({ docId });
  }

  @Get(':id/items')
  getItems(@Param('id') docId: string) {
    return this.listItems.execute({ docId });
  }

  @Post()
  create(@Body() dto: HttpCreateDocumentDto, @CurrentUser() user: { id: string }) {
    return this.createDocument.execute({
      ...dto,
      createdBy: user.id,
    });
  }

  @Post(':id/items')
  add(@Param('id') docId: string, @Body() dto: HttpAddItemDto) {
    return this.addItem.execute({
      ...dto,
      docId,
    });
  }

  @Patch(':id/items/:itemId')
  update(
    @Param('id') docId: string,
    @Param('itemId') itemId: string,
    @Body() dto: HttpUpdateItemDto,
  ) {
    return this.updateItem.execute({
      docId,
      itemId,
      ...dto,
    });
  }

  @Delete(':id/items/:itemId')
  remove(@Param('id') docId: string, @Param('itemId') itemId: string) {
    return this.removeItem.execute({
      docId,
      itemId,
    });
  }

  // @Post(':id/post')
  // post(@Param('id') docId: string, @Body() _dto: HttpPostDto, @CurrentUser() user: { id: string }) {
  //   return this.postDocument.execute({
  //     docId,
  //     postedBy: user.id,
  //   });

  // }

  @Post(':id/post-out')
  postOut(@Param('id') docId: string, @Body() _dto: HttpPostDto, @CurrentUser() user: { id: string }) {
    return this.postDocumentOut.execute({
      docId,
      postedBy: user.id,
    });
  }
  @Post(':id/post-in')
  postIn(@Param('id') docId: string, @Body() _dto: HttpPostDto, @CurrentUser() user: { id: string }) {
    return this.postDocumentIn.execute({
      docId,
      postedBy: user.id,
    });
  }
  @Post(':id/post-adjustment')
  postAdjustment(@Param('id') docId: string, @Body() _dto: HttpPostDto, @CurrentUser() user: { id: string }) {
    return this.postDocumentAdjustment.execute({
      docId,
      postedBy: user.id,
    });
  }
  @Post(':id/post-transfer')
  postTransfer(@Param('id') docId: string, @Body() _dto: HttpPostDto, @CurrentUser() user: { id: string }) {
    return this.postDocumentTransfer.execute({
      docId,
      postedBy: user.id,
    });
  }

  @Post(':id/cancel')
  cancel(@Param('id') docId: string) {
    return this.cancelDocument.execute({
      docId,
    });
  }
}
