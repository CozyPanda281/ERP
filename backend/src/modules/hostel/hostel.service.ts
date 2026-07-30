import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { eq, and, desc, count, sql, isNull } from 'drizzle-orm';

@Injectable()
export class HostelService {
  constructor(private readonly db: DatabaseProvider) {}

  async createHostel(params: { tenantId: string; branchId: string; name: string; code?: string; address?: string; wardenId?: string; totalRooms?: number; totalBeds?: number; notes?: string }) {
    const [inserted] = await this.db.db.insert(schema.hostels).values({
      tenantId: params.tenantId, branchId: params.branchId, name: params.name, code: params.code,
      address: params.address, wardenId: params.wardenId, totalRooms: params.totalRooms ?? 0,
      totalBeds: params.totalBeds ?? 0, notes: params.notes,
    }).returning({ id: schema.hostels.id });
    return this.findHostelById(inserted.id);
  }

  async findHostelsByBranch(branchId: string, query?: { page?: number; limit?: number }) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions = [eq(schema.hostels.branchId, branchId), isNull(schema.hostels.deletedAt)];
    const data = await this.db.db.select().from(schema.hostels).where(and(...conditions)).orderBy(desc(schema.hostels.createdAt)).limit(limit).offset(offset);
    const [total] = await this.db.db.select({ count: count() }).from(schema.hostels).where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findHostelById(id: string) {
    const [result] = await this.db.db.select().from(schema.hostels).where(and(eq(schema.hostels.id, id), isNull(schema.hostels.deletedAt))).limit(1);
    if (!result) throw new NotFoundException('Hostel not found');
    return result;
  }

  async updateHostel(id: string, params: { name?: string; code?: string; address?: string; wardenId?: string; totalRooms?: number; totalBeds?: number; status?: string; notes?: string }) {
    await this.findHostelById(id);
    const values: any = { ...params, updatedAt: new Date() };
    Object.keys(params).forEach(k => { if (params[k as keyof typeof params] === undefined) delete values[k]; });
    if (Object.keys(values).length > 1) {
      await this.db.db.update(schema.hostels).set(values).where(eq(schema.hostels.id, id));
    }
    return this.findHostelById(id);
  }

  async deleteHostel(id: string) {
    await this.findHostelById(id);
    await this.db.db.update(schema.hostels).set({ deletedAt: new Date() }).where(eq(schema.hostels.id, id));
    return { success: true };
  }

  async createRoom(params: { hostelId: string; roomNumber: string; floor?: number; capacity?: number; bedCount?: number; roomType?: string; rentAmount?: string; notes?: string }) {
    const [inserted] = await this.db.db.insert(schema.hostelRooms).values({
      hostelId: params.hostelId, roomNumber: params.roomNumber, floor: params.floor,
      capacity: params.capacity ?? 1, bedCount: params.bedCount ?? 1, roomType: params.roomType,
      rentAmount: params.rentAmount, notes: params.notes,
    }).returning({ id: schema.hostelRooms.id });
    const [room] = await this.db.db.select().from(schema.hostelRooms).where(eq(schema.hostelRooms.id, inserted.id)).limit(1);
    return room;
  }

  async findRoomsByHostel(hostelId: string, query?: { page?: number; limit?: number }) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions = [eq(schema.hostelRooms.hostelId, hostelId), isNull(schema.hostelRooms.deletedAt)];
    const data = await this.db.db.select().from(schema.hostelRooms).where(and(...conditions)).orderBy(schema.hostelRooms.roomNumber).limit(limit).offset(offset);
    const [total] = await this.db.db.select({ count: count() }).from(schema.hostelRooms).where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findRoomById(id: string) {
    const [result] = await this.db.db.select().from(schema.hostelRooms).where(and(eq(schema.hostelRooms.id, id), isNull(schema.hostelRooms.deletedAt))).limit(1);
    if (!result) throw new NotFoundException('Room not found');
    return result;
  }

  async updateRoom(id: string, params: { roomNumber?: string; floor?: number; capacity?: number; bedCount?: number; roomType?: string; rentAmount?: string; status?: string; notes?: string }) {
    await this.findRoomById(id);
    const values: any = { ...params, updatedAt: new Date() };
    Object.keys(params).forEach(k => { if (params[k as keyof typeof params] === undefined) delete values[k]; });
    if (Object.keys(values).length > 1) {
      await this.db.db.update(schema.hostelRooms).set(values).where(eq(schema.hostelRooms.id, id));
    }
    return this.findRoomById(id);
  }

  async deleteRoom(id: string) {
    await this.findRoomById(id);
    await this.db.db.update(schema.hostelRooms).set({ deletedAt: new Date() }).where(eq(schema.hostelRooms.id, id));
    return { success: true };
  }

  async allocateBed(params: { tenantId: string; branchId: string; roomId: string; studentId: string; bedNumber?: string; allocationDate: string; remarks?: string }) {
    const [inserted] = await this.db.db.insert(schema.hostelBedAllocations).values({
      tenantId: params.tenantId, branchId: params.branchId, roomId: params.roomId,
      studentId: params.studentId, bedNumber: params.bedNumber, allocationDate: params.allocationDate, remarks: params.remarks,
    }).returning({ id: schema.hostelBedAllocations.id });
    const [alloc] = await this.db.db.select().from(schema.hostelBedAllocations).where(eq(schema.hostelBedAllocations.id, inserted.id)).limit(1);
    return alloc;
  }

  async findAllocationsByBranch(branchId: string, query?: { page?: number; limit?: number; roomId?: string; studentId?: string }) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.hostelBedAllocations.branchId, branchId), isNull(schema.hostelBedAllocations.deletedAt)];
    if (query?.roomId) conditions.push(eq(schema.hostelBedAllocations.roomId, query.roomId));
    if (query?.studentId) conditions.push(eq(schema.hostelBedAllocations.studentId, query.studentId));
    const data = await this.db.db.select().from(schema.hostelBedAllocations).where(and(...conditions)).orderBy(desc(schema.hostelBedAllocations.createdAt)).limit(limit).offset(offset);
    const [total] = await this.db.db.select({ count: count() }).from(schema.hostelBedAllocations).where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async vacateBed(id: string) {
    const [existing] = await this.db.db.select({ id: schema.hostelBedAllocations.id }).from(schema.hostelBedAllocations).where(and(eq(schema.hostelBedAllocations.id, id), isNull(schema.hostelBedAllocations.deletedAt))).limit(1);
    if (!existing) throw new NotFoundException('Allocation not found');
    await this.db.db.update(schema.hostelBedAllocations).set({ vacateDate: new Date().toISOString().split('T')[0], status: 'vacated', updatedAt: new Date() }).where(eq(schema.hostelBedAllocations.id, id));
    return { success: true };
  }
}
