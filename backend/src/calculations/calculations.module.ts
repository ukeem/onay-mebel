import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { CalculationsController } from './calculations.controller';
import { CalculationsService } from './calculations.service';
import { PublicProposalController } from './public-proposal.controller';

@Module({
  imports: [SettingsModule],
  controllers: [CalculationsController, PublicProposalController],
  providers: [CalculationsService],
  exports: [CalculationsService],
})
export class CalculationsModule {}
