import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AllocateBedDto {
  @ApiProperty() @IsString() @IsNotEmpty() roomId: string;
  @ApiProperty() @IsString() @IsNotEmpty() studentId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bedNumber?: string;
  @ApiProperty() @IsString() @IsNotEmpty() allocationDate: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}
