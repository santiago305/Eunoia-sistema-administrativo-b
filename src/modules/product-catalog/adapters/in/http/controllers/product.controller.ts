  import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
  import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
  import { CreateProductCatalogProduct } from "src/modules/product-catalog/application/usecases/create-product.usecase";
  import { GetProductCatalogProduct } from "src/modules/product-catalog/application/usecases/get-product.usecase";
  import { ListProductCatalogProducts } from "src/modules/product-catalog/application/usecases/list-products.usecase";
  import { UpdateProductCatalogProduct } from "src/modules/product-catalog/application/usecases/update-product.usecase";
  import { CreateProductCatalogProductDto } from "../dtos/create-product.dto";
  import { ListProductCatalogProductsDto } from "../dtos/list-products.dto";
  import { UpdateProductCatalogProductDto } from "../dtos/update-product.dto";

  @Controller("products")
  @UseGuards(JwtAuthGuard)
  export class ProductCatalogProductController {
    constructor(
      private readonly createProduct: CreateProductCatalogProduct,
      private readonly updateProduct: UpdateProductCatalogProduct,
      private readonly listProducts: ListProductCatalogProducts,
      private readonly getProduct: GetProductCatalogProduct,
    ) {}

    @Post()
    create(@Body() dto: CreateProductCatalogProductDto) {
      return this.createProduct.execute(dto);
    }

    @Get()
    list(@Query() query: ListProductCatalogProductsDto) {
      return this.listProducts.execute({
        q: query.q,
        type: query.type,
        isActive: query.isActive === undefined ? undefined : query.isActive === "true",
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 10,
      });
    }

    @Get(":id")
    getById(@Param("id", ParseUUIDPipe) id: string) {
      return this.getProduct.execute(id);
    }

    @Patch(":id")
    update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateProductCatalogProductDto) {
      return this.updateProduct.execute(id, dto);
    }

    
  }
