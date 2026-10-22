import { Controller, Get, Header, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SettingsService } from '../settings/settings.service';
import { CalculationsService } from './calculations.service';

/**
 * Public controller — no JWT guard.
 * Serves the commercial proposal HTML to clients without authentication.
 */
@Controller('public')
export class PublicProposalController {
  constructor(
    private svc: CalculationsService,
    private settingsService: SettingsService,
  ) {}

  /** GET /api/public/proposal/:id — public KP HTML */
  @Get('proposal/:id')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async proposal(@Param('id') id: string, @Res() res: Response) {
    const calc = await this.svc.findOnePublic(id);
    // Get userId from the calculation's project
    const calcWithProject = await this.svc.findOnePublicWithProject(id);
    const proposalSettings = calcWithProject?.userId
      ? await this.settingsService.getProposalSettings(calcWithProject.userId)
      : undefined;
    const html = await this.svc.generateProposal(
      calc.data as any,
      proposalSettings,
    );
    setProposalSecurityHeaders(res);
    res.send(html);
  }

  /** GET /api/public/shorten?url=... — shorten URL via clck.ru */
  @Get('shorten')
  async shorten(@Query('url') url: string) {
    if (!url) return { short: url };
    try {
      const res = await fetch(
        `https://clck.ru/--?url=${encodeURIComponent(url)}`,
      );
      if (!res.ok) return { short: url };
      const short = (await res.text()).trim();
      return { short: short || url };
    } catch {
      return { short: url };
    }
  }
}

function setProposalSecurityHeaders(res: Response) {
  res.set({
    'Content-Security-Policy':
      "sandbox allow-scripts allow-modals; default-src 'none'; img-src data:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'public, max-age=60',
  });
}
