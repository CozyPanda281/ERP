import { IsString, IsOptional, IsUUID, IsEnum, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAccountDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  accountCode?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  accountName?: string;

  @ApiPropertyOptional({ enum: ['asset', 'liability', 'equity', 'income', 'expense'] })
  @IsOptional() @IsEnum(['asset', 'liability', 'equity', 'income', 'expense'])
  accountType?: 'asset' | 'liability' | 'equity' | 'income' | 'expense';

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  parentId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  openingBalance?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  status?: string;
}
