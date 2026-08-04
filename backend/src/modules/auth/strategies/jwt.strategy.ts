import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DatabaseProvider } from '../../../database/database.provider';

interface JwtPayload {
  sub: string;
  email: string;
  tenantId?: string;
  isSuperAdmin: boolean;
  roles: string[];
  permissions: string[];
  branchId?: string;
  sessionId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private db: DatabaseProvider,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
      issuer: configService.get<string>('jwt.issuer') || 'erp-platform',
    });
  }

  async validate(payload: JwtPayload) {
    // Verify user still exists and is active
    const result = await this.db.query(
      `SELECT id, is_active, status FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [payload.sub],
    );

    if (!result.rows.length) {
      throw new UnauthorizedException('User not found');
    }

    const user = result.rows[0] as {
      id: string;
      is_active: boolean;
      status: string;
    };

    if (!user.is_active || user.status !== 'active') {
      throw new UnauthorizedException('User account is inactive');
    }

    return {
      sub: payload.sub,
      id: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      isSuperAdmin: payload.isSuperAdmin,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      branchId: payload.branchId,
      sessionId: payload.sessionId,
    };
  }
}
