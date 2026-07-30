import { IsString, IsNotEmpty, IsOptional, IsUUID, IsDateString, IsArray, ValidateNested, IsIn, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StudentAttendanceDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() studentId: string;
  @ApiProperty({ enum: ['present', 'absent', 'late', 'excused'] })
  @IsString() @IsNotEmpty() @IsIn(['present', 'absent', 'late', 'excused']) status: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) remarks?: string;
}

export class CreateAttendanceSessionDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() timetableEntryId: string;
  @ApiProperty() @IsDateString() @IsNotEmpty() date: string;

  @ApiProperty({ type: [StudentAttendanceDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => StudentAttendanceDto)
  records: StudentAttendanceDto[];
}
