import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DatabaseProvider) {}

  async createTemplate(params: {
    tenantId: string;
    name: string;
    code: string;
    type: string;
    subject?: string;
    body: string;
    variables?: any[];
  }) {
    const [inserted] = await this.db.db
      .insert(schema.notificationTemplates)
      .values(params)
      .returning({ id: schema.notificationTemplates.id });
    const [tpl] = await this.db.db
      .select()
      .from(schema.notificationTemplates)
      .where(eq(schema.notificationTemplates.id, inserted.id))
      .limit(1);
    return tpl;
  }

  async findTemplatesByTenant(tenantId: string) {
    return this.db.db
      .select()
      .from(schema.notificationTemplates)
      .where(
        and(
          eq(schema.notificationTemplates.tenantId, tenantId),
          eq(schema.notificationTemplates.isActive, true),
        ),
      )
      .orderBy(schema.notificationTemplates.name);
  }

  async sendNotification(params: {
    tenantId: string;
    branchId?: string;
    senderId?: string;
    title: string;
    message: string;
    type?: string;
    priority?: string;
    targetRoles?: any[];
    targetUsers?: any[];
    metadata?: any;
    expiresAt?: string;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.notifications)
      .values({
        ...params,
        expiresAt: params.expiresAt ? new Date(params.expiresAt) : undefined,
      })
      .returning({ id: schema.notifications.id });
    const [notif] = await this.db.db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.id, inserted.id))
      .limit(1);
    return notif;
  }

  async findNotificationsByTenant(
    tenantId: string,
    query?: { page?: number; limit?: number; type?: string },
  ) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.notifications.tenantId, tenantId)];
    if (query?.type) conditions.push(eq(schema.notifications.type, query.type));
    const data = await this.db.db
      .select()
      .from(schema.notifications)
      .where(and(...conditions))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(limit)
      .offset(offset);
    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.notifications)
      .where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async createAnnouncement(params: {
    tenantId: string;
    branchId: string;
    title: string;
    content: string;
    targetRoles?: any[];
    targetClasses?: any[];
    attachmentUrls?: any[];
    priority?: string;
    isPinned?: boolean;
    publishedAt?: string;
    expiresAt?: string;
    createdBy?: string;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.announcements)
      .values({
        ...params,
        publishedAt: params.publishedAt
          ? new Date(params.publishedAt)
          : undefined,
        expiresAt: params.expiresAt ? new Date(params.expiresAt) : undefined,
      })
      .returning({ id: schema.announcements.id });
    const [ann] = await this.db.db
      .select()
      .from(schema.announcements)
      .where(eq(schema.announcements.id, inserted.id))
      .limit(1);
    return ann;
  }

  async findAnnouncementsByBranch(
    branchId: string,
    query?: { page?: number; limit?: number },
  ) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions = [eq(schema.announcements.branchId, branchId)];
    const data = await this.db.db
      .select()
      .from(schema.announcements)
      .where(and(...conditions))
      .orderBy(desc(schema.announcements.publishedAt))
      .limit(limit)
      .offset(offset);
    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.announcements)
      .where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async createCircular(params: {
    tenantId: string;
    branchId: string;
    circularNumber: string;
    title: string;
    content: string;
    targetRoles?: any[];
    attachmentUrls?: any[];
    issueDate: string;
    createdBy?: string;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.circulars)
      .values(params)
      .returning({ id: schema.circulars.id });
    const [circ] = await this.db.db
      .select()
      .from(schema.circulars)
      .where(eq(schema.circulars.id, inserted.id))
      .limit(1);
    return circ;
  }

  async findCircularsByBranch(
    branchId: string,
    query?: { page?: number; limit?: number },
  ) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions = [eq(schema.circulars.branchId, branchId)];
    const data = await this.db.db
      .select()
      .from(schema.circulars)
      .where(and(...conditions))
      .orderBy(desc(schema.circulars.issueDate))
      .limit(limit)
      .offset(offset);
    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.circulars)
      .where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }
}
