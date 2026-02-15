import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { CatalogService } from './catalog.service';
import {
  CreateHardwareDto,
  CreateMaterialDto,
  CreateTypeDto,
  UpdateHardwareDto,
  UpdateMaterialDto,
  UpdateServiceTemplateDto,
} from './dto/catalog.dto';

@Controller('catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  /* ═══ ROOM TYPES ═══ */

  @Get('room-types')
  getRoomTypes() {
    return this.catalog.findAllRoomTypes();
  }

  @Post('room-types')
  @Roles(Role.SUPER, Role.ADMIN)
  createRoomType(@Body() dto: CreateTypeDto) {
    return this.catalog.createRoomType(dto);
  }

  @Patch('room-types/:id')
  @Roles(Role.SUPER, Role.ADMIN)
  updateRoomType(@Param('id') id: string, @Body() dto: CreateTypeDto) {
    return this.catalog.updateRoomType(id, dto);
  }

  @Delete('room-types/:id')
  @Roles(Role.SUPER, Role.ADMIN)
  deleteRoomType(@Param('id') id: string) {
    return this.catalog.deleteRoomType(id);
  }

  /* ═══ PRODUCT TYPES ═══ */

  @Get('product-types')
  getProductTypes() {
    return this.catalog.findAllProductTypes();
  }

  @Post('product-types')
  @Roles(Role.SUPER, Role.ADMIN)
  createProductType(@Body() dto: CreateTypeDto) {
    return this.catalog.createProductType(dto);
  }

  @Patch('product-types/:id')
  @Roles(Role.SUPER, Role.ADMIN)
  updateProductType(@Param('id') id: string, @Body() dto: CreateTypeDto) {
    return this.catalog.updateProductType(id, dto);
  }

  @Delete('product-types/:id')
  @Roles(Role.SUPER, Role.ADMIN)
  deleteProductType(@Param('id') id: string) {
    return this.catalog.deleteProductType(id);
  }

  /* ═══ MATERIAL TYPES ═══ */

  @Get('material-types')
  getMaterialTypes() {
    return this.catalog.findAllMaterialTypes();
  }

  @Post('material-types')
  @Roles(Role.SUPER, Role.ADMIN)
  createMaterialType(@Body() dto: CreateTypeDto) {
    return this.catalog.createMaterialType(dto);
  }

  @Patch('material-types/:id')
  @Roles(Role.SUPER, Role.ADMIN)
  updateMaterialType(@Param('id') id: string, @Body() dto: CreateTypeDto) {
    return this.catalog.updateMaterialType(id, dto);
  }

  @Delete('material-types/:id')
  @Roles(Role.SUPER, Role.ADMIN)
  deleteMaterialType(@Param('id') id: string) {
    return this.catalog.deleteMaterialType(id);
  }

  /* ═══ HARDWARE TYPES ═══ */

  @Get('hardware-types')
  getHardwareTypes() {
    return this.catalog.findAllHardwareTypes();
  }

  @Post('hardware-types')
  @Roles(Role.SUPER, Role.ADMIN)
  createHardwareType(@Body() dto: CreateTypeDto) {
    return this.catalog.createHardwareType(dto);
  }

  @Patch('hardware-types/:id')
  @Roles(Role.SUPER, Role.ADMIN)
  updateHardwareType(@Param('id') id: string, @Body() dto: CreateTypeDto) {
    return this.catalog.updateHardwareType(id, dto);
  }

  @Delete('hardware-types/:id')
  @Roles(Role.SUPER, Role.ADMIN)
  deleteHardwareType(@Param('id') id: string) {
    return this.catalog.deleteHardwareType(id);
  }

  /* ═══ MATERIALS ═══ */

  @Get('materials')
  getMaterials() {
    return this.catalog.findAllMaterials();
  }

  @Post('materials')
  @Roles(Role.SUPER, Role.ADMIN)
  createMaterial(@Body() dto: CreateMaterialDto) {
    return this.catalog.createMaterial(dto);
  }

  @Patch('materials/:id')
  @Roles(Role.SUPER, Role.ADMIN)
  updateMaterial(@Param('id') id: string, @Body() dto: UpdateMaterialDto) {
    return this.catalog.updateMaterial(id, dto);
  }

  @Delete('materials/:id')
  @Roles(Role.SUPER, Role.ADMIN)
  deleteMaterial(@Param('id') id: string) {
    return this.catalog.deleteMaterial(id);
  }

  /* ═══ HARDWARE ═══ */

  @Get('hardware')
  getHardware() {
    return this.catalog.findAllHardware();
  }

  @Post('hardware')
  @Roles(Role.SUPER, Role.ADMIN)
  createHardware(@Body() dto: CreateHardwareDto) {
    return this.catalog.createHardware(dto);
  }

  @Patch('hardware/:id')
  @Roles(Role.SUPER, Role.ADMIN)
  updateHardware(@Param('id') id: string, @Body() dto: UpdateHardwareDto) {
    return this.catalog.updateHardware(id, dto);
  }

  @Delete('hardware/:id')
  @Roles(Role.SUPER, Role.ADMIN)
  deleteHardware(@Param('id') id: string) {
    return this.catalog.deleteHardware(id);
  }

  /* ═══ SERVICE TEMPLATE ═══ */

  @Get('service-template')
  @Roles(Role.SUPER, Role.ADMIN)
  getServiceTemplate() {
    return this.catalog.getServiceTemplate();
  }

  @Patch('service-template')
  @Roles(Role.SUPER, Role.ADMIN)
  updateServiceTemplate(@Body() dto: UpdateServiceTemplateDto) {
    return this.catalog.updateServiceTemplate(dto);
  }
}
