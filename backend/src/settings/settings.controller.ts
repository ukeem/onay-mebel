import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
    UpdateUserHardwarePriceDto,
    UpdateUserMaterialPriceDto,
    UpdateUserServiceDto,
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
    return this.settings.updateUserMaterialPrice(req.user.id, materialId, dto.price);
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
    return this.settings.updateUserHardwarePrice(req.user.id, hardwareId, dto.price);
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
}
