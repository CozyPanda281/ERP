import { IsString, IsNumber, IsOptional, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class InvoiceItemDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;
}

export class GenerateInvoiceDto {
  @ApiProperty()
  @IsString()
  studentId: string;

  @ApiProperty({ type: [InvoiceItemDto] })
  @IsArray()
  items: InvoiceItemDto[];

  @ApiProperty()
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountTotal?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty()
  @IsString()
  dueDate: string;
}
