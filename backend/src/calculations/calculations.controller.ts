import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SettingsService } from '../settings/settings.service';
import { CalculationsService } from './calculations.service';
import { UpdateCalculationDto } from './dto/calculations.dto';

@UseGuards(JwtAuthGuard)
@Controller('calculations')
export class CalculationsController {
  constructor(
    private svc: CalculationsService,
    private settingsService: SettingsService,
  ) {}

  /** POST /api/calculations/project/:projectId/calculate — run */
  @Post('project/:projectId/calculate')
  calculate(@Param('projectId') projectId: string, @Req() req: any) {
    return this.svc.calculate(projectId, req.user.id);
  }

  /** GET /api/calculations/project/:projectId — list */
  @Get('project/:projectId')
  findAll(@Param('projectId') projectId: string, @Req() req: any) {
    return this.svc.findAll(projectId, req.user.id);
  }

  /** GET /api/calculations/:id — single */
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.svc.findOne(id, req.user.id);
  }

  /** PATCH /api/calculations/:id — update snapshot data (editable detail page) */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateCalculationDto,
    @Req() req: any,
  ) {
    return this.svc.update(id, req.user.id, body.data);
  }

  /** DELETE /api/calculations/:id */
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.svc.remove(id, req.user.id);
  }

  /** DELETE /api/calculations/project/:projectId — delete all calculations for a project */
  @Delete('project/:projectId')
  removeAll(@Param('projectId') projectId: string, @Req() req: any) {
    return this.svc.removeAll(projectId, req.user.id);
  }

  /** GET /api/calculations/:id/proposal — HTML commercial proposal */
  @Get(':id/proposal')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async proposal(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const calc = await this.svc.findOne(id, req.user.id);
    const proposalSettings = await this.settingsService.getProposalSettings(
      req.user.id,
    );
    const html = this.svc.generateProposal(calc.data as any, proposalSettings);
    setProposalSecurityHeaders(res);
    res.send(html);
  }
}

function setProposalSecurityHeaders(res: Response) {
  res.set({
    'Content-Security-Policy':
      "sandbox allow-scripts allow-modals; default-src 'none'; img-src data:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'private, no-store',
  });
}
