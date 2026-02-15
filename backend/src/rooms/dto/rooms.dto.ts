import { IsString, MinLength } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @MinLength(1)
  projectId: string;

  @IsString()
  @MinLength(1)
  roomTypeId: string;
}

export class UpdateRoomDto {
  @IsString()
  @MinLength(1)
  roomTypeId: string;
}
