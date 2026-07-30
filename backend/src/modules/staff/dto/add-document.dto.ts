import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AddDocumentDto {
  @ApiProperty() @IsString() @IsNotEmpty() documentType: string;
  @ApiPropertyOptional() @IsOptional() @IsString() documentNumber?: string;
  @ApiProperty() @IsString() @IsNotEmpty() fileUrl: string;
}
