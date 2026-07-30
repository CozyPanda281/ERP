import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class IssueBookDto {
  @ApiProperty() @IsString() @IsNotEmpty() memberId: string;
  @ApiProperty() @IsString() @IsNotEmpty() bookId: string;
  @ApiProperty() @IsString() @IsNotEmpty() issueDate: string;
  @ApiProperty() @IsString() @IsNotEmpty() dueDate: string;
}
