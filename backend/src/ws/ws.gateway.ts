import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import * as cookie from 'cookie';
import { Server, Socket } from 'socket.io';

/**
 * WebSocket Gateway для авто-кика (force-logout).
 * При логине с нового устройства — мгновенный push на старое.
 */
@WebSocketGateway({
  cors: {
    origin: (process.env.FRONTEND_URL ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim()),
    credentials: true,
  },
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WsGateway.name);

  // userId → Set<socketId> (supports multiple tabs)
  private userSockets = new Map<string, Set<string>>();

  constructor(private readonly jwt: JwtService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    // Auto-register from httpOnly cookie
    const cookieHeader = client.handshake.headers.cookie;
    if (cookieHeader) {
      const cookies = cookie.parse(cookieHeader);
      const token = cookies.accessToken;
      if (token) {
        try {
          const decoded = this.jwt.verify(token);
          const userId = decoded.sub as string;
          this.registerUser(userId, client.id);
          this.logger.log(
            `User ${userId} auto-registered from cookie on socket ${client.id}`,
          );
          return;
        } catch {
          this.logger.warn(`Invalid cookie JWT on connect: ${client.id}`);
        }
      }
    }
  }

  handleDisconnect(client: Socket) {
    // Remove socket from all user mappings
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
        this.logger.log(`User ${userId} disconnected (socket ${client.id})`);
        break;
      }
    }
  }

  /**
   * Клиент отправляет 'register' с JWT токеном после подключения (legacy / fallback).
   */
  @SubscribeMessage('register')
  handleRegister(client: Socket, payload: { token: string }) {
    if (!payload?.token) {
      client.emit('error', { message: 'Token required' });
      return;
    }

    try {
      const decoded = this.jwt.verify(payload.token);
      const userId = decoded.sub as string;
      this.registerUser(userId, client.id);
      this.logger.log(
        `User ${userId} registered on socket ${client.id} (JWT verified)`,
      );
    } catch {
      client.emit('error', { message: 'Invalid token' });
      this.logger.warn(`Invalid JWT on socket register: ${client.id}`);
    }
  }

  /**
   * Регистрирует сокет пользователя.
   */
  registerUser(userId: string, socketId: string) {
    const existing = this.userSockets.get(userId);
    if (!existing) {
      this.userSockets.set(userId, new Set([socketId]));
    } else {
      existing.add(socketId);
    }
  }

  /**
   * Принудительный кик пользователя (вызывается из AuthService при логине).
   */
  forceLogout(userId: string) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      for (const socketId of sockets) {
        this.server.to(socketId).emit('force-logout', {
          message: 'Вы вошли с другого устройства',
        });
      }
      this.userSockets.delete(userId);
      this.logger.warn(
        `Force-logout sent to user ${userId} (${sockets.size} sockets)`,
      );
    }
  }
}
