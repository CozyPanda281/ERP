import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTenantStatusDto {
  @ApiProperty()
  @IsString()
  @IsIn(['active', 'suspended', 'cancelled'])
  status: string;
}
