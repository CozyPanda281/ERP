import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveBatchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
