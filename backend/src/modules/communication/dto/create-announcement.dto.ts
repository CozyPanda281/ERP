import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsArray,
  IsBoolean,
} from 'class-validator';

export class CreateAnnouncementDto {
  @ApiProperty() @IsString() @IsNotEmpty() title: string;

  @ApiProperty() @IsString() @IsNotEmpty() content: string;

  @ApiPropertyOptional() @IsOptional() @IsArray() targetRoles?: string[];

  @ApiPropertyOptional() @IsOptional() @IsArray() targetClasses?: string[];

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'urgent'] })
  @IsOptional()
  @IsString()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPinned?: boolean;
}

export class UpdateAnnouncementDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() targetRoles?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() targetClasses?: string[];
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPinned?: boolean;
}
