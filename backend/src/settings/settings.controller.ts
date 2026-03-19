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
  CreateCustomHardwareDto,
  CreateCustomMaterialDto,
  SavePaymentStagesDto,
  SaveTierPreferencesDto,
  UpdateContactDto,
  UpdateCustomMaterialDto,
  UpdateUserDefaultsDto,
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
    return this.settings.updateUserMaterialPrice(req.user.id, materialId, dto);
  }

  @Post('materials/custom')
  createCustomMaterial(
    @Request() req: any,
    @Body() dto: CreateCustomMaterialDto,
  ) {
    return this.settings.createCustomMaterial(req.user.id, dto);
  }

  @Delete('materials/custom/:materialId')
  deleteCustomMaterial(
    @Request() req: any,
    @Param('materialId') materialId: string,
  ) {
    return this.settings.deleteCustomMaterial(req.user.id, materialId);
  }

  @Patch('materials/custom/:materialId')
  updateCustomMaterial(
    @Request() req: any,
    @Param('materialId') materialId: string,
    @Body() dto: UpdateCustomMaterialDto,
  ) {
    return this.settings.updateCustomMaterial(req.user.id, materialId, dto);
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
    return this.settings.updateUserHardwarePrice(req.user.id, hardwareId, dto);
  }

  @Post('hardware/custom')
  createCustomHardware(
    @Request() req: any,
    @Body() dto: CreateCustomHardwareDto,
  ) {
    return this.settings.createCustomHardware(req.user.id, dto);
  }

  @Delete('hardware/custom/:hardwareId')
  deleteCustomHardware(
    @Request() req: any,
    @Param('hardwareId') hardwareId: string,
  ) {
    return this.settings.deleteCustomHardware(req.user.id, hardwareId);
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

  /* ═══ USER DEFAULTS ═══ */

  @Get('defaults')
  getUserDefaults(@Request() req: any) {
    return this.settings.getUserDefaults(req.user.id);
  }

  @Patch('defaults')
  updateUserDefaults(@Request() req: any, @Body() dto: UpdateUserDefaultsDto) {
    return this.settings.updateUserDefaults(
      req.user.id,
      dto as unknown as Record<string, string | undefined>,
    );
  }

  /* ═══ TIER PREFERENCES ═══ */

  @Get('tier-preferences')
  getTierPreferences(@Request() req: any) {
    return this.settings.getTierPreferences(req.user.id);
  }

  @Put('tier-preferences')
  saveTierPreferences(
    @Request() req: any,
    @Body() dto: SaveTierPreferencesDto,
  ) {
    return this.settings.saveTierPreferences(req.user.id, dto.items);
  }
}
