import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { WsModule } from '../ws/ws.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [WsModule, UploadsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
