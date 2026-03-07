import { CalcType, ContactType, ProfitType, TierLevel } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateUserMaterialPriceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateUserHardwarePriceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
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

/* ═══ Company Info ═══ */

export class UpsertCompanyInfoDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  descriptionKz?: string;
}

/* ═══ Payment Stages ═══ */

export class PaymentStageItemDto {
  @IsInt()
  @Min(1)
  @Max(5)
  stageNumber!: number;

  @IsInt()
  @Min(1)
  @Max(100)
  percentage!: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class SavePaymentStagesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => PaymentStageItemDto)
  stages!: PaymentStageItemDto[];
}

/* ═══ Contacts ═══ */

export class CreateContactDto {
  @IsEnum(ContactType)
  type!: ContactType;

  @IsString()
  value!: string;
}

export class UpdateContactDto {
  @IsEnum(ContactType)
  @IsOptional()
  type?: ContactType;

  @IsString()
  @IsOptional()
  value?: string;
}

/* ═══ User Defaults ═══ */

export class UpdateUserDefaultsDto {
  @IsOptional() @IsString() sectionMaterialId?: string;
  @IsOptional() @IsString() backWallMaterialId?: string;
  @IsOptional() @IsString() facadeMaterialId?: string;
  @IsOptional() @IsString() falseFacadeMaterialId?: string;
  @IsOptional() @IsString() countertopMaterialId?: string;

  @IsOptional() @IsString() hingeHardwareId?: string;
  @IsOptional() @IsString() handleHardwareId?: string;
  @IsOptional() @IsString() tipOnHardwareId?: string;
  @IsOptional() @IsString() slideHardwareId?: string;
  @IsOptional() @IsString() tandemHardwareId?: string;
  @IsOptional() @IsString() holderHardwareId?: string;
  @IsOptional() @IsString() legsHardwareId?: string;
}

/* ═══ Custom User Materials / Hardware ═══ */

export class CreateCustomMaterialDto {
  @IsString()
  materialTypeId!: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsEnum(CalcType)
  calcType?: CalcType;

  @IsOptional()
  @IsInt()
  @Min(1)
  length?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}

export class CreateCustomHardwareDto {
  @IsString()
  hardwareTypeId!: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}

/* ═══ Tier Preferences ═══ */

export class TierPreferenceItemDto {
  @IsEnum(TierLevel)
  tier!: TierLevel;

  @IsOptional()
  @IsString()
  materialTypeId?: string;

  @IsOptional()
  @IsString()
  materialId?: string;

  @IsOptional()
  @IsString()
  hardwareTypeId?: string;

  @IsOptional()
  @IsString()
  hardwareId?: string;
}

export class SaveTierPreferencesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TierPreferenceItemDto)
  items!: TierPreferenceItemDto[];
}
