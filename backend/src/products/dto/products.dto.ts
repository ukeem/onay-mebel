import { DrawerSlideType, FacadeOpenType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

/* ── Product ── */

export class CreateProductDto {
  @IsString()
  roomId: string;

  @IsString()
  productTypeId: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
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
  id?: string;

  @IsInt()
  @Min(1)
  qty: number;

  @IsInt()
  @Min(0)
  width: number;

  @IsInt()
  @Min(0)
  height: number;

  @IsInt()
  @Min(0)
  depth: number;

  @IsOptional()
  @IsString()
  materialId?: string | null;

  @IsOptional()
  @IsBoolean()
  backWallEnabled?: boolean;

  @IsOptional()
  @IsString()
  backWallMaterialId?: string | null;

  @IsOptional()
  @IsBoolean()
  legsEnabled?: boolean;

  @IsOptional()
  @IsString()
  legsHardwareId?: string | null;
}

/* ── Partitions ── */

export class UpsertPartitionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsInt()
  @Min(1)
  qty: number;

  @IsInt()
  @Min(0)
  height: number;

  @IsInt()
  @Min(0)
  depth: number;

  @IsOptional()
  @IsString()
  materialId?: string | null;
}

/* ── Shelves ── */

export class UpsertShelfDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsInt()
  @Min(1)
  qty: number;

  @IsInt()
  @Min(0)
  width: number;

  @IsInt()
  @Min(0)
  depth: number;

  @IsOptional()
  @IsString()
  materialId?: string | null;

  @IsOptional()
  @IsString()
  holderHardwareId?: string | null;
}

/* ── Facades ── */

export class UpsertFacadeDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  materialId?: string | null;

  @IsInt()
  @Min(0)
  width: number;

  @IsInt()
  @Min(0)
  height: number;

  @IsInt()
  @Min(1)
  qty: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  handleQty?: number;

  @IsOptional()
  @IsIn(['HANDLE', 'TIP_ON'])
  openType?: FacadeOpenType;

  @IsOptional()
  @IsString()
  hingeHardwareId?: string | null;

  @IsOptional()
  @IsString()
  handleHardwareId?: string | null;

  @IsOptional()
  @IsString()
  tipOnHardwareId?: string | null;
}

/* ── Drawers ── */

export class UpsertDrawerDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsInt()
  @Min(0)
  width: number;

  @IsInt()
  @Min(0)
  height: number;

  @IsInt()
  @Min(0)
  depth: number;

  @IsInt()
  @Min(1)
  qty: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  handleQty?: number;

  @IsOptional()
  @IsIn(['GUIDE', 'TANDEM'])
  slideType?: DrawerSlideType;

  @IsOptional()
  @IsString()
  materialId?: string | null;

  @IsOptional()
  @IsString()
  slideHardwareId?: string | null;
}

/* ── False Facades ── */

export class UpsertFalseFacadeDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsInt()
  @Min(1)
  qty: number;

  @IsInt()
  @Min(0)
  height: number;

  @IsInt()
  @Min(0)
  depth: number;

  @IsOptional()
  @IsString()
  materialId?: string | null;
}

/* ── Countertop ── */

export class UpsertCountertopDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  materialId?: string | null;

  @IsInt()
  @Min(0)
  width: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  depth?: number;

  @IsOptional()
  @IsBoolean()
  apronEnabled?: boolean;

  @IsOptional()
  @IsString()
  apronMaterialId?: string | null;

  @IsOptional()
  @IsInt()
  apronWidth?: number;

  @IsOptional()
  @IsInt()
  apronHeight?: number;
}

/* ── Extras ── */

export class UpsertExtraDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  price?: number;
}
