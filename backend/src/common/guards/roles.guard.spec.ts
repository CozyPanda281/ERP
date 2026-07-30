import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { mockReflector } from '../test/mocks';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let mockContext: any;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new RolesGuard(mockReflector as any);

    mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            sub: 'user-1',
            roles: ['teacher', 'principal'],
            isSuperAdmin: false,
          },
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };
  });

  it('should allow when no roles required', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should allow user with required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['teacher']);
    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should allow SuperAdmin regardless of roles', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['parent']);
    mockContext.switchToHttp = () => ({
      getRequest: () => ({
        user: { roles: [], isSuperAdmin: true },
      }),
    });
    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should deny user without required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['superadmin']);
    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });

  it('should throw when user is not authenticated', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['teacher']);
    mockContext.switchToHttp = () => ({
      getRequest: () => ({ user: null }),
    });
    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });
});
