import { DrawerSlideType, FacadeOpenType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/* ── Product ── */

export class CreateProductDto {
  @IsString()
  @MaxLength(100)
  roomId: string;

  @IsString()
  @MaxLength(100)
  productTypeId: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  productTypeId?: string;

  /* ── switchers ── */

  @IsOptional()
  @IsBoolean()
  sectionsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  partitionsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  shelvesEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  facadesEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  falseFacadesEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  drawersEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  countertopEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  extrasEnabled?: boolean;
}

/* ── Sections ── */

export class UpsertSectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  qty: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  width: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  height: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  depth: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  materialId?: string | null;

  @IsOptional()
  @IsBoolean()
  backWallEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  backWallMaterialId?: string | null;

  @IsOptional()
  @IsBoolean()
  legsEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  legsHardwareId?: string | null;
}

/* ── Partitions ── */

export class UpsertPartitionDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  qty: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  height: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  depth: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  materialId?: string | null;
}

/* ── Shelves ── */

export class UpsertShelfDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  qty: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  width: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  depth: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  materialId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  holderHardwareId?: string | null;
}

/* ── Facades ── */

export class UpsertFacadeDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  materialId?: string | null;

  @IsInt()
  @Min(0)
  @Max(100000)
  width: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  height: number;

  @IsInt()
  @Min(1)
  @Max(1000)
  qty: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  handleQty?: number;

  @IsOptional()
  @IsIn(['HANDLE', 'TIP_ON'])
  openType?: FacadeOpenType;

  @IsOptional()
  @IsBoolean()
  hingesEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  hingeHardwareId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  handleHardwareId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tipOnHardwareId?: string | null;
}

/* ── Drawers ── */

export class UpsertDrawerDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsInt()
  @Min(0)
  @Max(100000)
  width: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  height: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  depth: number;

  @IsInt()
  @Min(1)
  @Max(1000)
  qty: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  handleQty?: number;

  @IsOptional()
  @IsIn(['GUIDE', 'TANDEM'])
  slideType?: DrawerSlideType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  materialId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  slideHardwareId?: string | null;
}

/* ── False Facades ── */

export class UpsertFalseFacadeDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  qty: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  height: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  depth: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  materialId?: string | null;
}

/* ── Countertop ── */

export class UpsertCountertopDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  materialId?: string | null;

  @IsInt()
  @Min(0)
  @Max(100000)
  width: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  depth?: number;

  @IsOptional()
  @IsBoolean()
  apronEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  apronMaterialId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  apronWidth?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  apronHeight?: number;
}

/* ── Extras ── */

export class UpsertExtraDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000000)
  @Type(() => Number)
  price?: number;
}
