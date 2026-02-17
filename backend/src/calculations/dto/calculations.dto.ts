import { IsObject } from 'class-validator';

export class UpdateCalculationDto {
  @IsObject()
  data: Record<string, any>;
}
