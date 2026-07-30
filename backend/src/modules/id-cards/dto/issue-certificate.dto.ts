import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class IssueCertificateDto {
  @ApiProperty() @IsString() @IsNotEmpty() certificateNumber: string;
  @ApiPropertyOptional() @IsOptional() @IsString() templateId?: string;
  @ApiProperty() @IsString() @IsNotEmpty() recipientType: string;
  @ApiProperty() @IsString() @IsNotEmpty() recipientId: string;
  @ApiProperty() @IsString() @IsNotEmpty() issuedDate: string;
  @ApiPropertyOptional() @IsOptional() @IsString() issueReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() certificateUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() signedBy?: string;
}
