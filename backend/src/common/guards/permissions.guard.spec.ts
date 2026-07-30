import { ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';
import { mockReflector } from '../test/mocks';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let mockContext: any;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new PermissionsGuard(mockReflector as any);

    mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            sub: 'user-1',
            permissions: ['students.read', 'students.write', 'fees.read'],
            isSuperAdmin: false,
          },
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };
  });

  it('should allow when no permissions required', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should allow user with required permission', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['students.read']);
    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should allow SuperAdmin regardless of permissions', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['admin.all']);
    mockContext.switchToHttp = () => ({
      getRequest: () => ({
        user: { permissions: [], isSuperAdmin: true },
      }),
    });
    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should deny user without required permission', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['admin.all']);
    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });

  it('should throw when user is not authenticated', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['students.read']);
    mockContext.switchToHttp = () => ({
      getRequest: () => ({ user: null }),
    });
    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });
});
