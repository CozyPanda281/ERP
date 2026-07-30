import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsArray, IsNotEmpty } from 'class-validator';

export class SubmitHomeworkDto {
  @ApiProperty() @IsString() @IsNotEmpty() studentId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() submissionText?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() attachmentUrls?: any[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isLate?: boolean;
}
