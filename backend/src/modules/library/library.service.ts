import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { eq, and, desc, count, sql, isNull } from 'drizzle-orm';

@Injectable()
export class LibraryService {
  constructor(private readonly db: DatabaseProvider) {}

  async createBook(params: {
    tenantId: string;
    branchId: string;
    title: string;
    author?: string;
    isbn?: string;
    publisher?: string;
    edition?: string;
    category?: string;
    language?: string;
    totalCopies?: number;
    availableCopies?: number;
    shelfLocation?: string;
    description?: string;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.libraryBooks)
      .values({
        tenantId: params.tenantId,
        branchId: params.branchId,
        title: params.title,
        author: params.author,
        isbn: params.isbn,
        publisher: params.publisher,
        edition: params.edition,
        category: params.category,
        language: params.language ?? 'English',
        totalCopies: params.totalCopies ?? 1,
        availableCopies: params.availableCopies ?? params.totalCopies ?? 1,
        shelfLocation: params.shelfLocation,
        description: params.description,
      })
      .returning({ id: schema.libraryBooks.id });
    return this.findBookById(inserted.id);
  }

  async findBooksByBranch(
    branchId: string,
    query?: {
      page?: number;
      limit?: number;
      category?: string;
      author?: string;
      search?: string;
    },
  ) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [
      eq(schema.libraryBooks.branchId, branchId),
      isNull(schema.libraryBooks.deletedAt),
    ];
    if (query?.category)
      conditions.push(eq(schema.libraryBooks.category, query.category));
    if (query?.author)
      conditions.push(eq(schema.libraryBooks.author, query.author));
    if (query?.search)
      conditions.push(
        sql`(${schema.libraryBooks.title}::text ILIKE ${'%' + query.search + '%'} OR ${schema.libraryBooks.isbn}::text ILIKE ${'%' + query.search + '%'})`,
      );
    const data = await this.db.db
      .select()
      .from(schema.libraryBooks)
      .where(and(...conditions))
      .orderBy(desc(schema.libraryBooks.createdAt))
      .limit(limit)
      .offset(offset);
    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.libraryBooks)
      .where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findBookById(id: string) {
    const [result] = await this.db.db
      .select()
      .from(schema.libraryBooks)
      .where(
        and(
          eq(schema.libraryBooks.id, id),
          isNull(schema.libraryBooks.deletedAt),
        ),
      )
      .limit(1);
    if (!result) throw new NotFoundException('Book not found');
    return result;
  }

  async updateBook(
    id: string,
    params: {
      title?: string;
      author?: string;
      isbn?: string;
      publisher?: string;
      edition?: string;
      category?: string;
      language?: string;
      totalCopies?: number;
      availableCopies?: number;
      shelfLocation?: string;
      status?: string;
      description?: string;
    },
  ) {
    await this.findBookById(id);
    const values: any = { ...params, updatedAt: new Date() };
    Object.keys(params).forEach((k) => {
      if (params[k as keyof typeof params] === undefined) delete values[k];
    });
    if (Object.keys(values).length > 1) {
      await this.db.db
        .update(schema.libraryBooks)
        .set(values)
        .where(eq(schema.libraryBooks.id, id));
    }
    return this.findBookById(id);
  }

  async deleteBook(id: string) {
    await this.findBookById(id);
    await this.db.db
      .update(schema.libraryBooks)
      .set({ deletedAt: new Date() })
      .where(eq(schema.libraryBooks.id, id));
    return { success: true };
  }

  async createMember(params: {
    tenantId: string;
    branchId: string;
    memberId: string;
    memberType: string;
    membershipDate: string;
    expiryDate?: string;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.libraryMembers)
      .values({
        tenantId: params.tenantId,
        branchId: params.branchId,
        memberId: params.memberId,
        memberType: params.memberType,
        membershipDate: params.membershipDate,
        expiryDate: params.expiryDate,
      })
      .returning({ id: schema.libraryMembers.id });
    const [member] = await this.db.db
      .select()
      .from(schema.libraryMembers)
      .where(eq(schema.libraryMembers.id, inserted.id))
      .limit(1);
    return member;
  }

  async findMembersByBranch(
    branchId: string,
    query?: { page?: number; limit?: number },
  ) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions = [
      eq(schema.libraryMembers.branchId, branchId),
      isNull(schema.libraryMembers.deletedAt),
    ];
    const data = await this.db.db
      .select()
      .from(schema.libraryMembers)
      .where(and(...conditions))
      .orderBy(desc(schema.libraryMembers.createdAt))
      .limit(limit)
      .offset(offset);
    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.libraryMembers)
      .where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async issueBook(params: {
    tenantId: string;
    branchId: string;
    memberId: string;
    bookId: string;
    issueDate: string;
    dueDate: string;
    issuedBy?: string;
  }) {
    const book = await this.findBookById(params.bookId);
    if ((book.availableCopies ?? 0) <= 0)
      throw new BadRequestException('No copies available');
    const [inserted] = await this.db.db
      .insert(schema.libraryIssues)
      .values({
        tenantId: params.tenantId,
        branchId: params.branchId,
        memberId: params.memberId,
        bookId: params.bookId,
        issueDate: params.issueDate,
        dueDate: params.dueDate,
        issuedBy: params.issuedBy,
      })
      .returning({ id: schema.libraryIssues.id });
    await this.db.db
      .update(schema.libraryBooks)
      .set({
        availableCopies: sql`${schema.libraryBooks.availableCopies} - 1`,
        updatedAt: new Date(),
      })
      .where(eq(schema.libraryBooks.id, params.bookId));
    const [issue] = await this.db.db
      .select()
      .from(schema.libraryIssues)
      .where(eq(schema.libraryIssues.id, inserted.id))
      .limit(1);
    return issue;
  }

  async returnBook(id: string) {
    const [existing] = await this.db.db
      .select()
      .from(schema.libraryIssues)
      .where(eq(schema.libraryIssues.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Issue record not found');
    if (existing.returnDate)
      throw new BadRequestException('Book already returned');
    await this.db.db
      .update(schema.libraryIssues)
      .set({
        returnDate: new Date().toISOString().split('T')[0],
        status: 'returned',
      })
      .where(eq(schema.libraryIssues.id, id));
    await this.db.db
      .update(schema.libraryBooks)
      .set({
        availableCopies: sql`${schema.libraryBooks.availableCopies} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(schema.libraryBooks.id, existing.bookId));
    return { success: true };
  }

  async findIssuesByBranch(
    branchId: string,
    query?: {
      page?: number;
      limit?: number;
      memberId?: string;
      bookId?: string;
      status?: string;
    },
  ) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.libraryIssues.branchId, branchId)];
    if (query?.memberId)
      conditions.push(eq(schema.libraryIssues.memberId, query.memberId));
    if (query?.bookId)
      conditions.push(eq(schema.libraryIssues.bookId, query.bookId));
    if (query?.status)
      conditions.push(eq(schema.libraryIssues.status, query.status));
    const data = await this.db.db
      .select()
      .from(schema.libraryIssues)
      .where(and(...conditions))
      .orderBy(desc(schema.libraryIssues.createdAt))
      .limit(limit)
      .offset(offset);
    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.libraryIssues)
      .where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }
}
