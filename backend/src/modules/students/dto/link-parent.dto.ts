import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsBoolean } from 'class-validator';

export class LinkParentDto {
  @ApiProperty()
  @IsUUID()
  parentId: string;

  @ApiProperty()
  @IsString()
  relationship: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEmergencyContact?: boolean;
}
