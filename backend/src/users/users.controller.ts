import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import {
  ChangePasswordDto,
  CreateUserDto,
  UpdateUserDto,
} from './dto/users.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER, Role.ADMIN)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** GET /api/users */
  @Get()
  findAll(@Request() req: any) {
    return this.users.findAll(req.user.role);
  }

  /** GET /api/users/:id */
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.users.findOne(id, req.user.role);
  }

  /** POST /api/users */
  @Post()
  @Roles(Role.SUPER)
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  /** PATCH /api/users/:id */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Request() req: any,
  ) {
    return this.users.update(id, dto, req.user.id, req.user.role);
  }

  /** PATCH /api/users/:id/password */
  @Patch(':id/password')
  changePassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
    @Request() req: any,
  ) {
    return this.users.changePassword(id, dto, req.user.role);
  }

  /** DELETE /api/users/:id */
  @Delete(':id')
  @Roles(Role.SUPER)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.users.remove(id, req.user.id);
  }
}
