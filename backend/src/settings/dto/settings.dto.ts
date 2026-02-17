import { ContactType, ProfitType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
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
