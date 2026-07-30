import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL, ROLES.HR, ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a user within a tenant' })
  async create(@CurrentUser() user: any, @Body() dto: CreateUserDto) {
    const data = await this.usersService.create({ ...dto, tenantId: user.tenantId });
    return { success: true, data };
  }

  @Post('bulk')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL, ROLES.HR)
  @ApiOperation({ summary: 'Bulk import users' })
  async bulkCreate(@CurrentUser() user: any, @Body('users') users: CreateUserDto[]) {
    const data = await this.usersService.bulkCreate(user.tenantId, users);
    return { success: true, data };
  }

  @Get()
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL, ROLES.HR, ROLES.TEACHER)
  @ApiOperation({ summary: 'List users for current tenant' })
  async findAll(@CurrentUser() user: any, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.usersService.findByTenant(user.tenantId, page, limit);
  }

  @Get(':id')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL, ROLES.HR)
  @ApiOperation({ summary: 'Get user by ID' })
  async findById(@Param('id') id: string, @CurrentUser() user: any) {
    const data = await this.usersService.findById(id, user.tenantId);
    return { success: true, data };
  }

  @Put(':id')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL, ROLES.HR, ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update user' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: any) {
    const data = await this.usersService.update(id, user.tenantId, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL, ROLES.HR, ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft delete user' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.usersService.softDelete(id, user.tenantId);
    return { success: true, message: 'User deleted' };
  }
}
