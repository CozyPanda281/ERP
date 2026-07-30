import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMemberDto {
  @ApiProperty() @IsString() @IsNotEmpty() memberId: string;
  @ApiProperty() @IsString() @IsNotEmpty() memberType: string;
  @ApiProperty() @IsString() @IsNotEmpty() membershipDate: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expiryDate?: string;
}
