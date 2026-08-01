import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class CreateAnnouncementDto {
  @ApiProperty() @IsString() @IsNotEmpty() title: string;
  @ApiProperty() @IsString() @IsNotEmpty() content: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() targetRoles?: any[];
  @ApiPropertyOptional() @IsOptional() @IsArray() targetClasses?: any[];
  @ApiPropertyOptional() @IsOptional() @IsArray() attachmentUrls?: any[];
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPinned?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() publishedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expiresAt?: string;
}
