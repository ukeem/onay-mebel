import {
  CalcType,
  ContactType,
  ModuleType,
  ProfitType,
  TierLevel,
} from '@prisma/client';
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
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateUserMaterialPriceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  price?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsEnum(ModuleType, { each: true })
  moduleTypes?: ModuleType[];
}

export class UpdateUserHardwarePriceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  price?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateUserServiceDto {
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

/* ═══ Company Info ═══ */

export class UpsertCompanyInfoDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  logo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
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
  @MaxLength(500)
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
  @MaxLength(500)
  value!: string;
}

export class UpdateContactDto {
  @IsEnum(ContactType)
  @IsOptional()
  type?: ContactType;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  value?: string;
}

/* ═══ User Defaults ═══ */

export class UpdateUserDefaultsDto {
  @IsOptional() @IsString() @MaxLength(100) sectionMaterialId?: string;
  @IsOptional() @IsString() @MaxLength(100) backWallMaterialId?: string;
  @IsOptional() @IsString() @MaxLength(100) facadeMaterialId?: string;
  @IsOptional() @IsString() @MaxLength(100) falseFacadeMaterialId?: string;
  @IsOptional() @IsString() @MaxLength(100) countertopMaterialId?: string;

  @IsOptional() @IsString() @MaxLength(100) hingeHardwareId?: string;
  @IsOptional() @IsString() @MaxLength(100) handleHardwareId?: string;
  @IsOptional() @IsString() @MaxLength(100) tipOnHardwareId?: string;
  @IsOptional() @IsString() @MaxLength(100) slideHardwareId?: string;
  @IsOptional() @IsString() @MaxLength(100) tandemHardwareId?: string;
  @IsOptional() @IsString() @MaxLength(100) holderHardwareId?: string;
  @IsOptional() @IsString() @MaxLength(100) legsHardwareId?: string;
}

/* ═══ Custom User Materials / Hardware ═══ */

export class CreateCustomMaterialDto {
  @IsString()
  @MaxLength(100)
  materialTypeId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  brand?: string;

  @IsOptional()
  @IsEnum(CalcType)
  calcType?: CalcType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  length?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  price?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsEnum(ModuleType, { each: true })
  moduleTypes?: ModuleType[];
}

export class UpdateCustomMaterialDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  brand?: string;

  @IsOptional()
  @IsEnum(CalcType)
  calcType?: CalcType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  length?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  price?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsEnum(ModuleType, { each: true })
  moduleTypes?: ModuleType[];
}

export class CreateCustomHardwareDto {
  @IsString()
  @MaxLength(100)
  hardwareTypeId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  brand?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  price?: number;
}

/* ═══ Tier Preferences ═══ */

export class TierPreferenceItemDto {
  @IsEnum(TierLevel)
  tier!: TierLevel;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  materialTypeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  materialId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  hardwareTypeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  hardwareId?: string;
}

export class SaveTierPreferencesDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => TierPreferenceItemDto)
  items!: TierPreferenceItemDto[];
}
