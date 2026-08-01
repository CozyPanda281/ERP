import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@school.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Tenant ID (not required for SuperAdmin)',
  })
  @IsOptional()
  @IsString()
  tenantId?: string;
}
