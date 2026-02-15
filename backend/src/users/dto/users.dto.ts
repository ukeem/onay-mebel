import { Role, UserStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Matches(/^\+7\d{10}$/, { message: 'Формат: +7XXXXXXXXXX' })
  phone!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}

export class UpdateUserDto {
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @IsDateString()
  @IsOptional()
  activeUntil?: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
