import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseProvider } from '../../database/database.provider';
import { eq, and, isNull, or, desc, sql, inArray } from 'drizzle-orm';
import * as schema from '../../database/schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseProvider,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

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

    const [user] = await this.db.db.select()
      .from(schema.users)
      .where(and(...conditions))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive || user.status !== 'active') {
      throw new UnauthorizedException('Account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(user: any) {
    const sessionId = uuidv4();
    const roles = await this.getUserRoles(user.id, user.tenantId);
    const permissions = await this.getUserPermissions(
      user.id,
      user.tenantId,
    );

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      isSuperAdmin: user.isSuperadmin,
      roles,
      permissions: permissions.map((p: any) => p.slug),
      sessionId,
    };

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
      expiresAt: sql`NOW() + INTERVAL '15 minutes'`,
      refreshExpiresAt: sql`NOW() + INTERVAL '7 days'`,
    });

    // Update last login
    await this.db.db.update(schema.users)
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
      const [session] = await this.db.db.select({
        id: schema.userSessions.id,
        isActive: schema.userSessions.isActive,
      })
        .from(schema.userSessions)
        .where(and(
          eq(schema.userSessions.refreshToken, refreshToken),
          eq(schema.userSessions.isActive, true),
          sql`${schema.userSessions.refreshExpiresAt} > NOW()`,
        ))
        .limit(1);

      if (!session) {
        throw new UnauthorizedException('Session expired or invalid');
      }

      // Get user
      const [user] = await this.db.db.select({
        id: schema.users.id,
        email: schema.users.email,
        tenantId: schema.users.tenantId,
        isSuperadmin: schema.users.isSuperadmin,
      })
        .from(schema.users)
        .where(and(eq(schema.users.id, payload.sub), isNull(schema.users.deletedAt)))
        .limit(1);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const roles = await this.getUserRoles(user.id, user.tenantId);
      const permissions = await this.getUserPermissions(
        user.id,
        user.tenantId,
      );

      const newPayload = {
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        isSuperAdmin: user.isSuperadmin,
        roles,
        permissions: permissions.map((p: any) => p.slug),
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
    await this.db.db.update(schema.userSessions)
      .set({ isActive: false })
      .where(and(eq(schema.userSessions.id, sessionId), eq(schema.userSessions.userId, userId)));
  }

  private async getUserRoles(userId: string, tenantId: string | null) {
    const roleCondition = tenantId
      ? eq(schema.roles.tenantId, tenantId)
      : isNull(schema.roles.tenantId);

    const result = await this.db.db.select({ slug: schema.roles.slug })
      .from(schema.roles)
      .innerJoin(schema.userRoles, eq(schema.userRoles.roleId, schema.roles.id))
      .where(and(eq(schema.userRoles.userId, userId), roleCondition));

    return result.map((r: any) => r.slug);
  }

  private async getUserPermissions(
    userId: string,
    tenantId: string | null,
  ) {
    const roleSubquery = tenantId
      ? this.db.db.select({ id: schema.roles.id }).from(schema.roles)
          .where(eq(schema.roles.tenantId, tenantId))
      : this.db.db.select({ id: schema.roles.id }).from(schema.roles)
          .where(isNull(schema.roles.tenantId));

    const result = await this.db.db.select({ slug: schema.permissions.slug })
      .from(schema.permissions)
      .innerJoin(schema.rolePermissions, eq(schema.rolePermissions.permissionId, schema.permissions.id))
      .innerJoin(schema.userRoles, eq(schema.userRoles.roleId, schema.rolePermissions.roleId))
      .where(and(
        eq(schema.userRoles.userId, userId),
        or(eq(schema.permissions.isSystem, true), inArray(schema.rolePermissions.roleId, roleSubquery))
      ));

    const seen = new Set<string>();
    return result.filter(r => {
      if (seen.has(r.slug)) return false;
      seen.add(r.slug);
      return true;
    });
  }
}
