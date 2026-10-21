import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  projectId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  roomTypeId: string;
}

export class UpdateRoomDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  roomTypeId: string;
}
