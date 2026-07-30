import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePlanDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  planId: string;
}
