import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, Min, IsOptional } from 'class-validator';

export class RequestLeaveDto {
  @ApiProperty() @IsString() @IsNotEmpty() staffId: string;
  @ApiProperty() @IsString() @IsNotEmpty() leaveTypeId: string;
  @ApiProperty() @IsString() @IsNotEmpty() startDate: string;
  @ApiProperty() @IsString() @IsNotEmpty() endDate: string;
  @ApiProperty() @IsInt() @Min(1) totalDays: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() documentUrl?: string;
}
