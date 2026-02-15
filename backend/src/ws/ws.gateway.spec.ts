import { WsGateway } from './ws.gateway';

// ────────────── mocks ──────────────

const mockJwt = {
  verify: jest.fn(),
};

const mockServer = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
};

const makeSocket = (id: string) => ({
  id,
  emit: jest.fn(),
  handshake: {
    headers: {} as Record<string, string>,
  },
});

describe('WsGateway', () => {
  let gateway: WsGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new WsGateway(mockJwt as any);
    // Inject mock server
    (gateway as any).server = mockServer;
  });

  /* ═══════════════ handleConnection ═══════════════ */

  describe('handleConnection', () => {
    it('should log client connection', () => {
      const client = makeSocket('socket-1');
      // Should not throw
      expect(() => gateway.handleConnection(client as any)).not.toThrow();
    });
  });

  /* ═══════════════ handleRegister ═══════════════ */

  describe('handleRegister', () => {
    it('should register user socket with valid JWT', () => {
      const client = makeSocket('socket-1');
      mockJwt.verify.mockReturnValue({ sub: 'user-1' });

      gateway.handleRegister(client as any, { token: 'valid-jwt' });

      // Verify internal state
      const sockets = (gateway as any).userSockets.get('user-1');
      expect(sockets).toBeDefined();
      expect(sockets.has('socket-1')).toBe(true);
    });

    it('should emit error for missing token', () => {
      const client = makeSocket('socket-1');

      gateway.handleRegister(client as any, {} as any);

      expect(client.emit).toHaveBeenCalledWith('error', {
        message: 'Token required',
      });
    });

    it('should emit error for invalid JWT', () => {
      const client = makeSocket('socket-1');
      mockJwt.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      gateway.handleRegister(client as any, { token: 'bad-jwt' });

      expect(client.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid token',
      });
    });

    it('should support multiple tabs (multiple sockets per user)', () => {
      const client1 = makeSocket('socket-1');
      const client2 = makeSocket('socket-2');
      mockJwt.verify.mockReturnValue({ sub: 'user-1' });

      gateway.handleRegister(client1 as any, { token: 'jwt' });
      gateway.handleRegister(client2 as any, { token: 'jwt' });

      const sockets = (gateway as any).userSockets.get('user-1');
      expect(sockets.size).toBe(2);
      expect(sockets.has('socket-1')).toBe(true);
      expect(sockets.has('socket-2')).toBe(true);
    });
  });

  /* ═══════════════ handleDisconnect ═══════════════ */

  describe('handleDisconnect', () => {
    it('should remove socket from user mapping', () => {
      const client = makeSocket('socket-1');
      mockJwt.verify.mockReturnValue({ sub: 'user-1' });

      gateway.handleRegister(client as any, { token: 'jwt' });
      gateway.handleDisconnect(client as any);

      const sockets = (gateway as any).userSockets.get('user-1');
      expect(sockets).toBeUndefined(); // set removed when empty
    });

    it('should keep other sockets when one disconnects', () => {
      const client1 = makeSocket('socket-1');
      const client2 = makeSocket('socket-2');
      mockJwt.verify.mockReturnValue({ sub: 'user-1' });

      gateway.handleRegister(client1 as any, { token: 'jwt' });
      gateway.handleRegister(client2 as any, { token: 'jwt' });

      gateway.handleDisconnect(client1 as any);

      const sockets = (gateway as any).userSockets.get('user-1');
      expect(sockets.size).toBe(1);
      expect(sockets.has('socket-2')).toBe(true);
    });
  });

  /* ═══════════════ forceLogout ═══════════════ */

  describe('forceLogout', () => {
    it('should emit force-logout to all user sockets', () => {
      mockJwt.verify.mockReturnValue({ sub: 'user-1' });
      const client1 = makeSocket('socket-1');
      const client2 = makeSocket('socket-2');

      gateway.handleRegister(client1 as any, { token: 'jwt' });
      gateway.handleRegister(client2 as any, { token: 'jwt' });

      gateway.forceLogout('user-1');

      // Should emit to both sockets
      expect(mockServer.to).toHaveBeenCalledWith('socket-1');
      expect(mockServer.to).toHaveBeenCalledWith('socket-2');
      expect(mockServer.emit).toHaveBeenCalledWith('force-logout', {
        message: 'Вы вошли с другого устройства',
      });

      // Mapping should be cleared
      expect((gateway as any).userSockets.has('user-1')).toBe(false);
    });

    it('should do nothing if user has no sockets', () => {
      gateway.forceLogout('nonexistent');

      expect(mockServer.to).not.toHaveBeenCalled();
    });
  });
});
