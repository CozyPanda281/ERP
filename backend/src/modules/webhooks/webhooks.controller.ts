import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { WebhooksService, WEBHOOK_EVENTS } from './webhooks.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants';

@ApiTags('Webhooks')
@ApiBearerAuth()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get('events')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'List available webhook events' })
  events() {
    return { success: true, data: WEBHOOK_EVENTS };
  }

  @Post()
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Create a webhook endpoint' })
  async create(@Req() req: Request, @Body() dto: any) {
    const user = req.user as any;
    const endpoint = await this.webhooksService.create(
      user.tenantId,
      user.sub,
      dto,
    );
    return { success: true, data: endpoint };
  }

  @Get()
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'List webhook endpoints' })
  async list(@Req() req: Request) {
    const user = req.user as any;
    const endpoints = await this.webhooksService.list(user.tenantId);
    return { success: true, data: endpoints };
  }

  @Patch(':id')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Update a webhook endpoint' })
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: any) {
    const user = req.user as any;
    const endpoint = await this.webhooksService.update(user.tenantId, id, dto);
    return { success: true, data: endpoint };
  }

  @Delete(':id')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Delete a webhook endpoint' })
  async remove(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    await this.webhooksService.remove(user.tenantId, id);
    return { success: true };
  }

  @Post(':id/test')
  @HttpCode(200)
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Send a test ping to a webhook endpoint' })
  async test(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    await this.webhooksService.sendTest(user.tenantId, id);
    return { success: true, data: { event: 'test.ping' } };
  }

  @Get('deliveries')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'List webhook delivery attempts' })
  async deliveries(
    @Req() req: Request,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('endpointId') endpointId?: string,
  ) {
    const user = req.user as any;
    const data = await this.webhooksService.listDeliveries(user.tenantId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      endpointId,
    });
    return { success: true, data };
  }

  @Post('deliveries/:id/retry')
  @HttpCode(200)
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Manually retry a failed delivery' })
  async retry(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    await this.webhooksService.retryDelivery(user.tenantId, id);
    return { success: true };
  }
}
