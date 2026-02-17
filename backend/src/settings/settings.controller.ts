import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateContactDto,
  SavePaymentStagesDto,
  UpdateContactDto,
  UpdateUserHardwarePriceDto,
  UpdateUserMaterialPriceDto,
  UpdateUserServiceDto,
  UpsertCompanyInfoDto,
} from './dto/settings.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  /* ═══ USER MATERIALS ═══ */

  @Get('materials')
  getUserMaterials(@Request() req: any) {
    return this.settings.getUserMaterials(req.user.id);
  }

  @Patch('materials/:materialId')
  updateUserMaterialPrice(
    @Request() req: any,
    @Param('materialId') materialId: string,
    @Body() dto: UpdateUserMaterialPriceDto,
  ) {
    return this.settings.updateUserMaterialPrice(
      req.user.id,
      materialId,
      dto.price,
    );
  }

  /* ═══ USER HARDWARE ═══ */

  @Get('hardware')
  getUserHardware(@Request() req: any) {
    return this.settings.getUserHardware(req.user.id);
  }

  @Patch('hardware/:hardwareId')
  updateUserHardwarePrice(
    @Request() req: any,
    @Param('hardwareId') hardwareId: string,
    @Body() dto: UpdateUserHardwarePriceDto,
  ) {
    return this.settings.updateUserHardwarePrice(
      req.user.id,
      hardwareId,
      dto.price,
    );
  }

  /* ═══ USER SERVICE ═══ */

  @Get('service')
  getUserService(@Request() req: any) {
    return this.settings.getUserService(req.user.id);
  }

  @Patch('service')
  updateUserService(@Request() req: any, @Body() dto: UpdateUserServiceDto) {
    return this.settings.updateUserService(req.user.id, dto);
  }

  /* ═══ SYNC CATALOG ═══ */

  @Post('sync')
  syncCatalog(@Request() req: any) {
    return this.settings.syncCatalog(req.user.id);
  }

  /* ═══ COMPANY INFO ═══ */

  @Get('company')
  getCompanyInfo(@Request() req: any) {
    return this.settings.getCompanyInfo(req.user.id);
  }

  @Put('company')
  upsertCompanyInfo(@Request() req: any, @Body() dto: UpsertCompanyInfoDto) {
    return this.settings.upsertCompanyInfo(req.user.id, dto);
  }

  /* ═══ PAYMENT STAGES ═══ */

  @Get('payment-stages')
  getPaymentStages(@Request() req: any) {
    return this.settings.getPaymentStages(req.user.id);
  }

  @Put('payment-stages')
  savePaymentStages(@Request() req: any, @Body() dto: SavePaymentStagesDto) {
    return this.settings.savePaymentStages(req.user.id, dto.stages);
  }

  /* ═══ CONTACTS ═══ */

  @Get('contacts')
  getContacts(@Request() req: any) {
    return this.settings.getContacts(req.user.id);
  }

  @Post('contacts')
  createContact(@Request() req: any, @Body() dto: CreateContactDto) {
    return this.settings.createContact(req.user.id, dto);
  }

  @Put('contacts/:id')
  updateContact(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.settings.updateContact(req.user.id, id, dto);
  }

  @Delete('contacts/:id')
  deleteContact(@Request() req: any, @Param('id') id: string) {
    return this.settings.deleteContact(req.user.id, id);
  }
}
