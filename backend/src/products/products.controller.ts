import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseArrayPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateProductDto,
  UpdateProductDto,
  UpsertCountertopDto,
  UpsertDrawerDto,
  UpsertExtraDto,
  UpsertFacadeDto,
  UpsertFalseFacadeDto,
  UpsertPartitionDto,
  UpsertSectionDto,
  UpsertShelfDto,
} from './dto/products.dto';
import { ProductsService } from './products.service';

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private svc: ProductsService) {}

  /* ── CRUD ── */

  /** GET /api/products?roomId=xxx */
  @Get()
  findAll(@Query('roomId') roomId: string, @Req() req: any) {
    return this.svc.findAllByRoom(roomId, req.user.id);
  }

  /** GET /api/products/:id */
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.svc.findOne(id, req.user.id);
  }

  /** POST /api/products */
  @Post()
  create(@Body() dto: CreateProductDto, @Req() req: any) {
    return this.svc.create(dto, req.user.id);
  }

  /** PATCH /api/products/:id */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Req() req: any,
  ) {
    return this.svc.update(id, dto, req.user.id);
  }

  /** DELETE /api/products/:id */
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.svc.remove(id, req.user.id);
  }

  /** POST /api/products/:id/copy */
  @Post(':id/copy')
  copy(@Param('id') id: string, @Req() req: any) {
    return this.svc.copy(id, req.user.id);
  }

  /* ── SUB-COMPONENTS ── */

  /** PUT /api/products/:id/sections */
  @Put(':id/sections')
  upsertSections(
    @Param('id') id: string,
    @Body(new ParseArrayPipe({ items: UpsertSectionDto }))
    items: UpsertSectionDto[],
    @Req() req: any,
  ) {
    return this.svc.upsertSections(id, items, req.user.id);
  }

  /** PUT /api/products/:id/partitions */
  @Put(':id/partitions')
  upsertPartitions(
    @Param('id') id: string,
    @Body(new ParseArrayPipe({ items: UpsertPartitionDto }))
    items: UpsertPartitionDto[],
    @Req() req: any,
  ) {
    return this.svc.upsertPartitions(id, items, req.user.id);
  }

  /** PUT /api/products/:id/shelves */
  @Put(':id/shelves')
  upsertShelves(
    @Param('id') id: string,
    @Body(new ParseArrayPipe({ items: UpsertShelfDto }))
    items: UpsertShelfDto[],
    @Req() req: any,
  ) {
    return this.svc.upsertShelves(id, items, req.user.id);
  }

  /** PUT /api/products/:id/facades */
  @Put(':id/facades')
  upsertFacades(
    @Param('id') id: string,
    @Body(new ParseArrayPipe({ items: UpsertFacadeDto }))
    items: UpsertFacadeDto[],
    @Req() req: any,
  ) {
    return this.svc.upsertFacades(id, items, req.user.id);
  }

  /** PUT /api/products/:id/drawers */
  @Put(':id/drawers')
  upsertDrawers(
    @Param('id') id: string,
    @Body(new ParseArrayPipe({ items: UpsertDrawerDto }))
    items: UpsertDrawerDto[],
    @Req() req: any,
  ) {
    return this.svc.upsertDrawers(id, items, req.user.id);
  }

  /** PUT /api/products/:id/false-facades */
  @Put(':id/false-facades')
  upsertFalseFacades(
    @Param('id') id: string,
    @Body(new ParseArrayPipe({ items: UpsertFalseFacadeDto }))
    items: UpsertFalseFacadeDto[],
    @Req() req: any,
  ) {
    return this.svc.upsertFalseFacades(id, items, req.user.id);
  }

  /** PUT /api/products/:id/countertops */
  @Put(':id/countertops')
  upsertCountertops(
    @Param('id') id: string,
    @Body(new ParseArrayPipe({ items: UpsertCountertopDto }))
    items: UpsertCountertopDto[],
    @Req() req: any,
  ) {
    return this.svc.upsertCountertops(id, items, req.user.id);
  }

  /** PUT /api/products/:id/extras */
  @Put(':id/extras')
  upsertExtras(
    @Param('id') id: string,
    @Body(new ParseArrayPipe({ items: UpsertExtraDto }))
    items: UpsertExtraDto[],
    @Req() req: any,
  ) {
    return this.svc.upsertExtras(id, items, req.user.id);
  }
}
