import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { DatabaseProvider } from '../../database/database.provider';
import {
  MockDatabaseProvider,
  mockJwtService,
  mockConfigService,
} from '../../common/test/mocks';

describe('AuthService', () => {
  let service: AuthService;
  let mockDb: MockDatabaseProvider;

  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DatabaseProvider, useValue: mockDb },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash('password123', 4);

      mockDb.setDrizzleResults([
        {
          id: 'user-1',
          email: 'admin@school.com',
          passwordHash: hash,
          firstName: 'Admin',
          lastName: 'User',
          isSuperadmin: false,
          isActive: true,
          status: 'active',
          tenantId: 'tenant-1',
        },
      ]);

      const user = await service.validateUser(
        'admin@school.com',
        'password123',
        'tenant-1',
      );
      expect(user).toBeDefined();
      expect(user.email).toBe('admin@school.com');
    });

    it('should throw on invalid password', async () => {
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash('correct-password', 4);

      mockDb.setDrizzleResults([
        {
          id: 'user-1',
          email: 'admin@school.com',
          passwordHash: hash,
          isActive: true,
          status: 'active',
        },
      ]);

      await expect(
        service.validateUser('admin@school.com', 'wrong-password', 'tenant-1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw on inactive user', async () => {
      mockDb.setDrizzleResults([
        {
          id: 'user-1',
          email: 'admin@school.com',
          passwordHash: 'hash',
          isActive: false,
          status: 'inactive',
        },
      ]);

      await expect(
        service.validateUser('admin@school.com', 'password', 'tenant-1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when user not found', async () => {
      mockDb.setDrizzleResults([]);

      await expect(
        service.validateUser('nonexistent@school.com', 'password', 'tenant-1'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should return access and refresh tokens', async () => {
      mockDb.setDrizzleResults(
        [{ slug: 'principal' }],
        [{ slug: 'students.read' }, { slug: 'students.write' }],
        [],
        [],
      );

      const result = await service.login({
        id: 'user-1',
        email: 'admin@school.com',
        tenantId: 'tenant-1',
        isSuperadmin: false,
        firstName: 'Admin',
        lastName: 'User',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('admin@school.com');
    });
  });

  describe('refreshAccessToken', () => {
    it('should return a new access token', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'session-1', isActive: true }],
        [
          {
            id: 'user-1',
            email: 'admin@school.com',
            tenantId: 'tenant-1',
            isSuperadmin: false,
            isActive: true,
            status: 'active',
          },
        ],
        [{ slug: 'principal' }],
        [],
        [],
      );

      const result = await service.refreshAccessToken('valid-refresh-token');
      expect(result.accessToken).toBeDefined();
    });

    it('should throw on invalid refresh token', async () => {
      mockJwtService.verifyAsync.mockRejectedValueOnce(new Error('invalid'));

      await expect(service.refreshAccessToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should invalidate session', async () => {
      mockDb.setDrizzleResults([[]]);

      await expect(
        service.logout('session-1', 'user-1'),
      ).resolves.not.toThrow();
    });
  });
});
