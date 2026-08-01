import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LibraryService } from './library.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { IssueBookDto } from './dto/issue-book.dto';
import { LibraryQueryDto } from './dto/library-query.dto';

@ApiTags('Library')
@ApiBearerAuth()
@Controller('library')
export class LibraryController {
  constructor(private readonly service: LibraryService) {}

  @Post('books')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create a book' })
  async createBook(@Body() body: CreateBookDto, @CurrentUser() user: any) {
    const data = await this.service.createBook({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get('books')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List books' })
  async getBooks(@CurrentUser() user: any, @Query() query: LibraryQueryDto) {
    const data = await this.service.findBooksByBranch(user.branchId, query);
    return { success: true, ...data };
  }

  @Get('books/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Get book by ID' })
  async getBookById(@Param('id') id: string) {
    const data = await this.service.findBookById(id);
    return { success: true, data };
  }

  @Put('books/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update book' })
  async updateBook(@Param('id') id: string, @Body() body: UpdateBookDto) {
    const data = await this.service.updateBook(id, body);
    return { success: true, data };
  }

  @Delete('books/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Delete book' })
  async deleteBook(@Param('id') id: string) {
    return this.service.deleteBook(id);
  }

  @Post('members')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create a library member' })
  async createMember(@Body() body: CreateMemberDto, @CurrentUser() user: any) {
    const data = await this.service.createMember({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get('members')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List members' })
  async getMembers(@CurrentUser() user: any, @Query() query: LibraryQueryDto) {
    const data = await this.service.findMembersByBranch(user.branchId, query);
    return { success: true, ...data };
  }

  @Post('issues')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Issue a book' })
  async issueBook(@Body() body: IssueBookDto, @CurrentUser() user: any) {
    const data = await this.service.issueBook({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Post('issues/:id/return')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Return a book' })
  async returnBook(@Param('id') id: string) {
    return this.service.returnBook(id);
  }

  @Get('issues')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List issues' })
  async getIssues(@CurrentUser() user: any, @Query() query: LibraryQueryDto) {
    const data = await this.service.findIssuesByBranch(user.branchId, query);
    return { success: true, ...data };
  }
}
