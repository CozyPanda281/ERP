import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AssignStudentDto {
  @ApiProperty() @IsString() @IsNotEmpty() studentId: string;
  @ApiProperty() @IsString() @IsNotEmpty() routeId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stopId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() academicYearId?: string;
  @ApiProperty() @IsString() @IsNotEmpty() effectiveFrom: string;
  @ApiPropertyOptional() @IsOptional() @IsString() effectiveTo?: string;
}
