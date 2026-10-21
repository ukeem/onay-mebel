import { CalcType, ModuleType, ProfitType } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/* ─── Types (room, product, material, hardware) ─── */

export class CreateTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;
}

/* ─── Extra Types (with optional price) ─── */

export class CreateExtraTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  @IsOptional()
  price?: number;
}

/* ─── Materials ─── */

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  materialTypeId!: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  brand?: string;

  @IsEnum(CalcType)
  @IsOptional()
  calcType?: CalcType;

  @IsInt()
  @Min(1)
  @Max(100_000)
  @IsOptional()
  length?: number;

  @IsInt()
  @Min(1)
  @Max(100_000)
  @IsOptional()
  width?: number;

  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  image?: string;

  @IsArray()
  @ArrayMaxSize(8)
  @IsEnum(ModuleType, { each: true })
  @IsOptional()
  moduleTypes?: ModuleType[];
}

export class UpdateMaterialDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  brand?: string;

  @IsEnum(CalcType)
  @IsOptional()
  calcType?: CalcType;

  @IsInt()
  @Min(1)
  @Max(100_000)
  @IsOptional()
  length?: number;

  @IsInt()
  @Min(1)
  @Max(100_000)
  @IsOptional()
  width?: number;

  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  image?: string;

  @IsArray()
  @ArrayMaxSize(8)
  @IsEnum(ModuleType, { each: true })
  @IsOptional()
  moduleTypes?: ModuleType[];
}

/* ─── Hardware ─── */

export class CreateHardwareDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  hardwareTypeId!: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  brand?: string;

  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  image?: string;
}

export class UpdateHardwareDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  brand?: string;

  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  image?: string;
}

/* ─── Service Template ─── */

export class UpdateServiceTemplateDto {
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  @IsOptional()
  sawingPrice?: number;

  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  @IsOptional()
  drillingPrice?: number;

  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  @IsOptional()
  edgeBandingPrice?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  technologistPercent?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  designerPercent?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  assemblyPercent?: number;

  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  @IsOptional()
  deliveryPrice?: number;

  @IsEnum(ProfitType)
  @IsOptional()
  profitType?: ProfitType;

  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  @IsOptional()
  profitValue?: number;
}
