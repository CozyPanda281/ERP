import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAssignmentDto {
  @ApiProperty() @IsString() @IsNotEmpty() classId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sectionId?: string;
  @ApiProperty() @IsString() @IsNotEmpty() subjectId: string;
  @ApiProperty() @IsString() @IsNotEmpty() teacherId: string;
  @ApiProperty() @IsString() @IsNotEmpty() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignmentType?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() attachmentUrls?: any[];
  @ApiProperty() @IsString() @IsNotEmpty() dueDate: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) maxMarks?: number;
}
