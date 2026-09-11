import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import { CryptoService } from '../../shared/crypto/crypto.service';

export const APPOINTMENT_STATUSES = [
  'pending',
  'confirmed',
  'declined',
  'completed',
  'cancelled',
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_MODES = ['in_person', 'video', 'phone'] as const;

export interface AppointmentParticipant {
  userId: string | null;
  parentId: string | null;
  name: string;
  role: 'principal' | 'staff' | 'parent';
}

export interface CreateAppointmentDto {
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes?: number;
  location?: string;
  mode?: string;
  participants?: AppointmentParticipant[];
}

export interface UpdateAppointmentDto extends CreateAppointmentDto {}

const MANAGER_ROLES = ['principal', 'organization-owner'];

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly db: DatabaseProvider,
    private readonly crypto: CryptoService,
  ) {}

  private async resolveUser(
    tenantId: string,
    userId: string,
  ): Promise<{ id: string; name: string } | null> {
    const result = await this.db.query(
      `SELECT u.id, CONCAT(u.first_name, ' ', u.last_name) AS name
       FROM users u
       WHERE u.id = $1 AND u.deleted_at IS NULL
         AND (u.tenant_id = $2 OR u.is_superadmin = TRUE)`,
      [userId, tenantId],
    );
    return result.rows[0] ?? null;
  }

  private async resolveParent(
    tenantId: string,
    parentId: string,
  ): Promise<{ id: string; name: string } | null> {
    const result = await this.db.query(
      `SELECT id, name FROM parents WHERE id = $1 AND tenant_id = $2`,
      [parentId, tenantId],
    );
    return result.rows[0] ?? null;
  }

  async resolveParticipants(
    tenantId: string,
    branchId: string,
    refs: AppointmentParticipant[],
  ): Promise<AppointmentParticipant[]> {
    const resolved: AppointmentParticipant[] = [];
    for (const ref of refs ?? []) {
      const role =
        ref.role === 'parent' || ref.role === 'staff' ? ref.role : 'staff';
      if (ref.parentId) {
        const parent = await this.resolveParent(tenantId, ref.parentId);
        if (!parent) {
          throw new BadRequestException('One or more participants are invalid');
        }
        resolved.push({
          userId: null,
          parentId: parent.id,
          name: parent.name,
          role: 'parent',
        });
      } else if (ref.userId) {
        const user = await this.resolveUser(tenantId, ref.userId);
        if (!user) {
          throw new BadRequestException('One or more participants are invalid');
        }
        resolved.push({
          userId: user.id,
          parentId: null,
          name: user.name,
          role,
        });
      }
    }
    if (!resolved.some((p) => p.role === 'principal')) {
      const principal = await this.db.query(
        `SELECT u.id, CONCAT(u.first_name, ' ', u.last_name) AS name
         FROM branches b
         JOIN users u ON u.id = b.principal_id AND u.deleted_at IS NULL
         WHERE b.id = $1 AND b.deleted_at IS NULL`,
        [branchId],
      );
      if (principal.rows[0]) {
        resolved.push({
          userId: principal.rows[0].id,
          parentId: null,
          name: principal.rows[0].name,
          role: 'principal',
        });
      }
    }
    return resolved;
  }

  private isManager(user: any): boolean {
    return (
      user.isSuperadmin === true ||
      (Array.isArray(user.roles) &&
        user.roles.some((r: string) => MANAGER_ROLES.includes(r)))
    );
  }

  private async myParentIds(tenantId: string, user: any): Promise<string[]> {
    const result = await this.db.query(
      `SELECT id, email, phone FROM parents WHERE tenant_id = $1`,
      [tenantId],
    );
    const me = (user.email ?? '').trim().toLowerCase();
    if (!me) return [];
    return result.rows
      .filter((r: any) => {
        const email = this.decryptOrRaw(r.email).trim().toLowerCase();
        const phone = this.decryptOrRaw(r.phone).trim();
        return email === me || (phone !== '' && phone.trim() === user.phone);
      })
      .map((r: any) => r.id);
  }

  private decryptOrRaw(val: string | null | undefined): string {
    if (!val) return '';
    try {
      return this.crypto.decrypt(val);
    } catch {
      return val;
    }
  }

  private async canAccess(
    tenantId: string,
    user: any,
    record: any,
  ): Promise<boolean> {
    if (this.isManager(user)) return true;
    if (record.requested_by === user.sub) return true;
    const participants: AppointmentParticipant[] = record.participants ?? [];
    if (participants.some((p) => p.userId && p.userId === user.sub))
      return true;
    const myParents = await this.myParentIds(tenantId, user);
    if (
      myParents.length > 0 &&
      participants.some((p) => p.parentId && myParents.includes(p.parentId))
    ) {
      return true;
    }
    return false;
  }

  async create(
    tenantId: string,
    branchId: string,
    user: any,
    dto: CreateAppointmentDto,
  ) {
    const title = dto.title?.trim();
    if (!title) throw new BadRequestException('Appointment title is required');
    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Invalid scheduled date/time');
    }
    const durationMinutes = Math.max(
      1,
      Math.min(480, dto.durationMinutes ?? 30),
    );
    const mode = ['in_person', 'video', 'phone'].includes(dto.mode ?? '')
      ? dto.mode
      : 'in_person';
    const participants = await this.resolveParticipants(
      tenantId,
      branchId,
      dto.participants ?? [],
    );
    const isManager = this.isManager(user);
    const status = isManager ? 'confirmed' : 'pending';
    const requestedByRole =
      Array.isArray(user.roles) && user.roles[0] ? user.roles[0] : 'staff';
    const requestedByName = await this.resolveUser(tenantId, user.sub);

    const result = await this.db.query(
      `INSERT INTO appointments
         (tenant_id, branch_id, title, description, scheduled_at, duration_minutes,
          location, mode, requested_by, requested_by_role, requested_by_name,
          participants, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        tenantId,
        branchId,
        title,
        dto.description ?? null,
        scheduledAt.toISOString(),
        durationMinutes,
        dto.location ?? null,
        mode,
        user.sub,
        requestedByRole,
        requestedByName?.name ?? user.email ?? 'Unknown',
        JSON.stringify(participants),
        status,
        user.sub,
      ],
    );
    return this.mapRecord(result.rows[0]);
  }

  private async resolveBranchId(
    tenantId: string,
    user: any,
    branchId: string | null,
  ): Promise<string | null> {
    if (branchId) return branchId;
    if (user.branchId) return user.branchId;
    const staff = await this.db.query(
      `SELECT branch_id FROM staff
       WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1`,
      [user.sub],
    );
    if (staff.rows[0]) return staff.rows[0].branch_id;
    if (user.email) {
      const parentIds = await this.myParentIds(tenantId, user);
      if (parentIds.length > 0) {
        const res = await this.db.query(
          `SELECT s.branch_id FROM student_parents sp
           JOIN students s ON s.id = sp.student_id
           WHERE sp.parent_id = ANY($2::uuid[])
             AND s.tenant_id = $1 AND s.deleted_at IS NULL
           LIMIT 1`,
          [tenantId, parentIds],
        );
        if (res.rows[0]) return res.rows[0].branch_id;
      }
    }
    return null;
  }

  async list(tenantId: string, branchId: string | null, user: any) {
    branchId = await this.resolveBranchId(tenantId, user, branchId);
    if (!branchId) return [];
    const isManager = this.isManager(user);
    const where = isManager
      ? 'a.deleted_at IS NULL'
      : `a.deleted_at IS NULL AND (
           a.requested_by = $3 OR
           a.participants @> $4::jsonb OR
           a.participants @> $5::jsonb
         )`;
    const params: any[] = [tenantId, branchId];
    if (!isManager) {
      const myParents = await this.myParentIds(tenantId, user);
      params.push(
        user.sub,
        JSON.stringify([{ userId: user.sub }]),
        JSON.stringify(
          myParents.length > 0
            ? myParents.map((pid) => ({ parentId: pid }))
            : [{ parentId: '00000000-0000-0000-0000-000000000000' }],
        ),
      );
    }
    const result = await this.db.query(
      `SELECT a.*
       FROM appointments a
       WHERE a.tenant_id = $1 AND a.branch_id = $2 AND ${where}
       ORDER BY a.scheduled_at ASC`,
      params,
    );
    return result.rows.map((r: any) => this.mapRecord(r));
  }

  async getOne(tenantId: string, user: any, id: string) {
    const result = await this.db.query(
      `SELECT * FROM appointments WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId],
    );
    const record = result.rows[0];
    if (!record) throw new NotFoundException('Appointment not found');
    if (!(await this.canAccess(tenantId, user, record))) {
      throw new ForbiddenException(
        'You do not have access to this appointment',
      );
    }
    return this.mapRecord(record);
  }

  async update(
    tenantId: string,
    user: any,
    id: string,
    dto: UpdateAppointmentDto,
  ) {
    const existing = await this.db.query(
      `SELECT * FROM appointments WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId],
    );
    const record = existing.rows[0];
    if (!record) throw new NotFoundException('Appointment not found');
    if (!(await this.canAccess(tenantId, user, record))) {
      throw new ForbiddenException(
        'You do not have access to this appointment',
      );
    }
    const isManager = this.isManager(user);
    if (record.requested_by !== user.sub && !isManager) {
      throw new ForbiddenException(
        'Only the requester or a manager can edit this appointment',
      );
    }

    const title = dto.title?.trim() ?? record.title;
    const scheduledAt = dto.scheduledAt
      ? new Date(dto.scheduledAt)
      : new Date(record.scheduled_at);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Invalid scheduled date/time');
    }
    const durationMinutes = Math.max(
      1,
      Math.min(480, dto.durationMinutes ?? record.duration_minutes ?? 30),
    );
    const mode = dto.mode
      ? ['in_person', 'video', 'phone'].includes(dto.mode)
        ? dto.mode
        : record.mode
      : record.mode;

    let participantsJson = JSON.stringify(record.participants ?? []);
    if (dto.participants) {
      const participants = await this.resolveParticipants(
        record.tenant_id,
        record.branch_id,
        dto.participants,
      );
      participantsJson = JSON.stringify(participants);
    }

    const result = await this.db.query(
      `UPDATE appointments SET
         title = $1, description = $2, scheduled_at = $3, duration_minutes = $4,
         location = $5, mode = $6, participants = $7::jsonb, updated_at = now()
       WHERE id = $8 RETURNING *`,
      [
        title,
        dto.description !== undefined ? dto.description : record.description,
        scheduledAt.toISOString(),
        durationMinutes,
        dto.location !== undefined ? dto.location : record.location,
        mode,
        participantsJson,
        id,
      ],
    );
    return this.mapRecord(result.rows[0]);
  }

  async setStatus(
    tenantId: string,
    user: any,
    id: string,
    status: string,
    reason?: string,
  ) {
    if (!APPOINTMENT_STATUSES.includes(status as AppointmentStatus)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }
    const existing = await this.db.query(
      `SELECT * FROM appointments WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId],
    );
    const record = existing.rows[0];
    if (!record) throw new NotFoundException('Appointment not found');
    if (!(await this.canAccess(tenantId, user, record))) {
      throw new ForbiddenException(
        'You do not have access to this appointment',
      );
    }
    const isManager = this.isManager(user);
    const isRequester = record.requested_by === user.sub;
    const participants: AppointmentParticipant[] = record.participants ?? [];
    const parentIds = await this.myParentIds(tenantId, user);
    const isParticipant =
      participants.some((p) => p.userId && p.userId === user.sub) ||
      participants.some((p) => p.parentId && parentIds.includes(p.parentId));
    if (status === 'cancelled') {
      if (!isManager && !isRequester && !isParticipant) {
        throw new ForbiddenException(
          'Only the requester, a participant or a manager can cancel this appointment',
        );
      }
    } else if (!isManager) {
      throw new ForbiddenException(
        'Only a principal/owner can update this appointment status',
      );
    }
    const result = await this.db.query(
      `UPDATE appointments SET status = $1, cancelled_reason = $2, updated_at = now()
       WHERE id = $3 RETURNING *`,
      [
        status,
        status === 'cancelled' || status === 'declined'
          ? (reason ?? null)
          : null,
        id,
      ],
    );
    return this.mapRecord(result.rows[0]);
  }

  async remove(tenantId: string, user: any, id: string) {
    if (!this.isManager(user)) {
      throw new ForbiddenException(
        'Only a principal/owner can delete an appointment',
      );
    }
    const result = await this.db.query(
      `UPDATE appointments SET deleted_at = now(), updated_at = now()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, tenantId],
    );
    if (!result.rows[0]) {
      throw new NotFoundException('Appointment not found');
    }
    return { id };
  }

  async countUpcoming(tenantId: string, user: any): Promise<number> {
    const rows = await this.list(tenantId, user.branchId ?? null, user);
    const now = new Date();
    return rows.filter(
      (r: any) =>
        new Date(r.scheduledAt) >= now &&
        ['pending', 'confirmed'].includes(r.status),
    ).length;
  }

  private mapRecord(r: any) {
    return {
      id: r.id,
      tenantId: r.tenant_id,
      branchId: r.branch_id,
      title: r.title,
      description: r.description,
      scheduledAt: r.scheduled_at,
      durationMinutes: r.duration_minutes,
      location: r.location,
      mode: r.mode,
      requestedBy: r.requested_by,
      requestedByRole: r.requested_by_role,
      requestedByName: r.requested_by_name,
      participants: r.participants ?? [],
      status: r.status,
      cancelledReason: r.cancelled_reason,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}
