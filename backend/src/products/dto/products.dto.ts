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

  @IsOptional()
  @IsInt()
  @Min(0)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  height?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  depth?: number;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  productTypeId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  height?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  depth?: number;

  @IsOptional()
  @IsString()
  bodyMaterialId?: string;

  /* ── switchers ── */

  @IsOptional()
  @IsBoolean()
  sectionsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  backWallEnabled?: boolean;

  @IsOptional()
  @IsString()
  backWallMaterialId?: string;

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
  @IsInt()
  @Min(0)
  falseFacadeQty?: number;

  @IsOptional()
  @IsString()
  falseFacadeMaterialId?: string;

  @IsOptional()
  @IsBoolean()
  drawersEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  mezzanineEnabled?: boolean;

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

  @IsOptional()
  @IsString()
  mezzanineId?: string;
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
  @Min(1)
  height: number;

  @IsOptional()
  @IsString()
  mezzanineId?: string;
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
  @Min(1)
  width: number;

  @IsOptional()
  @IsString()
  mezzanineId?: string;
}

/* ── Facades ── */

export class UpsertFacadeDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  materialId?: string | null;

  @IsOptional()
  @IsBoolean()
  isLdsp?: boolean;

  @IsInt()
  @Min(1)
  width: number;

  @IsInt()
  @Min(1)
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
  mezzanineId?: string;
}

/* ── Drawers ── */

export class UpsertDrawerDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsInt()
  @Min(1)
  width: number;

  @IsInt()
  @Min(1)
  height: number;

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
  mezzanineId?: string;
}

/* ── Mezzanine ── */

export class UpsertMezzanineDto {
  @IsInt()
  @Min(1)
  height: number;

  @IsOptional()
  @IsString()
  bodyMaterialId?: string | null;

  @IsOptional()
  @IsBoolean()
  sectionsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  backWallEnabled?: boolean;

  @IsOptional()
  @IsString()
  backWallMaterialId?: string;

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
  @IsInt()
  @Min(0)
  falseFacadeQty?: number;

  @IsOptional()
  @IsString()
  falseFacadeMaterialId?: string;

  @IsOptional()
  @IsBoolean()
  drawersEnabled?: boolean;
}

/* ── Countertop ── */

export class UpsertCountertopDto {
  @IsString()
  materialId: string;

  @IsOptional()
  @IsBoolean()
  isLdsp?: boolean;

  @IsInt()
  @Min(1)
  width: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  depth?: number;

  @IsOptional()
  @IsBoolean()
  apronEnabled?: boolean;

  @IsOptional()
  @IsString()
  apronMaterialId?: string;

  @IsOptional()
  @IsBoolean()
  apronIsLdsp?: boolean;

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
