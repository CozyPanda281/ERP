import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { QueueService } from '../../modules/queue/queue.service';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor(
    private configService: ConfigService,
    private queueService: QueueService,
  ) {
    const host = this.configService.get('SMTP_HOST');
    this.from = this.configService.get('SMTP_FROM', 'noreply@erp.com');

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(this.configService.get('SMTP_PORT', '587'), 10),
        secure: this.configService.get('SMTP_PORT', '587') === '465',
        auth: {
          user: this.configService.get('SMTP_USER', ''),
          pass: this.configService.get('SMTP_PASS', ''),
        },
      });
    } else {
      this.logger.warn('SMTP_HOST not configured — email sending is disabled');
    }
  }

  onModuleInit() {
    this.queueService.setEmailHandler(async (data) => {
      await this.sendMail(data);
    });
  }

  async send(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(
        `Email not sent (SMTP not configured): to=${params.to} subject="${params.subject}"`,
      );
      return false;
    }
    if (await this.queueService.enqueueEmail(params)) return true;
    return this.sendMail(params);
  }

  private async sendMail(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: params.to,
        subject: params.subject,
        text: params.text || params.html.replace(/<[^>]*>/g, ''),
        html: params.html,
      });
      this.logger.log(`Email sent to ${params.to}: "${params.subject}"`);
      return true;
    } catch (err) {
      this.logger.error(
        `Failed to send email to ${params.to}: ${(err as Error).message}`,
      );
      return false;
    }
  }
}
