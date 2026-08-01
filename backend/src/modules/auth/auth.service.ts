import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseProvider } from '../../database/database.provider';
import { eq, and, isNull, or, sql, inArray } from 'drizzle-orm';
import * as schema from '../../database/schema';
import { EmailService } from '../../shared/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseProvider,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  private expiresInToSeconds(value: string | undefined): number {
    const match = (value || '15m').match(/^(\d+)([smhd])$/);
    if (!match) return 900;
    const n = parseInt(match[1], 10);
    switch (match[2]) {
      case 's':
        return n;
      case 'm':
        return n * 60;
      case 'h':
        return n * 3600;
      case 'd':
        return n * 86400;
      default:
        return n;
    }
  }

  private async getUserBranchId(userId: string): Promise<string | null> {
    const [userRole] = await this.db.db
      .select({ branchId: schema.userRoles.branchId })
      .from(schema.userRoles)
      .where(eq(schema.userRoles.userId, userId))
      .limit(1);
    return userRole?.branchId || null;
  }

  async validateUser(email: string, password: string, tenantId?: string) {
    const conditions = [
      eq(schema.users.email, email),
      isNull(schema.users.deletedAt),
    ];

    if (tenantId) {
      conditions.push(eq(schema.users.tenantId, tenantId));
    } else {
      conditions.push(eq(schema.users.isSuperadmin, true));
    }

    const [user] = await this.db.db
      .select()
      .from(schema.users)
      .where(and(...conditions))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw new UnauthorizedException('Account is locked. Try again later.');
    }

    if (!user.isActive || user.status !== 'active') {
      throw new UnauthorizedException('Account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.registerFailedAttempt(user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.db.db
      .update(schema.users)
      .set({ loginAttempts: 0, lockedUntil: null })
      .where(eq(schema.users.id, user.id));

    return user;
  }

  private async registerFailedAttempt(userId: string) {
    const [user] = await this.db.db
      .select({
        loginAttempts: schema.users.loginAttempts,
        lockedUntil: schema.users.lockedUntil,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    if (!user) return;

    const attempts = (user.loginAttempts || 0) + 1;
    const update: any = { loginAttempts: attempts };
    if (
      attempts >= 5 &&
      (!user.lockedUntil || new Date(user.lockedUntil) <= new Date())
    ) {
      update.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await this.db.db
      .update(schema.users)
      .set(update)
      .where(eq(schema.users.id, userId));
  }

  async login(user: any) {
    const sessionId = uuidv4();
    const roles = await this.getUserRoles(user.id, user.tenantId);
    const permissions = await this.getUserPermissions(user.id, user.tenantId);
    const branchId = await this.getUserBranchId(user.id);

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      isSuperAdmin: user.isSuperadmin,
      roles,
      permissions: permissions.map((p: any) => p.slug),
      branchId,
      sessionId,
    };

    const accessExpires = this.expiresInToSeconds(
      this.configService.get('jwt.expiresIn'),
    );
    const refreshExpires = this.expiresInToSeconds(
      this.configService.get('jwt.refreshExpiresIn'),
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get('jwt.expiresIn'),
        issuer: this.configService.get('jwt.issuer'),
      }),
      this.jwtService.signAsync(
        { sub: user.id, sessionId, type: 'refresh' },
        {
          secret: this.configService.get('jwt.refreshSecret'),
          expiresIn: this.configService.get('jwt.refreshExpiresIn'),
          issuer: this.configService.get('jwt.issuer'),
        },
      ),
    ]);

    // Store session
    await this.db.db.insert(schema.userSessions).values({
      id: sessionId,
      userId: user.id,
      tenantId: user.tenantId,
      accessToken,
      refreshToken,
      isActive: true,
      expiresAt: new Date(Date.now() + accessExpires * 1000),
      refreshExpiresAt: new Date(Date.now() + refreshExpires * 1000),
    });

    // Update last login
    await this.db.db
      .update(schema.users)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.users.id, user.id));

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isSuperAdmin: user.isSuperadmin,
        roles,
        permissions: permissions.map((p: any) => p.slug),
        branchId,
      },
    };
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify session exists
      const [session] = await this.db.db
        .select({
          id: schema.userSessions.id,
          isActive: schema.userSessions.isActive,
        })
        .from(schema.userSessions)
        .where(
          and(
            eq(schema.userSessions.refreshToken, refreshToken),
            eq(schema.userSessions.isActive, true),
            sql`${schema.userSessions.refreshExpiresAt} > NOW()`,
          ),
        )
        .limit(1);

      if (!session) {
        throw new UnauthorizedException('Session expired or invalid');
      }

      // Get user
      const [user] = await this.db.db
        .select({
          id: schema.users.id,
          email: schema.users.email,
          tenantId: schema.users.tenantId,
          isSuperadmin: schema.users.isSuperadmin,
          isActive: schema.users.isActive,
          status: schema.users.status,
          lockedUntil: schema.users.lockedUntil,
        })
        .from(schema.users)
        .where(
          and(eq(schema.users.id, payload.sub), isNull(schema.users.deletedAt)),
        )
        .limit(1);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (
        !user.isActive ||
        user.status !== 'active' ||
        (user.lockedUntil && new Date(user.lockedUntil) > new Date())
      ) {
        throw new UnauthorizedException('User account is inactive');
      }

      const roles = await this.getUserRoles(user.id, user.tenantId);
      const permissions = await this.getUserPermissions(user.id, user.tenantId);
      const branchId = await this.getUserBranchId(user.id);

      const newPayload = {
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        isSuperAdmin: user.isSuperadmin,
        roles,
        permissions: permissions.map((p: any) => p.slug),
        branchId,
        sessionId: payload.sessionId,
      };

      const newAccessToken = await this.jwtService.signAsync(newPayload, {
        expiresIn: this.configService.get('jwt.expiresIn'),
        issuer: this.configService.get('jwt.issuer'),
      });

      return { accessToken: newAccessToken };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(sessionId: string, userId: string) {
    await this.db.db
      .update(schema.userSessions)
      .set({ isActive: false })
      .where(
        and(
          eq(schema.userSessions.id, sessionId),
          eq(schema.userSessions.userId, userId),
        ),
      );
  }

  // ─── Password Reset ────────────────────────────────────────────────────

  async requestPasswordReset(email: string, tenantId?: string) {
    const conditions = [
      eq(schema.users.email, email.trim().toLowerCase()),
      isNull(schema.users.deletedAt),
    ];

    if (tenantId) {
      conditions.push(eq(schema.users.tenantId, tenantId));
    } else {
      conditions.push(eq(schema.users.isSuperadmin, true));
    }

    const [user] = await this.db.db
      .select({ id: schema.users.id, email: schema.users.email })
      .from(schema.users)
      .where(and(...conditions))
      .limit(1);

    const genericMessage =
      'If an account exists for that email, a password reset link has been sent.';

    if (!user) {
      return { message: genericMessage };
    }

    const token = await this.jwtService.signAsync(
      { sub: user.id, type: 'password-reset' },
      {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: '15m',
        issuer: this.configService.get('jwt.issuer'),
      },
    );

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

    const smtpConfigured = !!this.configService.get<string>('SMTP_HOST');
    if (smtpConfigured) {
      await this.emailService.send({
        to: user.email ?? email,
        subject: 'Reset your School ERP password',
        html: `
          <p>Hello,</p>
          <p>We received a request to reset your School ERP password.</p>
          <p>
            <a href="${resetLink}">Reset my password</a>
          </p>
          <p>This link expires in 15 minutes. If you did not request it, you can safely ignore this email.</p>
        `,
      });
      return { message: genericMessage };
    }

    // No SMTP configured (dev/demo): surface the link so flows can still be
    // exercised. Never done in production where SMTP_HOST is set.
    return {
      message: genericMessage,
      devResetLink: resetLink,
    };
  }

  async resetPassword(token: string, newPassword: string) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('jwt.refreshSecret'),
      });
    } catch {
      throw new BadRequestException('Reset link is invalid or has expired');
    }

    if (payload.type !== 'password-reset' || !payload.sub) {
      throw new BadRequestException('Reset link is invalid or has expired');
    }

    const [user] = await this.db.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(
        and(eq(schema.users.id, payload.sub), isNull(schema.users.deletedAt)),
      )
      .limit(1);

    if (!user) {
      throw new BadRequestException('Reset link is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.db.db
      .update(schema.users)
      .set({ passwordHash, loginAttempts: 0, lockedUntil: null })
      .where(eq(schema.users.id, user.id));

    // Invalidate all active sessions for the user
    await this.db.db
      .update(schema.userSessions)
      .set({ isActive: false })
      .where(eq(schema.userSessions.userId, user.id));

    return {
      message: 'Password reset successfully. You can now sign in.',
    };
  }

  private async getUserRoles(userId: string, tenantId: string | null) {
    const roleCondition = tenantId
      ? eq(schema.roles.tenantId, tenantId)
      : isNull(schema.roles.tenantId);

    const result = await this.db.db
      .select({ slug: schema.roles.slug })
      .from(schema.roles)
      .innerJoin(schema.userRoles, eq(schema.userRoles.roleId, schema.roles.id))
      .where(and(eq(schema.userRoles.userId, userId), roleCondition));

    return result.map((r: any) => r.slug);
  }

  private async getUserPermissions(userId: string, tenantId: string | null) {
    const roleSubquery = tenantId
      ? this.db.db
          .select({ id: schema.roles.id })
          .from(schema.roles)
          .where(eq(schema.roles.tenantId, tenantId))
      : this.db.db
          .select({ id: schema.roles.id })
          .from(schema.roles)
          .where(isNull(schema.roles.tenantId));

    const result = await this.db.db
      .select({ slug: schema.permissions.slug })
      .from(schema.permissions)
      .innerJoin(
        schema.rolePermissions,
        eq(schema.rolePermissions.permissionId, schema.permissions.id),
      )
      .innerJoin(
        schema.userRoles,
        eq(schema.userRoles.roleId, schema.rolePermissions.roleId),
      )
      .where(
        and(
          eq(schema.userRoles.userId, userId),
          or(
            eq(schema.permissions.isSystem, true),
            inArray(schema.rolePermissions.roleId, roleSubquery),
          ),
        ),
      );

    const seen = new Set<string>();
    return result.filter((r) => {
      if (seen.has(r.slug)) return false;
      seen.add(r.slug);
      return true;
    });
  }
}
