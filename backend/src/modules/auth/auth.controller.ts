import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants';
import { Public } from '../../common/decorators';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
      loginDto.tenantId,
    );
    return this.authService.login(user);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ORGANIZATION_OWNER,
    ROLES.PRINCIPAL,
    ROLES.RECEPTION,
    ROLES.TEACHER,
    ROLES.ACCOUNTANT,
    ROLES.HR,
    ROLES.LIBRARIAN,
    ROLES.TRANSPORT_MANAGER,
    ROLES.HOSTEL_MANAGER,
    ROLES.STUDENT,
    ROLES.PARENT,
  )
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate session' })
  async logout(@CurrentUser() user: any, @Body() dto: LogoutDto) {
    await this.authService.logout(dto.sessionId, user.id);
    return { message: 'Logged out successfully' };
  }
}
