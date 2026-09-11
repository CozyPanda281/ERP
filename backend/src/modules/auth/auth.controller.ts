import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TwoFactorCodeDto, TwoFactorLoginDto } from './dto/two-factor.dto';
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

    if (user.twoFactorEnabled) {
      const mfaToken = await this.authService.issueTwoFactorChallenge(user.id);
      return {
        requiresTwoFactor: true,
        mfaToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      };
    }

    return this.authService.login(user);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('2fa/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete login with a TOTP code or recovery code' })
  async twoFactorLogin(@Body() dto: TwoFactorLoginDto) {
    return this.authService.completeTwoFactorLogin(dto.mfaToken, dto.code);
  }

  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Start 2FA setup (returns TOTP secret + otpauth URL)',
  })
  async twoFactorSetup(@CurrentUser() user: any) {
    return this.authService.startTwoFactorSetup(user.id);
  }

  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify a code and enable 2FA; returns one-time recovery codes',
  })
  async twoFactorVerify(
    @CurrentUser() user: any,
    @Body() dto: TwoFactorCodeDto,
  ) {
    return this.authService.enableTwoFactor(user.id, dto.code);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA after verifying the current code' })
  async twoFactorDisable(
    @CurrentUser() user: any,
    @Body() dto: TwoFactorCodeDto,
  ) {
    return this.authService.disableTwoFactor(user.id, dto.code);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(refreshTokenDto.refreshToken);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset link' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email, dto.tenantId);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with a token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
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
