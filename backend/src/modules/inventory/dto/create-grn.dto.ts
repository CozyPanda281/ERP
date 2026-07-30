import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateGrnDto {
  @ApiPropertyOptional() @IsOptional() @IsString() poId?: string;
  @ApiProperty() @IsString() @IsNotEmpty() receiptNumber: string;
  @ApiProperty() @IsString() @IsNotEmpty() receiptDate: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
