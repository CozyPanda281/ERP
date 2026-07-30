import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty() @IsString() @IsNotEmpty() vehicleNumber: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) capacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() driverName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() insuranceExpiry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
