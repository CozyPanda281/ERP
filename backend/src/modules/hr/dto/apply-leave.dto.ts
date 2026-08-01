import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsNumber,
} from 'class-validator';

export class ApplyLeaveDto {
  @ApiProperty() @IsString() @IsNotEmpty() leaveTypeId: string;
  @ApiProperty() @IsDateString() startDate: string;
  @ApiProperty() @IsDateString() endDate: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class ReviewLeaveDto {
  @ApiProperty() @IsString() @IsNotEmpty() action: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rejectReason?: string;
}
