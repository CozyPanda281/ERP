import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class AssignFeeStructureDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() feeStructureId: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() academicYearId?: string;

  @ApiProperty({ description: 'Array of student IDs or classId to assign all students in class' })
  @IsArray() @IsNotEmpty() studentIds: string[];
}
