import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GradeSubmissionDto {
  @ApiProperty() @IsString() @IsNotEmpty() marksObtained: string;
  @ApiPropertyOptional() @IsOptional() @IsString() feedback?: string;
}
