import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class AddPoItemDto {
  @ApiProperty() @IsString() @IsNotEmpty() itemId: string;
  @ApiProperty() @IsNotEmpty() quantity: number;
  @ApiProperty() @IsNotEmpty() unitPrice: number;
}
