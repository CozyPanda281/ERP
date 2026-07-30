import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class SendNotificationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
  @ApiProperty() @IsString() @IsNotEmpty() title: string;
  @ApiProperty() @IsString() @IsNotEmpty() message: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() targetRoles?: any[];
  @ApiPropertyOptional() @IsOptional() @IsArray() targetUsers?: any[];
  @ApiPropertyOptional() @IsOptional() @IsArray() metadata?: any;
  @ApiPropertyOptional() @IsOptional() @IsString() expiresAt?: string;
}
