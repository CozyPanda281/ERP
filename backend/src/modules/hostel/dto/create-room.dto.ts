import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty() @IsString() @IsNotEmpty() roomNumber: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() floor?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) capacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) bedCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() roomType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rentAmount?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
