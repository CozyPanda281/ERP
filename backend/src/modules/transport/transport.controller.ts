import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransportService } from './transport.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { AssignStudentDto } from './dto/assign-student.dto';
import { TransportQueryDto } from './dto/transport-query.dto';

@ApiTags('Transport')
@ApiBearerAuth()
@Controller('transport')
export class TransportController {
  constructor(private readonly service: TransportService) {}

  @Post('vehicles')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create a vehicle' })
  async createVehicle(@Body() body: CreateVehicleDto, @CurrentUser() user: any) {
    const data = await this.service.createVehicle({ ...body, tenantId: user.tenantId, branchId: user.branchId });
    return { success: true, data };
  }

  @Get('vehicles')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List vehicles' })
  async getVehicles(@CurrentUser() user: any, @Query() query: TransportQueryDto) {
    const data = await this.service.findVehiclesByBranch(user.branchId, query);
    return { success: true, ...data };
  }

  @Get('vehicles/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Get vehicle by ID' })
  async getVehicleById(@Param('id') id: string) {
    const data = await this.service.findVehicleById(id);
    return { success: true, data };
  }

  @Put('vehicles/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update vehicle' })
  async updateVehicle(@Param('id') id: string, @Body() body: UpdateVehicleDto) {
    const data = await this.service.updateVehicle(id, body);
    return { success: true, data };
  }

  @Delete('vehicles/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Delete vehicle' })
  async deleteVehicle(@Param('id') id: string) {
    return this.service.deleteVehicle(id);
  }

  @Post('routes')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create a route' })
  async createRoute(@Body() body: CreateRouteDto, @CurrentUser() user: any) {
    const data = await this.service.createRoute({ ...body, tenantId: user.tenantId, branchId: user.branchId });
    return { success: true, data };
  }

  @Get('routes')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List routes' })
  async getRoutes(@CurrentUser() user: any, @Query() query: TransportQueryDto) {
    const data = await this.service.findRoutesByBranch(user.branchId, query);
    return { success: true, ...data };
  }

  @Get('routes/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Get route by ID' })
  async getRouteById(@Param('id') id: string) {
    const data = await this.service.findRouteById(id);
    return { success: true, data };
  }

  @Put('routes/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update route' })
  async updateRoute(@Param('id') id: string, @Body() body: UpdateRouteDto) {
    const data = await this.service.updateRoute(id, body);
    return { success: true, data };
  }

  @Delete('routes/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Delete route' })
  async deleteRoute(@Param('id') id: string) {
    return this.service.deleteRoute(id);
  }

  @Post('assignments')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Assign student to route' })
  async assignStudent(@Body() body: AssignStudentDto, @CurrentUser() user: any) {
    const data = await this.service.assignStudent({ ...body, tenantId: user.tenantId, branchId: user.branchId });
    return { success: true, data };
  }

  @Get('assignments')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List assignments' })
  async getAssignments(@CurrentUser() user: any, @Query() query: TransportQueryDto) {
    const data = await this.service.findAssignmentsByBranch(user.branchId, query);
    return { success: true, ...data };
  }

  @Delete('assignments/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Unassign student' })
  async unassignStudent(@Param('id') id: string) {
    return this.service.unassignStudent(id);
  }
}
