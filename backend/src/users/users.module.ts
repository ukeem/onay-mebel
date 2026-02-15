import { Module } from '@nestjs/common';
import { WsModule } from '../ws/ws.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [WsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
