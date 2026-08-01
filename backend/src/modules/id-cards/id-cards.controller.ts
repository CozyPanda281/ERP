import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IdCardsService } from './id-cards.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';
import { CreateIdCardTemplateDto } from './dto/create-id-card-template.dto';
import { CreateCertificateTemplateDto } from './dto/create-certificate-template.dto';
import { IssueCertificateDto } from './dto/issue-certificate.dto';
import { IdCardQueryDto } from './dto/id-card-query.dto';

@ApiTags('ID Cards & Certificates')
@ApiBearerAuth()
@Controller('id-cards')
export class IdCardsController {
  constructor(private readonly service: IdCardsService) {}

  @Post('templates')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create ID card template' })
  async createTemplate(
    @Body() body: CreateIdCardTemplateDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.createTemplate({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get('templates')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List ID card templates' })
  async getTemplates(@CurrentUser() user: any) {
    const data = await this.service.findTemplatesByBranch(user.branchId);
    return { success: true, data };
  }

  @Get('templates/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Get template by ID' })
  async getTemplateById(@Param('id') id: string) {
    const data = await this.service.findTemplateById(id);
    return { success: true, data };
  }

  @Post('certificate-templates')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create certificate template' })
  async createCertificateTemplate(
    @Body() body: CreateCertificateTemplateDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.createCertificateTemplate({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get('certificate-templates')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List certificate templates' })
  async getCertificateTemplates(@CurrentUser() user: any) {
    const data = await this.service.findCertificateTemplatesByBranch(
      user.branchId,
    );
    return { success: true, data };
  }

  @Get('certificate-templates/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Get certificate template' })
  async getCertificateTemplateById(@Param('id') id: string) {
    const data = await this.service.findCertificateTemplateById(id);
    return { success: true, data };
  }

  @Post('certificates')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Issue certificate' })
  async issueCertificate(
    @Body() body: IssueCertificateDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.issueCertificate({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get('certificates')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List certificates' })
  async getCertificates(
    @CurrentUser() user: any,
    @Query() query: IdCardQueryDto,
  ) {
    const data = await this.service.findCertificatesByBranch(
      user.branchId,
      query,
    );
    return { success: true, ...data };
  }

  @Get('certificates/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Get certificate by ID' })
  async getCertificateById(@Param('id') id: string) {
    const data = await this.service.findCertificateById(id);
    return { success: true, data };
  }
}
