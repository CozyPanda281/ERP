import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePlanFeatureDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}
