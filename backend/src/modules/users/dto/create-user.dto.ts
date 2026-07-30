import { IsString, IsNotEmpty, IsOptional, IsEmail, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'john@school.com' }) @IsEmail() @IsNotEmpty() email: string;
  @ApiProperty({ example: '+1234567890' }) @IsOptional() @IsString() phone?: string;
  @ApiProperty() @IsString() @IsNotEmpty() password: string;
  @ApiProperty({ example: 'John' }) @IsString() @IsNotEmpty() firstName: string;
  @ApiProperty({ example: 'Doe' }) @IsString() @IsNotEmpty() lastName: string;
  @ApiProperty() @IsArray() @IsString({ each: true }) roleIds: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
}
