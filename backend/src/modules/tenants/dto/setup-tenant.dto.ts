import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetupTenantDto {
  @ApiProperty({ example: 'Main Campus' }) @IsString() @IsNotEmpty() branchName: string;
  @ApiProperty({ example: 'MAIN' }) @IsString() @IsNotEmpty() branchCode: string;
  @ApiProperty({ example: '2026-2027' }) @IsString() @IsNotEmpty() academicYearName: string;
  @ApiProperty({ example: '2026-04-01' }) @IsString() @IsNotEmpty() academicYearStart: string;
  @ApiProperty({ example: '2027-03-31' }) @IsString() @IsNotEmpty() academicYearEnd: string;
  @ApiPropertyOptional({ example: 'Grade 1' }) @IsOptional() @IsString() className?: string;
}
