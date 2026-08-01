import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  IsDateString,
  Min,
  IsIn,
  MaxLength,
} from 'class-validator';

export class RecordPaymentDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() studentId: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() invoiceId?: string;

  @ApiProperty() @IsNumber() @Min(1) amount: number;

  @ApiPropertyOptional({
    enum: ['cash', 'cheque', 'card', 'upi', 'online', 'bank_transfer', 'dd'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['cash', 'cheque', 'card', 'upi', 'online', 'bank_transfer', 'dd'])
  paymentMethod?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() paymentDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  chequeNumber?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() chequeDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  upiId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}
