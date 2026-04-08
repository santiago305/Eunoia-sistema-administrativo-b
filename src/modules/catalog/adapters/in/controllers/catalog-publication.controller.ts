import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { ListChannelCatalogItems } from 'src/modules/catalog/application/usecases/catalog-publication/list-channel-items.usecase';
import { CreateCatalogPublication } from 'src/modules/catalog/application/usecases/catalog-publication/create.usecase';
import { UpdateCatalogPublication } from 'src/modules/catalog/application/usecases/catalog-publication/update.usecase';
import { ListChannelCatalogItemsQueryDto } from '../dtos/catalog-publications/http-list-channel-catalog-items.dto';
import { HttpCreateCatalogPublicationDto } from '../dtos/catalog-publications/http-create-catalog-publication.dto';
import { HttpUpdateCatalogPublicationDto } from '../dtos/catalog-publications/http-update-catalog-publication.dto';

@Controller('catalog/channels')
@UseGuards(JwtAuthGuard)
export class CatalogPublicationController {
  constructor(
    private readonly createPublication: CreateCatalogPublication,
    private readonly updatePublication: UpdateCatalogPublication,
    private readonly listChannelItems: ListChannelCatalogItems,
  ) {}

  @Post('items')
  create(@Body() dto: HttpCreateCatalogPublicationDto) {
    return this.createPublication.execute(dto);
  }

  @Get(':channelCode/items')
  list(@Param('channelCode') channelCode: string, @Query() query: ListChannelCatalogItemsQueryDto) {
    const isActive = query.isActive === undefined ? undefined : query.isActive === 'true';

    return this.listChannelItems.execute({
      channelCode,
      page: query.page,
      limit: query.limit,
      isActive,
      type: query.type,
      q: query.q,
    });
  }

  @Patch('items/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HttpUpdateCatalogPublicationDto,
  ) {
    return this.updatePublication.execute({
      id,
      isVisible: dto.isVisible,
      sortOrder: dto.sortOrder,
      priceOverride: dto.priceOverride,
      displayNameOverride: dto.displayNameOverride,
    });
  }
}
