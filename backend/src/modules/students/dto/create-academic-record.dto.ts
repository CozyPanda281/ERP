import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';

export class CreateAcademicRecordDto {
  @ApiProperty()
  @IsUUID()
  classId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @ApiProperty()
  @IsUUID()
  academicYearId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rollNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPromoted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  promotedToClass?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  promotionDate?: string;
}
