import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsBoolean, IsArray } from 'class-validator';

export class CreateHomeworkDto {
  @ApiProperty() @IsString() @IsNotEmpty() classId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sectionId?: string;
  @ApiProperty() @IsString() @IsNotEmpty() subjectId: string;
  @ApiProperty() @IsString() @IsNotEmpty() teacherId: string;
  @ApiProperty() @IsString() @IsNotEmpty() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() attachmentUrls?: any[];
  @ApiProperty() @IsString() @IsNotEmpty() dueDate: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) maxMarks?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isMandatory?: boolean;
}
