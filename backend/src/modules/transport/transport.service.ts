import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { eq, and, desc, count, sql, isNull } from 'drizzle-orm';

@Injectable()
export class TransportService {
  constructor(private readonly db: DatabaseProvider) {}

  async createVehicle(params: { tenantId: string; branchId: string; vehicleNumber: string; model?: string; capacity?: number; driverName?: string; driverPhone?: string; insuranceExpiry?: string; notes?: string }) {
    const [inserted] = await this.db.db.insert(schema.transportVehicles).values({
      tenantId: params.tenantId, branchId: params.branchId, vehicleNumber: params.vehicleNumber,
      model: params.model, capacity: params.capacity, driverName: params.driverName,
      driverPhone: params.driverPhone, insuranceExpiry: params.insuranceExpiry, notes: params.notes,
    }).returning({ id: schema.transportVehicles.id });
    return this.findVehicleById(inserted.id);
  }

  async findVehiclesByBranch(branchId: string, query?: { page?: number; limit?: number }) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions = [eq(schema.transportVehicles.branchId, branchId), isNull(schema.transportVehicles.deletedAt)];
    const data = await this.db.db.select().from(schema.transportVehicles).where(and(...conditions)).orderBy(desc(schema.transportVehicles.createdAt)).limit(limit).offset(offset);
    const [total] = await this.db.db.select({ count: count() }).from(schema.transportVehicles).where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findVehicleById(id: string) {
    const [result] = await this.db.db.select().from(schema.transportVehicles).where(and(eq(schema.transportVehicles.id, id), isNull(schema.transportVehicles.deletedAt))).limit(1);
    if (!result) throw new NotFoundException('Vehicle not found');
    return result;
  }

  async updateVehicle(id: string, params: { model?: string; capacity?: number; driverName?: string; driverPhone?: string; insuranceExpiry?: string; status?: string; notes?: string }) {
    await this.findVehicleById(id);
    const values: any = { ...params, updatedAt: new Date() };
    Object.keys(params).forEach(k => { if (params[k as keyof typeof params] === undefined) delete values[k]; });
    if (Object.keys(values).length > 1) {
      await this.db.db.update(schema.transportVehicles).set(values).where(eq(schema.transportVehicles.id, id));
    }
    return this.findVehicleById(id);
  }

  async deleteVehicle(id: string) {
    await this.findVehicleById(id);
    await this.db.db.update(schema.transportVehicles).set({ deletedAt: new Date() }).where(eq(schema.transportVehicles.id, id));
    return { success: true };
  }

  async createRoute(params: { tenantId: string; branchId: string; name: string; vehicleId?: string; description?: string; distance?: string; fare?: string }) {
    const [inserted] = await this.db.db.insert(schema.transportRoutes).values({
      tenantId: params.tenantId, branchId: params.branchId, name: params.name,
      vehicleId: params.vehicleId, description: params.description, distance: params.distance, fare: params.fare,
    }).returning({ id: schema.transportRoutes.id });
    return this.findRouteById(inserted.id);
  }

  async findRoutesByBranch(branchId: string, query?: { page?: number; limit?: number; vehicleId?: string }) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.transportRoutes.branchId, branchId), isNull(schema.transportRoutes.deletedAt)];
    if (query?.vehicleId) conditions.push(eq(schema.transportRoutes.vehicleId, query.vehicleId));
    const data = await this.db.db.select().from(schema.transportRoutes).where(and(...conditions)).orderBy(desc(schema.transportRoutes.createdAt)).limit(limit).offset(offset);
    const [total] = await this.db.db.select({ count: count() }).from(schema.transportRoutes).where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findRouteById(id: string) {
    const [result] = await this.db.db.select().from(schema.transportRoutes).where(and(eq(schema.transportRoutes.id, id), isNull(schema.transportRoutes.deletedAt))).limit(1);
    if (!result) throw new NotFoundException('Route not found');
    return result;
  }

  async updateRoute(id: string, params: { name?: string; vehicleId?: string; description?: string; distance?: string; fare?: string; status?: string }) {
    await this.findRouteById(id);
    const values: any = { ...params, updatedAt: new Date() };
    Object.keys(params).forEach(k => { if (params[k as keyof typeof params] === undefined) delete values[k]; });
    if (Object.keys(values).length > 1) {
      await this.db.db.update(schema.transportRoutes).set(values).where(eq(schema.transportRoutes.id, id));
    }
    return this.findRouteById(id);
  }

  async deleteRoute(id: string) {
    await this.findRouteById(id);
    await this.db.db.update(schema.transportRoutes).set({ deletedAt: new Date() }).where(eq(schema.transportRoutes.id, id));
    return { success: true };
  }

  async assignStudent(params: { tenantId: string; branchId: string; studentId: string; routeId: string; stopId?: string; academicYearId?: string; effectiveFrom: string; effectiveTo?: string }) {
    const [inserted] = await this.db.db.insert(schema.transportAssignments).values({
      tenantId: params.tenantId, branchId: params.branchId, studentId: params.studentId,
      routeId: params.routeId, stopId: params.stopId, academicYearId: params.academicYearId,
      effectiveFrom: params.effectiveFrom, effectiveTo: params.effectiveTo,
    }).returning({ id: schema.transportAssignments.id });
    const [assignment] = await this.db.db.select().from(schema.transportAssignments).where(eq(schema.transportAssignments.id, inserted.id)).limit(1);
    return assignment;
  }

  async findAssignmentsByBranch(branchId: string, query?: { page?: number; limit?: number; routeId?: string; studentId?: string }) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.transportAssignments.branchId, branchId), isNull(schema.transportAssignments.deletedAt)];
    if (query?.routeId) conditions.push(eq(schema.transportAssignments.routeId, query.routeId));
    if (query?.studentId) conditions.push(eq(schema.transportAssignments.studentId, query.studentId));
    const data = await this.db.db.select().from(schema.transportAssignments).where(and(...conditions)).orderBy(desc(schema.transportAssignments.createdAt)).limit(limit).offset(offset);
    const [total] = await this.db.db.select({ count: count() }).from(schema.transportAssignments).where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async unassignStudent(id: string) {
    const [existing] = await this.db.db.select({ id: schema.transportAssignments.id }).from(schema.transportAssignments).where(and(eq(schema.transportAssignments.id, id), isNull(schema.transportAssignments.deletedAt))).limit(1);
    if (!existing) throw new NotFoundException('Assignment not found');
    await this.db.db.update(schema.transportAssignments).set({ deletedAt: new Date() }).where(eq(schema.transportAssignments.id, id));
    return { success: true };
  }
}
