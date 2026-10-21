import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+7\d{10}$/, { message: 'Номер телефона: +7XXXXXXXXXX' })
  phone!: string;

  @IsString()
  @MinLength(8, { message: 'Минимум 8 символов' })
  @MaxLength(128, { message: 'Максимум 128 символов' })
  password!: string;
}

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+7\d{10}$/, { message: 'Номер телефона: +7XXXXXXXXXX' })
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128, { message: 'Максимум 128 символов' })
  password!: string;
}

export class VerifySmsDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+7\d{10}$/, { message: 'Номер телефона: +7XXXXXXXXXX' })
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Код: 6 цифр' })
  code!: string;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  refreshToken!: string;
}

export class ResetRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+7\d{10}$/, { message: 'Номер телефона: +7XXXXXXXXXX' })
  phone!: string;
}

export class ResetConfirmDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+7\d{10}$/, { message: 'Номер телефона: +7XXXXXXXXXX' })
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Код: 6 цифр' })
  code!: string;

  @IsString()
  @MinLength(8, { message: 'Минимум 8 символов' })
  @MaxLength(128, { message: 'Максимум 128 символов' })
  newPassword!: string;
}
