import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class CreateHostelDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() wardenId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) totalRooms?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) totalBeds?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
