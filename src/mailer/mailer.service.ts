import { Injectable } from '@nestjs/common';
import { MailerService as NestMailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailerService {
  constructor(private readonly mailer: NestMailerService) {}

  async sendOtp(email: string, fullName: string, otp: string): Promise<void> {
    await this.mailer.sendMail({
      to: email,
      subject: 'Verify your Apardex account',
      template: 'otp',
      context: { fullName, otp },
    });
  }

  async sendPasswordResetOtp(
    email: string,
    fullName: string,
    otp: string,
  ): Promise<void> {
    await this.mailer.sendMail({
      to: email,
      subject: 'Reset your Apardex password',
      template: 'reset-password',
      context: { fullName, otp },
    });
  }
}
