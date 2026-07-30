import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSalaryComponentDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty() @IsString() @IsNotEmpty() type: string;
  @ApiPropertyOptional() @IsOptional() @IsString() calculationType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() value?: string;
}
