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
import { BranchesService } from './branches.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { ROLES } from '../../common/constants';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { AuditLog } from '../../common/decorators/audit-log.decorator';

@ApiTags('Branches')
@ApiBearerAuth()
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @AuditLog({ action: 'post_root', module: 'branches' })
  @Post()
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.SUPER_ADMIN)
  @RequiresFeature('multi_branch')
  @ApiOperation({ summary: 'Create a branch' })
  async create(@CurrentUser() user: any, @Body() dto: CreateBranchDto) {
    const data = await this.branchesService.create({
      ...dto,
      tenantId: user.tenantId,
    });
    return { success: true, data };
  }

  @Get()
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL, ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'List branches for current tenant' })
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.branchesService.findByTenant(user.tenantId, page, limit);
  }

  @Get(':id')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL, ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get branch by ID' })
  async findById(@Param('id') id: string) {
    const data = await this.branchesService.findById(id);
    return { success: true, data };
  }

  @AuditLog({ action: 'put_id', module: 'branches', resourceIdParam: 'id' })
  @Put(':id')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update branch' })
  async update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    const data = await this.branchesService.update(id, dto);
    return { success: true, data };
  }

  @AuditLog({ action: 'delete_id', module: 'branches', resourceIdParam: 'id' })
  @Delete(':id')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete branch' })
  async remove(@Param('id') id: string) {
    await this.branchesService.softDelete(id);
    return { success: true, message: 'Branch deleted' };
  }
}
