import { Module } from '@nestjs/common';
import { CalculationsController } from './calculations.controller';
import { CalculationsService } from './calculations.service';
import { PublicProposalController } from './public-proposal.controller';

@Module({
  controllers: [CalculationsController, PublicProposalController],
  providers: [CalculationsService],
  exports: [CalculationsService],
})
export class CalculationsModule {}
