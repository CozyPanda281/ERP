import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEntryDto {
  @ApiPropertyOptional({ minimum: 0, maximum: 6 })
  @IsOptional() @IsNumber() @Min(0) @Max(6) dayOfWeek?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() subjectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() teacherId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() startTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() roomNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBreak?: boolean;
}
