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
import { ROLES, TENANT_CONTEXT_KEY } from '../../common/constants';

@ApiTags('Webhooks')
@ApiBearerAuth()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  private resolveTenantId(req: Request): string | null {
    const user = req.user as any;
    const tenantContext = (req as any)[TENANT_CONTEXT_KEY] as
      { tenantId?: string } | null | undefined;
    return user?.tenantId ?? tenantContext?.tenantId ?? null;
  }

  @Get('events')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'List available webhook events' })
  events() {
    return { success: true, data: WEBHOOK_EVENTS };
  }

  @Post()
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a webhook endpoint' })
  async create(@Req() req: Request, @Body() dto: any) {
    const user = req.user as any;
    const endpoint = await this.webhooksService.create(
      this.resolveTenantId(req) as string,
      user.sub,
      dto,
    );
    return { success: true, data: endpoint };
  }

  @Get()
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'List webhook endpoints' })
  async list(@Req() req: Request) {
    const endpoints = await this.webhooksService.list(
      this.resolveTenantId(req) as string,
    );
    return { success: true, data: endpoints };
  }

  @Patch(':id')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a webhook endpoint' })
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: any) {
    const endpoint = await this.webhooksService.update(
      this.resolveTenantId(req) as string,
      id,
      dto,
    );
    return { success: true, data: endpoint };
  }

  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a webhook endpoint' })
  async remove(@Req() req: Request, @Param('id') id: string) {
    await this.webhooksService.remove(this.resolveTenantId(req) as string, id);
    return { success: true };
  }

  @Post(':id/test')
  @HttpCode(200)
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Send a test ping to a webhook endpoint' })
  async test(@Req() req: Request, @Param('id') id: string) {
    await this.webhooksService.sendTest(
      this.resolveTenantId(req) as string,
      id,
    );
    return { success: true, data: { event: 'test.ping' } };
  }

  @Get('deliveries')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'List webhook delivery attempts' })
  async deliveries(
    @Req() req: Request,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('endpointId') endpointId?: string,
  ) {
    const data = await this.webhooksService.listDeliveries(
      this.resolveTenantId(req) as string,
      {
        limit: limit ? parseInt(limit, 10) : undefined,
        status,
        endpointId,
      },
    );
    return { success: true, data };
  }

  @Post('deliveries/:id/retry')
  @HttpCode(200)
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Manually retry a failed delivery' })
  async retry(@Req() req: Request, @Param('id') id: string) {
    await this.webhooksService.retryDelivery(
      this.resolveTenantId(req) as string,
      id,
    );
    return { success: true };
  }
}
