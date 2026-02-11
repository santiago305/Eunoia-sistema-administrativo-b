import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { User as CurrentUser } from 'src/shared/utilidades/decorators/user.decorator';
import { CreateDocumentUseCase } from 'src/modules/inventory/application/use-cases/document-inventory/create-document.usecase';
import { AddItemUseCase } from 'src/modules/inventory/application/use-cases/document-item-inventory/add-item.usecase';
import { ListDocumentsUseCase } from 'src/modules/inventory/application/use-cases/document-inventory/list-documents.usecase';
import { GetDocumentUseCase } from 'src/modules/inventory/application/use-cases/document-inventory/get-document.usecase';
import { ListDocumentItemsUseCase } from 'src/modules/inventory/application/use-cases/document-item-inventory/list-items.usecase';
import { UpdateItemUseCase } from 'src/modules/inventory/application/use-cases/document-item-inventory/update-item.usecase';
import { RemoveItemUseCase } from 'src/modules/inventory/application/use-cases/document-item-inventory/remove-item.usecase';
import { CancelDocumentUseCase } from 'src/modules/inventory/application/use-cases/document-inventory/cancel-document.usecase';
import { HttpCreateDocumentDto } from '../dto/document/http-document-create.dto';
import { HttpAddItemDto } from '../dto/document-item/http-document-add-item.dto';
import { HttpPostDto } from '../dto/document-item/http-post.dto';
import { HttpUpdateItemDto } from '../dto/document-item/http-item-update.dto';
import { PostDocumentoOut } from 'src/modules/inventory/application/use-cases/document-inventory/post-document-out.usecase';
import { PostDocumentoIn } from 'src/modules/inventory/application/use-cases/document-inventory/post-document-in.usecase';
import { PostDocumentoTransfer } from 'src/modules/inventory/application/use-cases/document-inventory/post-document-transfer.usecase';
import { PostDocumentoAdjustment } from 'src/modules/inventory/application/use-cases/document-inventory/post-document-adjustment.usecase';
import { ListDocumentsQueryDto } from '../dto/document/http-documents-list.dto';

@Controller('inventory/documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly createDocument: CreateDocumentUseCase,
    private readonly addItem: AddItemUseCase,
    // private readonly postDocument: PostDocumentUseCase,
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
  list(@Query() query: ListDocumentsQueryDto) {
    return this.listDocuments.execute({
      status: query.status,
      docType: query.docType,
      warehouseId: query.warehouseId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) docId: string) {
    return this.getDocument.execute({ docId });
  }

  @Get(':id/items')
  getItems(@Param('id', ParseUUIDPipe) docId: string) {
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
  add(@Param('id', ParseUUIDPipe) docId: string, @Body() dto: HttpAddItemDto) {
    return this.addItem.execute({
      ...dto,
      docId,
    });
  }

  @Patch(':id/items/:itemId')
  update(
    @Param('id', ParseUUIDPipe) docId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: HttpUpdateItemDto,
  ) {
    return this.updateItem.execute({
      docId,
      itemId,
      ...dto,
    });
  }

  @Delete(':id/items/:itemId')
  remove(@Param('id', ParseUUIDPipe) docId: string, @Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.removeItem.execute({
      docId,
      itemId,
    });
  }

  @Post(':id/post-out')
  postOut(@Param('id', ParseUUIDPipe) docId: string, @Body() dto: HttpPostDto, @CurrentUser() user: { id: string }) {
    return this.postDocumentOut.execute({
      docId,
      postedBy: user.id,
      note: dto.note
    });
  }
  @Post(':id/post-in')
  postIn(@Param('id', ParseUUIDPipe) docId: string, @Body() dto: HttpPostDto, @CurrentUser() user: { id: string }) {
    return this.postDocumentIn.execute({
      docId,
      postedBy: user.id,
      note: dto.note
    });
  }
  @Post(':id/post-adjustment')
  postAdjustment(@Param('id', ParseUUIDPipe) docId: string, @Body() dto: HttpPostDto, @CurrentUser() user: { id: string }) {
    return this.postDocumentAdjustment.execute({
      docId,
      postedBy: user.id,
      note: dto.note
    });
  }
  @Post(':id/post-transfer')
  postTransfer(@Param('id', ParseUUIDPipe) docId: string, @Body() dto: HttpPostDto, @CurrentUser() user: { id: string }) {
    return this.postDocumentTransfer.execute({
      docId,
      postedBy: user.id,
      note: dto.note
    });
  }
  
  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) docId: string, @Body() dto: HttpPostDto, @CurrentUser() user: { id: string }) {
    return this.cancelDocument.execute({
      docId,
      postedBy: user.id,
      note: dto.note
    });
  }
}
