import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn, IsArray, IsBoolean } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty() @IsString() @IsNotEmpty() title: string;

  @ApiProperty() @IsString() @IsNotEmpty() message: string;

  @ApiPropertyOptional({ enum: ['in_app', 'email', 'sms', 'push'] })
  @IsOptional() @IsString() @IsIn(['in_app', 'email', 'sms', 'push']) type?: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'urgent'] })
  @IsOptional() @IsString() @IsIn(['low', 'medium', 'high', 'urgent']) priority?: string;

  @ApiPropertyOptional() @IsOptional() @IsArray() targetRoles?: string[];

  @ApiPropertyOptional() @IsOptional() @IsArray() targetUsers?: string[];

  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowDismiss?: boolean;
}
