import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEntryDto {
  @ApiProperty({ description: '0=Sunday..6=Saturday (JS Date.getDay convention)', minimum: 0, maximum: 6 })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(6)
  dayOfWeek: number;
  @ApiProperty() @IsUUID() @IsNotEmpty() subjectId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() teacherId?: string;
  @ApiProperty({ example: '08:00' })
  @IsString()
  @IsNotEmpty()
  startTime: string;
  @ApiProperty({ example: '08:45' }) @IsString() @IsNotEmpty() endTime: string;
  @ApiPropertyOptional() @IsOptional() @IsString() roomNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBreak?: boolean;
}
