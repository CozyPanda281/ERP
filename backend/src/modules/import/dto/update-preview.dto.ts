import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class RowUpdate {
  @ApiProperty()
  @IsNumber()
  rowNumber: number;

  @ApiProperty()
  @IsObject()
  data: Record<string, string>;
}

export class UpdatePreviewDto {
  @ApiProperty({ type: [RowUpdate] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RowUpdate)
  rows: RowUpdate[];
}
