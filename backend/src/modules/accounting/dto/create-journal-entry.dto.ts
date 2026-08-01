import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class JournalEntryItemDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({ default: 0 })
  @IsNumber()
  @Min(0)
  debit: number;

  @ApiProperty({ default: 0 })
  @IsNumber()
  @Min(0)
  credit: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateJournalEntryDto {
  @ApiProperty({ example: '2026-07-31' })
  @IsString()
  @IsNotEmpty()
  entryDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entryType?: string;

  @ApiProperty({ type: [JournalEntryItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalEntryItemDto)
  items: JournalEntryItemDto[];
}
