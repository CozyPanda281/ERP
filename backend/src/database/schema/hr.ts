import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  date,
  numeric,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { branches } from './branches';
import { departments } from './academic';
import { staff } from './staff';

export const jobPostings = pgTable('job_postings', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  departmentId: uuid('department_id').references(() => departments.id),
  employmentType: varchar('employment_type', { length: 20 }).default(
    'permanent',
  ),
  description: text('description'),
  requirements: text('requirements'),
  salaryRange: varchar('salary_range', { length: 100 }),
  location: varchar('location', { length: 255 }),
  vacancies: integer('vacancies').default(1),
  postedDate: date('posted_date'),
  closingDate: date('closing_date'),
  status: varchar('status', { length: 50 }).default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const jobApplications = pgTable('job_applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  jobPostingId: uuid('job_posting_id')
    .notNull()
    .references(() => jobPostings.id, { onDelete: 'cascade' }),
  applicantName: varchar('applicant_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  resumeUrl: text('resume_url'),
  coverLetter: text('cover_letter'),
  qualification: text('qualification'),
  experienceYears: numeric('experience_years', { precision: 4, scale: 1 }),
  currentCompany: varchar('current_company', { length: 255 }),
  currentCtc: varchar('current_ctc', { length: 100 }),
  expectedCtc: varchar('expected_ctc', { length: 100 }),
  noticePeriod: varchar('notice_period', { length: 50 }),
  status: varchar('status', { length: 50 }).default('applied'),
  reviewNotes: text('review_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const performanceReviews = pgTable(
  'performance_reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    staffId: uuid('staff_id')
      .notNull()
      .references(() => staff.id, { onDelete: 'cascade' }),
    reviewPeriod: varchar('review_period', { length: 100 }).notNull(),
    reviewDate: date('review_date').notNull(),
    reviewedBy: uuid('reviewed_by').notNull(),
    ratings: jsonb('ratings').default({}),
    overallRating: numeric('overall_rating', { precision: 3, scale: 1 }),
    strengths: text('strengths'),
    areasForImprovement: text('areas_for_improvement'),
    goals: jsonb('goals').default([]),
    comments: text('comments'),
    status: varchar('status', { length: 50 }).default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    staffIdx: index('idx_performance_reviews_staff').on(table.staffId),
  }),
);
