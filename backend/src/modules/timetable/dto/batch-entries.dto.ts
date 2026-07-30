import { IsArray, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateEntryDto } from './create-entry.dto';

export class BatchEntriesDto {
  @ApiProperty({ description: '0=Monday..6=Sunday', minimum: 0, maximum: 6 })
  @IsNumber() @Min(0) @Max(6) dayOfWeek: number;

  @ApiProperty({ type: [CreateEntryDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateEntryDto)
  entries: CreateEntryDto[];
}
