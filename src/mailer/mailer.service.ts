import { Injectable } from '@nestjs/common';
import { MailerService as NestMailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailerService {
  constructor(private readonly mailer: NestMailerService) {}

  async sendOtp(email: string, firstName: string, otp: string): Promise<void> {
    await this.mailer.sendMail({
      to: email,
      subject: 'Verify your Apardex account',
      template: 'otp',
      context: { firstName, otp },
    });
  }

  async sendPasswordResetOtp(
    email: string,
    firstName: string,
    otp: string,
  ): Promise<void> {
    await this.mailer.sendMail({
      to: email,
      subject: 'Reset your Apardex password',
      template: 'reset-password',
      context: { firstName, otp },
    });
  }

  async sendAdminInvite(
    email: string,
    firstName: string,
    temporaryPassword: string,
    roleLabel: string,
  ): Promise<void> {
    await this.mailer.sendMail({
      to: email,
      subject: 'You have been invited to the Apardex admin team',
      template: 'admin-invite',
      context: { firstName, email, temporaryPassword, roleLabel },
    });
  }
}
