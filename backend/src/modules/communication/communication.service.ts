import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import { EmailService } from '../../shared/email/email.service';
import * as schema from '../../database/schema';
import { eq, and, desc, count, inArray, isNull, sql } from 'drizzle-orm';

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  constructor(
    private readonly db: DatabaseProvider,
    private readonly emailService: EmailService,
  ) {}

  // ─── Templates ───────────────────────────────────────────────────────────

  async createTemplate(params: {
    tenantId: string;
    name: string;
    code: string;
    type: string;
    subject?: string;
    body: string;
    variables?: string[];
  }) {
    const [existing] = await this.db.db
      .select({ id: schema.notificationTemplates.id })
      .from(schema.notificationTemplates)
      .where(
        and(
          eq(schema.notificationTemplates.tenantId, params.tenantId),
          eq(schema.notificationTemplates.code, params.code),
        ),
      )
      .limit(1);
    if (existing)
      throw new BadRequestException('Template with this code already exists');

    const [inserted] = await this.db.db
      .insert(schema.notificationTemplates)
      .values({
        tenantId: params.tenantId,
        name: params.name,
        code: params.code,
        type: params.type,
        subject: params.subject,
        body: params.body,
        variables: params.variables || [],
      })
      .returning({ id: schema.notificationTemplates.id });

    const [template] = await this.db.db
      .select()
      .from(schema.notificationTemplates)
      .where(eq(schema.notificationTemplates.id, inserted.id))
      .limit(1);
    return template;
  }

  async findTemplatesByTenant(tenantId: string) {
    return this.db.db
      .select()
      .from(schema.notificationTemplates)
      .where(eq(schema.notificationTemplates.tenantId, tenantId))
      .orderBy(desc(schema.notificationTemplates.createdAt));
  }

  async updateTemplate(id: string, tenantId: string, params: any) {
    const [existing] = await this.db.db
      .select({ id: schema.notificationTemplates.id })
      .from(schema.notificationTemplates)
      .where(
        and(
          eq(schema.notificationTemplates.id, id),
          eq(schema.notificationTemplates.tenantId, tenantId),
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException('Template not found');

    const allowed: any = { updatedAt: new Date() };
    if (params.name !== undefined) allowed.name = params.name;
    if (params.code !== undefined) allowed.code = params.code;
    if (params.type !== undefined) allowed.type = params.type;
    if (params.subject !== undefined) allowed.subject = params.subject;
    if (params.body !== undefined) allowed.body = params.body;
    if (params.variables !== undefined) allowed.variables = params.variables;
    await this.db.db
      .update(schema.notificationTemplates)
      .set(allowed)
      .where(eq(schema.notificationTemplates.id, id));

    const [template] = await this.db.db
      .select()
      .from(schema.notificationTemplates)
      .where(eq(schema.notificationTemplates.id, id))
      .limit(1);
    return template;
  }

  async deleteTemplate(id: string, tenantId: string) {
    const [existing] = await this.db.db
      .select({ id: schema.notificationTemplates.id })
      .from(schema.notificationTemplates)
      .where(
        and(
          eq(schema.notificationTemplates.id, id),
          eq(schema.notificationTemplates.tenantId, tenantId),
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException('Template not found');
    await this.db.db
      .delete(schema.notificationTemplates)
      .where(eq(schema.notificationTemplates.id, id));
  }

  // ─── Notifications ───────────────────────────────────────────────────────

  async createNotification(params: {
    tenantId: string;
    branchId?: string;
    senderId: string;
    title: string;
    message: string;
    type?: string;
    priority?: string;
    targetRoles?: string[];
    targetUsers?: string[];
    allowDismiss?: boolean;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.notifications)
      .values({
        tenantId: params.tenantId,
        branchId: params.branchId,
        senderId: params.senderId,
        title: params.title,
        message: params.message,
        type: params.type || 'in_app',
        priority: params.priority || 'low',
        targetRoles: params.targetRoles || [],
        targetUsers: params.targetUsers || [],
        allowDismiss: params.allowDismiss ?? true,
      })
      .returning({ id: schema.notifications.id });

    if (params.targetUsers?.length) {
      const channel = params.type === 'email' ? 'email' : 'in_app';
      await this.db.db.transaction(async (tx) => {
        const logValues = params.targetUsers!.map((uid) => ({
          tenantId: params.tenantId,
          notificationId: inserted.id,
          recipientId: uid,
          recipientType: 'user',
          channel,
          status: 'sent',
          sentAt: new Date(),
        }));
        await tx.insert(schema.notificationLogs).values(logValues);
      });

      if (params.type === 'email') {
        const userEmails = await this.db.db
          .select({ id: schema.users.id, email: schema.users.email })
          .from(schema.users)
          .where(inArray(schema.users.id, params.targetUsers));

        for (const u of userEmails) {
          if (!u.email) continue;
          const ok = await this.emailService.send({
            to: u.email,
            subject: params.title,
            html: `<p>${params.message}</p>`,
          });
          if (!ok) {
            this.logger.warn(
              `Email delivery failed for user ${u.id} (${u.email})`,
            );
          }
        }
      }
    }

    return this.findNotificationById(inserted.id);
  }

  async findNotificationById(id: string, branchId?: string) {
    const conditions: any[] = [eq(schema.notifications.id, id)];
    if (branchId) conditions.push(eq(schema.notifications.branchId, branchId));

    const [result] = await this.db.db
      .select()
      .from(schema.notifications)
      .where(and(...conditions))
      .limit(1);
    if (!result) throw new NotFoundException('Notification not found');
    return result;
  }

  async findMyNotifications(
    userId: string,
    branchId: string,
    query: {
      page?: number;
      limit?: number;
      type?: string;
      unread?: string;
    },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;

    const conditions: any[] = [
      eq(schema.notificationLogs.recipientId, userId),
      eq(schema.notifications.branchId, branchId),
    ];
    if (query.type) conditions.push(eq(schema.notifications.type, query.type));

    const data = await this.db.db
      .select({
        id: schema.notifications.id,
        title: schema.notifications.title,
        message: schema.notifications.message,
        type: schema.notifications.type,
        priority: schema.notifications.priority,
        createdAt: schema.notifications.createdAt,
        readAt: schema.notificationLogs.readAt,
        status: schema.notificationLogs.status,
      })
      .from(schema.notifications)
      .innerJoin(
        schema.notificationLogs,
        eq(schema.notificationLogs.notificationId, schema.notifications.id),
      )
      .where(and(...conditions))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.notifications)
      .innerJoin(
        schema.notificationLogs,
        eq(schema.notificationLogs.notificationId, schema.notifications.id),
      )
      .where(
        and(
          eq(schema.notificationLogs.recipientId, userId),
          eq(schema.notifications.branchId, branchId),
        ),
      );

    const unreadCount = await this.db.db
      .select({ count: count() })
      .from(schema.notifications)
      .innerJoin(
        schema.notificationLogs,
        eq(schema.notificationLogs.notificationId, schema.notifications.id),
      )
      .where(
        and(
          eq(schema.notificationLogs.recipientId, userId),
          eq(schema.notifications.branchId, branchId),
          isNull(schema.notificationLogs.readAt),
        ),
      )
      .then((r) => Number(r[0].count));

    return {
      data,
      pagination: { page, limit, total: Number(total.count) },
      unreadCount,
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const [log] = await this.db.db
      .select({ id: schema.notificationLogs.id })
      .from(schema.notificationLogs)
      .where(
        and(
          eq(schema.notificationLogs.notificationId, notificationId),
          eq(schema.notificationLogs.recipientId, userId),
        ),
      )
      .limit(1);

    if (!log) throw new NotFoundException('Notification log not found');

    await this.db.db
      .update(schema.notificationLogs)
      .set({
        status: 'read',
        readAt: new Date(),
      })
      .where(eq(schema.notificationLogs.id, log.id));

    return { success: true };
  }

  async markAllAsRead(userId: string, branchId: string) {
    await this.db.db
      .update(schema.notificationLogs)
      .set({
        status: 'read',
        readAt: new Date(),
      })
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notificationLogs.notificationId, schema.notifications.id),
          eq(schema.notificationLogs.recipientId, userId),
          eq(schema.notifications.branchId, branchId),
          isNull(schema.notificationLogs.readAt),
        ),
      );

    return { success: true };
  }

  // ─── Announcements ───────────────────────────────────────────────────────

  async createAnnouncement(params: {
    tenantId: string;
    branchId: string;
    createdBy: string;
    title: string;
    content: string;
    targetRoles?: string[];
    targetClasses?: string[];
    priority?: string;
    isPinned?: boolean;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.announcements)
      .values({
        tenantId: params.tenantId,
        branchId: params.branchId,
        title: params.title,
        content: params.content,
        targetRoles: params.targetRoles || [],
        targetClasses: params.targetClasses || [],
        priority: params.priority || 'low',
        isPinned: params.isPinned || false,
        publishedAt: new Date(),
        createdBy: params.createdBy,
      })
      .returning({ id: schema.announcements.id });

    const [announcement] = await this.db.db
      .select()
      .from(schema.announcements)
      .where(eq(schema.announcements.id, inserted.id))
      .limit(1);
    return announcement;
  }

  async findAnnouncementsByBranch(
    branchId: string,
    query: {
      page?: number;
      limit?: number;
      priority?: string;
      isPinned?: string;
    },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.announcements.branchId, branchId)];

    if (query.priority)
      conditions.push(eq(schema.announcements.priority, query.priority));
    if (query.isPinned !== undefined)
      conditions.push(
        eq(schema.announcements.isPinned, query.isPinned === 'true'),
      );

    const data = await this.db.db
      .select()
      .from(schema.announcements)
      .where(and(...conditions))
      .orderBy(
        desc(schema.announcements.isPinned),
        desc(schema.announcements.publishedAt),
      )
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.announcements)
      .where(and(...conditions));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async updateAnnouncement(id: string, branchId: string, params: any) {
    const [existing] = await this.db.db
      .select({ id: schema.announcements.id })
      .from(schema.announcements)
      .where(
        and(
          eq(schema.announcements.id, id),
          eq(schema.announcements.branchId, branchId),
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException('Announcement not found');

    await this.db.db
      .update(schema.announcements)
      .set({ ...params, updatedAt: new Date() })
      .where(eq(schema.announcements.id, id));

    const [announcement] = await this.db.db
      .select()
      .from(schema.announcements)
      .where(eq(schema.announcements.id, id))
      .limit(1);
    return announcement;
  }

  async deleteAnnouncement(id: string, branchId: string) {
    const [existing] = await this.db.db
      .select({ id: schema.announcements.id })
      .from(schema.announcements)
      .where(
        and(
          eq(schema.announcements.id, id),
          eq(schema.announcements.branchId, branchId),
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException('Announcement not found');
    await this.db.db
      .delete(schema.announcements)
      .where(eq(schema.announcements.id, id));
  }
}
