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
import { ROLES } from '../../common/constants';

@ApiTags('API Keys')
@ApiBearerAuth()
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Create an API key (secret shown once)' })
  async create(@Req() req: Request, @Body() dto: any) {
    const user = req.user as any;
    const { key, secret } = await this.apiKeysService.create(
      user.tenantId,
      user.sub,
      dto,
    );
    return { success: true, data: { key, secret } };
  }

  @Get()
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'List API keys (secrets are masked)' })
  async list(@Req() req: Request) {
    const user = req.user as any;
    const keys = await this.apiKeysService.list(user.tenantId);
    return { success: true, data: keys };
  }

  @Patch(':id')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Update API key metadata' })
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: any) {
    const user = req.user as any;
    const key = await this.apiKeysService.update(user.tenantId, id, dto);
    return { success: true, data: key };
  }

  @Post(':id/revoke')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke an API key' })
  async revoke(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    await this.apiKeysService.revoke(user.tenantId, id);
    return { success: true };
  }

  @Delete(':id')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Delete an API key' })
  async remove(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    await this.apiKeysService.delete(user.tenantId, id);
    return { success: true };
  }
}
