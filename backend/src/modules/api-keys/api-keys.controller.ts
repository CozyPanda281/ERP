import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiKeysService } from './api-keys.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES, TENANT_CONTEXT_KEY } from '../../common/constants';

@ApiTags('API Keys')
@ApiBearerAuth()
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  private resolveTenantId(req: Request): string | null {
    const user = req.user as any;
    const tenantContext = (req as any)[TENANT_CONTEXT_KEY] as
      { tenantId?: string } | null | undefined;
    return user?.tenantId ?? tenantContext?.tenantId ?? null;
  }

  @Post()
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create an API key (secret shown once)' })
  async create(@Req() req: Request, @Body() dto: any) {
    const user = req.user as any;
    const { key, secret } = await this.apiKeysService.create(
      this.resolveTenantId(req) as string,
      user.sub,
      dto,
    );
    return { success: true, data: { key, secret } };
  }

  @Get()
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'List API keys (secrets are masked)' })
  async list(@Req() req: Request) {
    const keys = await this.apiKeysService.list(
      this.resolveTenantId(req) as string,
    );
    return { success: true, data: keys };
  }

  @Patch(':id')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update API key metadata' })
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: any) {
    const key = await this.apiKeysService.update(
      this.resolveTenantId(req) as string,
      id,
      dto,
    );
    return { success: true, data: key };
  }

  @Post(':id/revoke')
  @Roles(ROLES.SUPER_ADMIN)
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke an API key' })
  async revoke(@Req() req: Request, @Param('id') id: string) {
    await this.apiKeysService.revoke(this.resolveTenantId(req) as string, id);
    return { success: true };
  }

  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete an API key' })
  async remove(@Req() req: Request, @Param('id') id: string) {
    await this.apiKeysService.delete(this.resolveTenantId(req) as string, id);
    return { success: true };
  }
}
