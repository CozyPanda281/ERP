import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateCircularDto {
  @ApiProperty() @IsString() @IsNotEmpty() circularNumber: string;
  @ApiProperty() @IsString() @IsNotEmpty() title: string;
  @ApiProperty() @IsString() @IsNotEmpty() content: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() targetRoles?: any[];
  @ApiPropertyOptional() @IsOptional() @IsArray() attachmentUrls?: any[];
  @ApiProperty() @IsString() @IsNotEmpty() issueDate: string;
}
