import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'Springfield Elementary' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'springfield-elem' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional({ example: 'admin@school.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Plan ID (UUID)' })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({ example: 'owner@school.com' })
  @IsEmail()
  @IsNotEmpty()
  ownerEmail: string;

  @ApiProperty({ example: 'Owner@123' })
  @IsString()
  @IsNotEmpty()
  ownerPassword: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  ownerFirstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  ownerLastName: string;
}
