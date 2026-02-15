import { ProfitType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateUserMaterialPriceDto {
  @IsNumber()
  @Min(0)
  price!: number;
}

export class UpdateUserHardwarePriceDto {
  @IsNumber()
  @Min(0)
  price!: number;
}

export class UpdateUserServiceDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  sawingPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  drillingPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  edgeBandingPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  technologistPercent?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  designerPercent?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  assemblyPercent?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  deliveryPrice?: number;

  @IsEnum(ProfitType)
  @IsOptional()
  profitType?: ProfitType;

  @IsNumber()
  @Min(0)
  @IsOptional()
  profitValue?: number;
}
