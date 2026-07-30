import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IdParamDto {
  @ApiProperty({ description: 'UUID' })
  @IsUUID()
  id: string;
}
