import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CalculationsService } from './calculations.service';

/**
 * Public controller — no JWT guard.
 * Serves the commercial proposal HTML to clients without authentication.
 */
@Controller('public')
export class PublicProposalController {
  constructor(private svc: CalculationsService) {}

  /** GET /api/public/proposal/:id — public KP HTML */
  @Get('proposal/:id')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async proposal(@Param('id') id: string, @Res() res: Response) {
    const calc = await this.svc.findOnePublic(id);
    const html = this.svc.generateProposal(calc.data as any);
    res.send(html);
  }
}
