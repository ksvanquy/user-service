import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'in-v3.mailjet.com',
      port: 587,
      secure: false,
      auth: {
        user: '3c67ff416b5e35ad11132439f77c3242', // API Key của bạn
        pass: 'f22100f8757f16cc739a67b274af3860', // Secret Key của bạn
      },
    });
  }
  async sendVerifyEmail(email: string, token: string): Promise<void> {
    const url = `http://your-frontend-url.com/verify-email?token=${token}`;
    await this.transporter.sendMail({
      from: '"Your App" <no-reply@yourapp.com>',
      to: email,
      subject: 'Email Verification',
      text: `Please verify your email by clicking the following link: ${url}`,
      html: `<p>Please verify your email by clicking the following link: <a href="${url}">Verify Email</a></p>`,
    });
  }

  async sendResetPasswordEmail(email: string, token: string): Promise<void> {
    const url = `http://your-frontend-url.com/reset-password?token=${token}`;
    await this.transporter.sendMail({
      from: '"Your App" <no-reply@yourapp.com>',
      to: email,
      subject: 'Reset Your Password',
      text: `Please reset your password by clicking the following link: ${url}`,
      html: `<p>Please reset your password by clicking the following link: <a href="${url}">Reset Password</a></p>`,
    });
  }
}
