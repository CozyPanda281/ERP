import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignPermissionsDto {
  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];
}
