import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CheckInDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() idProofType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() idProofNumber?: string;
  @ApiProperty() @IsString() @IsNotEmpty() purpose: string;
  @ApiPropertyOptional() @IsOptional() @IsString() personToMeet?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() department?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() badgeNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() temperature?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPreApproved?: boolean;
}
