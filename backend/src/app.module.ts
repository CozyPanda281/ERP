import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { AuditModule } from './modules/audit/audit.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { BranchesModule } from './modules/branches/branches.module';
import { AcademicModule } from './modules/academic/academic.module';
import { RolesModule } from './modules/roles/roles.module';
import { StudentsModule } from './modules/students/students.module';
import { ImportModule } from './modules/import/import.module';
import { TimetableModule } from './modules/timetable/timetable.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ExamsModule } from './modules/exams/exams.module';
import { FeeModule } from './modules/fee/fee.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { HrModule } from './modules/hr/hr.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { TransportModule } from './modules/transport/transport.module';
import { HostelModule } from './modules/hostel/hostel.module';
import { LibraryModule } from './modules/library/library.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { StaffModule } from './modules/staff/staff.module';
import { LeaveModule } from './modules/leave/leave.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { HomeworkModule } from './modules/homework/homework.module';
import { LessonPlansModule } from './modules/lesson-plans/lesson-plans.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { IdCardsModule } from './modules/id-cards/id-cards.module';
import { VisitorsModule } from './modules/visitors/visitors.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { QueueModule } from './modules/queue/queue.module';
import { SharedModule } from './shared/shared.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { PublicApiModule } from './modules/public-api/public-api.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { HealthModule } from './modules/health/health.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { FeatureFlagGuard } from './common/guards/feature-flag.guard';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import encryptionConfig from './config/encryption.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        redisConfig,
        encryptionConfig,
      ],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    FeatureFlagsModule,
    SubscriptionsModule,
    AuditModule,
    SystemConfigModule,
    BranchesModule,
    AcademicModule,
    RolesModule,
    StudentsModule,
    ImportModule,
    TimetableModule,
    AttendanceModule,
    ExamsModule,
    FeeModule,
    CommunicationModule,
    HrModule,
    AccountingModule,
    TransportModule,
    HostelModule,
    LibraryModule,
    InventoryModule,
    StaffModule,
    LeaveModule,
    PayrollModule,
    ExpensesModule,
    HomeworkModule,
    LessonPlansModule,
    NotificationsModule,
    IdCardsModule,
    VisitorsModule,
    DashboardModule,
    UploadsModule,
    QueueModule,
    SharedModule,
    ApiKeysModule,
    WebhooksModule,
    PublicApiModule,
    AppointmentsModule,
    HealthModule,
    MetricsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_GUARD,
      useClass: FeatureFlagGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, TenantMiddleware, RequestLoggingMiddleware)
      .forRoutes('*');
  }
}
