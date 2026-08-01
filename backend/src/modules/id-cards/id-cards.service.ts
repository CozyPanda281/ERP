import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { eq, and, desc, count } from 'drizzle-orm';

@Injectable()
export class IdCardsService {
  constructor(private readonly db: DatabaseProvider) {}

  async createTemplate(params: {
    tenantId: string;
    branchId: string;
    name: string;
    templateType: string;
    designConfig: any;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.idCardTemplates)
      .values(params)
      .returning({ id: schema.idCardTemplates.id });
    const [tpl] = await this.db.db
      .select()
      .from(schema.idCardTemplates)
      .where(eq(schema.idCardTemplates.id, inserted.id))
      .limit(1);
    return tpl;
  }

  async findTemplatesByBranch(branchId: string) {
    return this.db.db
      .select()
      .from(schema.idCardTemplates)
      .where(eq(schema.idCardTemplates.branchId, branchId))
      .orderBy(desc(schema.idCardTemplates.createdAt));
  }

  async findTemplateById(id: string) {
    const [result] = await this.db.db
      .select()
      .from(schema.idCardTemplates)
      .where(eq(schema.idCardTemplates.id, id))
      .limit(1);
    if (!result) throw new NotFoundException('Template not found');
    return result;
  }

  async createCertificateTemplate(params: {
    tenantId: string;
    branchId: string;
    name: string;
    certificateType: string;
    designConfig: any;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.certificateTemplates)
      .values(params)
      .returning({ id: schema.certificateTemplates.id });
    const [tpl] = await this.db.db
      .select()
      .from(schema.certificateTemplates)
      .where(eq(schema.certificateTemplates.id, inserted.id))
      .limit(1);
    return tpl;
  }

  async findCertificateTemplatesByBranch(branchId: string) {
    return this.db.db
      .select()
      .from(schema.certificateTemplates)
      .where(eq(schema.certificateTemplates.branchId, branchId))
      .orderBy(desc(schema.certificateTemplates.createdAt));
  }

  async findCertificateTemplateById(id: string) {
    const [result] = await this.db.db
      .select()
      .from(schema.certificateTemplates)
      .where(eq(schema.certificateTemplates.id, id))
      .limit(1);
    if (!result) throw new NotFoundException('Certificate template not found');
    return result;
  }

  async issueCertificate(params: {
    tenantId: string;
    branchId: string;
    certificateNumber: string;
    templateId?: string;
    recipientType: string;
    recipientId: string;
    issuedDate: string;
    issueReason?: string;
    certificateUrl?: string;
    signedBy?: string;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.certificates)
      .values(params)
      .returning({ id: schema.certificates.id });
    const [cert] = await this.db.db
      .select()
      .from(schema.certificates)
      .where(eq(schema.certificates.id, inserted.id))
      .limit(1);
    return cert;
  }

  async findCertificatesByBranch(
    branchId: string,
    query?: { page?: number; limit?: number },
  ) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions = [eq(schema.certificates.branchId, branchId)];
    const data = await this.db.db
      .select()
      .from(schema.certificates)
      .where(and(...conditions))
      .orderBy(desc(schema.certificates.createdAt))
      .limit(limit)
      .offset(offset);
    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.certificates)
      .where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findCertificateById(id: string) {
    const [result] = await this.db.db
      .select()
      .from(schema.certificates)
      .where(eq(schema.certificates.id, id))
      .limit(1);
    if (!result) throw new NotFoundException('Certificate not found');
    return result;
  }
}
