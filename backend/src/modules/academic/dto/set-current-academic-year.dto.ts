import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetCurrentAcademicYearDto {
  @ApiProperty()
  @IsString()
  branchId: string;
}
