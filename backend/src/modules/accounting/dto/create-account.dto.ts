import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({ example: '1000' })
  @IsString()
  @IsNotEmpty()
  accountCode: string;

  @ApiProperty({ example: 'Cash' })
  @IsString()
  @IsNotEmpty()
  accountName: string;

  @ApiProperty({
    enum: ['asset', 'liability', 'equity', 'income', 'expense'],
    example: 'asset',
  })
  @IsEnum(['asset', 'liability', 'equity', 'income', 'expense'])
  accountType: 'asset' | 'liability' | 'equity' | 'income' | 'expense';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  openingBalance?: number;
}
