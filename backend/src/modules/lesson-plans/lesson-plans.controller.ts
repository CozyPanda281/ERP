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
import { LessonPlansService } from './lesson-plans.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';
import { CreateLessonPlanDto } from './dto/create-lesson-plan.dto';
import { UpdateLessonPlanDto } from './dto/update-lesson-plan.dto';
import { LessonPlanQueryDto } from './dto/lesson-plan-query.dto';

@ApiTags('Lesson Plans')
@ApiBearerAuth()
@Controller('lesson-plans')
export class LessonPlansController {
  constructor(private readonly service: LessonPlansService) {}

  @Post()
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create lesson plan' })
  async create(@Body() body: CreateLessonPlanDto, @CurrentUser() user: any) {
    const data = await this.service.create({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get()
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List lesson plans' })
  async findAll(@CurrentUser() user: any, @Query() query: LessonPlanQueryDto) {
    const data = await this.service.findByBranch(user.branchId, query);
    return { success: true, ...data };
  }

  @Get(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Get lesson plan by ID' })
  async findById(@Param('id') id: string) {
    const data = await this.service.findById(id);
    return { success: true, data };
  }

  @Put(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update lesson plan' })
  async update(@Param('id') id: string, @Body() body: UpdateLessonPlanDto) {
    const data = await this.service.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Delete lesson plan' })
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
