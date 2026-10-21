import { IsObject } from 'class-validator';
import { IsBoundedSnapshot } from './snapshot-limits';

export class UpdateCalculationDto {
  @IsObject()
  @IsBoundedSnapshot()
  data: Record<string, any>;
}
