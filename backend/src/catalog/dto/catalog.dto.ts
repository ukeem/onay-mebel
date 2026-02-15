import { CalcType, ProfitType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/* ─── Types (room, product, material, hardware) ─── */

export class CreateTypeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

/* ─── Materials ─── */

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  materialTypeId!: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsEnum(CalcType)
  @IsOptional()
  calcType?: CalcType;

  @IsInt()
  @Min(1)
  @IsOptional()
  length?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  width?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  image?: string;
}

export class UpdateMaterialDto {
  @IsString()
  @IsOptional()
  brand?: string;

  @IsEnum(CalcType)
  @IsOptional()
  calcType?: CalcType;

  @IsInt()
  @Min(1)
  @IsOptional()
  length?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  width?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  image?: string;
}

/* ─── Hardware ─── */

export class CreateHardwareDto {
  @IsString()
  @IsNotEmpty()
  hardwareTypeId!: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  image?: string;
}

export class UpdateHardwareDto {
  @IsString()
  @IsOptional()
  brand?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  image?: string;
}

/* ─── Service Template ─── */

export class UpdateServiceTemplateDto {
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
