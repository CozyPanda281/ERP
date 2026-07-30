import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class CreateLessonPlanDto {
  @ApiProperty() @IsString() @IsNotEmpty() teacherId: string;
  @ApiProperty() @IsString() @IsNotEmpty() subjectId: string;
  @ApiProperty() @IsString() @IsNotEmpty() classId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sectionId?: string;
  @ApiProperty() @IsString() @IsNotEmpty() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() objectives?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() teachingMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resources?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) durationMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() date?: string;
}
