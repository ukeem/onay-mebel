import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogCopyService } from '../shared/catalog-copy.service';
import { UploadsService } from '../uploads/uploads.service';
import { WsGateway } from '../ws/ws.gateway';
import {
  ChangePasswordDto,
  CreateUserDto,
  UpdateUserDto,
} from './dto/users.dto';

const USER_SELECT = {
  id: true,
  phone: true,
  role: true,
  status: true,
  activeUntil: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ws: WsGateway,
    private readonly catalogCopy: CatalogCopyService,
    private readonly uploads: UploadsService,
  ) {}

  /** Список пользователей. ADMIN видит только USER, SUPER видит всех */
  async findAll(requesterRole: Role) {
    const where = requesterRole === Role.ADMIN ? { role: Role.USER } : {};

    // Массово деактивировать просроченных пользователей перед выборкой,
    // чтобы админ всегда видел актуальный статус
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    await this.prisma.user.updateMany({
      where: {
        status: UserStatus.ACTIVE,
        activeUntil: { lt: startOfToday },
      },
      data: { status: UserStatus.INACTIVE },
    });

    return this.prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Один пользователь */
  async findOne(id: string, requesterRole?: Role) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('Пользователь не найден');

    // ADMIN can only view USER profiles
    if (requesterRole === Role.ADMIN && user.role !== Role.USER) {
      throw new ForbiddenException('Нет доступа к этому пользователю');
    }

    return user;
  }

  /** Создание пользователя (админом) — сразу ACTIVE, без SMS */
  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) throw new ConflictException('Номер уже занят');

    const hashed = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        password: hashed,
        role: dto.role ?? Role.USER,
        status: UserStatus.ACTIVE,
      },
      select: USER_SELECT,
    });

    // Copy catalog
    await this.catalogCopy.copySettingsToUser(user.id);

    return user;
  }

  /** Обновление роли/статуса/activeUntil */
  async update(
    id: string,
    dto: UpdateUserDto,
    requesterId: string,
    requesterRole?: Role,
  ) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Пользователь не найден');

    // Нельзя менять себя
    if (id === requesterId) {
      throw new ForbiddenException('Нельзя менять свой аккаунт');
    }

    // Нельзя менять SUPER
    if (target.role === Role.SUPER) {
      throw new ForbiddenException('Нельзя изменять суперадмина');
    }

    // ADMIN может управлять только USER
    if (requesterRole === Role.ADMIN && target.role !== Role.USER) {
      throw new ForbiddenException('Нет доступа к этому пользователю');
    }

    // Только SUPER может менять роль
    if (dto.role !== undefined && requesterRole !== Role.SUPER) {
      throw new ForbiddenException('Только суперадмин может менять роли');
    }

    const updateData: Record<string, any> = {};

    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.activeUntil !== undefined)
      updateData.activeUntil = new Date(dto.activeUntil);

    // Status logic per TZ:
    // lock → BLOCKED
    // unlock → if activeUntil > now → ACTIVE, else → INACTIVE
    // Note: activeUntil represents the END of the day, so we compare with start of today (00:00)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    if (dto.status !== undefined) {
      if (dto.status === UserStatus.BLOCKED) {
        updateData.status = UserStatus.BLOCKED;
      } else if (
        dto.status === UserStatus.ACTIVE ||
        dto.status === UserStatus.INACTIVE
      ) {
        // Determine based on activeUntil
        const au = dto.activeUntil
          ? new Date(dto.activeUntil)
          : target.activeUntil;
        if (au && au >= startOfToday) {
          updateData.status = UserStatus.ACTIVE;
        } else {
          updateData.status = UserStatus.INACTIVE;
        }
      }
    }

    // If activeUntil is being set and user is not blocked, update status too
    if (
      dto.activeUntil !== undefined &&
      dto.status === undefined &&
      target.status !== UserStatus.BLOCKED
    ) {
      const au = new Date(dto.activeUntil);
      updateData.status =
        au >= startOfToday ? UserStatus.ACTIVE : UserStatus.INACTIVE;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: USER_SELECT,
    });

    // Если заблокирован — force-logout + удалить все refresh tokens
    if (dto.status === UserStatus.BLOCKED) {
      await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
      this.ws.forceLogout(id);
    }

    return user;
  }

  /** Сброс пароля пользователю (админом) */
  async changePassword(
    id: string,
    dto: ChangePasswordDto,
    requesterRole?: Role,
  ) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Пользователь не найден');

    if (target.role === Role.SUPER) {
      throw new ForbiddenException('Нельзя менять пароль суперадмина');
    }

    // ADMIN can only change passwords of USER role
    if (requesterRole === Role.ADMIN && target.role !== Role.USER) {
      throw new ForbiddenException('Нет доступа к этому пользователю');
    }

    const hashed = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashed },
    });

    // Invalidate sessions
    await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    this.ws.forceLogout(id);

    return { message: 'Пароль изменён' };
  }

  /** Удаление пользователя */
  async remove(id: string, requesterId: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Пользователь не найден');

    if (id === requesterId) {
      throw new ForbiddenException('Нельзя удалить свой аккаунт');
    }
    if (target.role === Role.SUPER) {
      throw new ForbiddenException('Нельзя удалить суперадмина');
    }

    await this.uploads.deleteUserWithUploads(id);
    this.ws.forceLogout(id);
    return { message: 'Пользователь удалён' };
  }
}
