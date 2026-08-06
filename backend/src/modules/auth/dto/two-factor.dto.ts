import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class TwoFactorCodeDto {
  @ApiProperty({
    example: '287082',
    description: 'Six-digit TOTP code from the authenticator app, or a recovery code',
  })
  @IsString()
  @Matches(/^[0-9]{6}$|^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, {
    message: 'Code must be 6 digits or a recovery code like ABCD-EFGH-IJKL',
  })
  code: string;
}

export class TwoFactorLoginDto {
  @ApiProperty({
    description: 'Short-lived mfaToken issued by login when 2FA is enabled',
  })
  @IsString()
  mfaToken: string;

  @ApiProperty({
    example: '287082',
    description: 'Six-digit TOTP code or a recovery code',
  })
  @IsString()
  code: string;
}