export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailRequest {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface PasswordResetEmailData {
  userDisplayName: string;
  resetLink: string;
  expirationTime: string;
}

export interface EmailVerificationData {
  userDisplayName: string;
  verificationLink: string;
  expirationTime: string;
}

export interface PasswordChangeNotificationData {
  userDisplayName: string;
  changeTime: string;
}

export class EmailService {
  private frontendUrl: string;

  constructor() {
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    data: PasswordResetEmailData
  ): Promise<void> {
    const template = this.getPasswordResetTemplate(data);

    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send email verification email
   */
  async sendEmailVerificationEmail(
    email: string,
    data: EmailVerificationData
  ): Promise<void> {
    const template = this.getEmailVerificationTemplate(data);

    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send password change notification
   */
  async sendPasswordChangeNotification(
    email: string,
    data: PasswordChangeNotificationData
  ): Promise<void> {
    const template = this.getPasswordChangeNotificationTemplate(data);

    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send welcome email for new users
   */
  async sendWelcomeEmail(email: string, displayName: string): Promise<void> {
    const template = this.getWelcomeTemplate(displayName);

    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Generic email sending method
   */
  private async sendEmail(request: SendEmailRequest): Promise<void> {
    // TODO: Implement actual email sending using your preferred service
    // Examples: SendGrid, AWS SES, Nodemailer, etc.

    // For now, just log the email content
    console.log('=== EMAIL SENT ===');
    console.log(`To: ${request.to}`);
    console.log(`Subject: ${request.subject}`);
    console.log(`Text: ${request.text}`);
    console.log('==================');

    // Example implementation with SendGrid:
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: request.to,
      from: this.fromEmail,
      subject: request.subject,
      text: request.text,
      html: request.html,
    };

    await sgMail.send(msg);
    */

    // Example implementation with AWS SES:
    /*
    const AWS = require('aws-sdk');
    const ses = new AWS.SES({ region: 'us-east-1' });

    const params = {
      Destination: {
        ToAddresses: [request.to]
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: request.html
          },
          Text: {
            Charset: 'UTF-8',
            Data: request.text
          }
        },
        Subject: {
          Charset: 'UTF-8',
          Data: request.subject
        }
      },
      Source: this.fromEmail
    };

    await ses.sendEmail(params).promise();
    */
  }

  /**
   * Password reset email template
   */
  private getPasswordResetTemplate(
    data: PasswordResetEmailData
  ): EmailTemplate {
    const subject = 'Reset Your InstaBuild Password';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>InstaBuild</h1>
          </div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>Hello ${data.userDisplayName},</p>
            <p>We received a request to reset your password for your InstaBuild account. If you didn't make this request, you can safely ignore this email.</p>
            <p>To reset your password, click the button below:</p>
            <a href="${data.resetLink}" class="button">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="${data.resetLink}">${data.resetLink}</a></p>
            <p><strong>This link will expire in ${data.expirationTime}.</strong></p>
            <p>If you have any questions, please contact our support team.</p>
            <p>Best regards,<br>The InstaBuild Team</p>
          </div>
          <div class="footer">
            <p>This email was sent to you because you requested a password reset for your InstaBuild account.</p>
            <p>© 2024 InstaBuild. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Reset Your InstaBuild Password

      Hello ${data.userDisplayName},

      We received a request to reset your password for your InstaBuild account. If you didn't make this request, you can safely ignore this email.

      To reset your password, visit this link:
      ${data.resetLink}

      This link will expire in ${data.expirationTime}.

      If you have any questions, please contact our support team.

      Best regards,
      The InstaBuild Team

      © 2024 InstaBuild. All rights reserved.
    `;

    return { subject, html, text };
  }

  /**
   * Email verification template
   */
  private getEmailVerificationTemplate(
    data: EmailVerificationData
  ): EmailTemplate {
    const subject = 'Verify Your InstaBuild Email Address';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>InstaBuild</h1>
          </div>
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Hello ${data.userDisplayName},</p>
            <p>Thank you for signing up for InstaBuild! To complete your registration, please verify your email address by clicking the button below:</p>
            <a href="${data.verificationLink}" class="button">Verify Email</a>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="${data.verificationLink}">${data.verificationLink}</a></p>
            <p><strong>This link will expire in ${data.expirationTime}.</strong></p>
            <p>Once verified, you'll have full access to all InstaBuild features.</p>
            <p>Welcome to InstaBuild!</p>
            <p>Best regards,<br>The InstaBuild Team</p>
          </div>
          <div class="footer">
            <p>This email was sent to verify your email address for your InstaBuild account.</p>
            <p>© 2024 InstaBuild. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Verify Your InstaBuild Email Address

      Hello ${data.userDisplayName},

      Thank you for signing up for InstaBuild! To complete your registration, please verify your email address by visiting this link:
      ${data.verificationLink}

      This link will expire in ${data.expirationTime}.

      Once verified, you'll have full access to all InstaBuild features.

      Welcome to InstaBuild!

      Best regards,
      The InstaBuild Team

      © 2024 InstaBuild. All rights reserved.
    `;

    return { subject, html, text };
  }

  /**
   * Password change notification template
   */
  private getPasswordChangeNotificationTemplate(
    data: PasswordChangeNotificationData
  ): EmailTemplate {
    const subject = 'Your InstaBuild Password Has Been Changed';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .alert { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>InstaBuild</h1>
          </div>
          <div class="content">
            <h2>Password Changed Successfully</h2>
            <p>Hello ${data.userDisplayName},</p>
            <p>This is a confirmation that your InstaBuild account password was successfully changed on ${data.changeTime}.</p>
            <div class="alert">
              <strong>Security Notice:</strong> If you didn't make this change, please contact our support team immediately and consider changing your password again.
            </div>
            <p>For your security, all active sessions have been logged out. You'll need to log in again with your new password.</p>
            <p>If you have any questions or concerns, please don't hesitate to contact our support team.</p>
            <p>Best regards,<br>The InstaBuild Team</p>
          </div>
          <div class="footer">
            <p>This is an automated security notification for your InstaBuild account.</p>
            <p>© 2024 InstaBuild. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Your InstaBuild Password Has Been Changed

      Hello ${data.userDisplayName},

      This is a confirmation that your InstaBuild account password was successfully changed on ${data.changeTime}.

      SECURITY NOTICE: If you didn't make this change, please contact our support team immediately and consider changing your password again.

      For your security, all active sessions have been logged out. You'll need to log in again with your new password.

      If you have any questions or concerns, please don't hesitate to contact our support team.

      Best regards,
      The InstaBuild Team

      © 2024 InstaBuild. All rights reserved.
    `;

    return { subject, html, text };
  }

  /**
   * Welcome email template
   */
  private getWelcomeTemplate(displayName: string): EmailTemplate {
    const subject = 'Welcome to InstaBuild!';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to InstaBuild!</h1>
          </div>
          <div class="content">
            <h2>Get Started with AI-Powered Landing Pages</h2>
            <p>Hello ${displayName},</p>
            <p>Welcome to InstaBuild! We're excited to have you on board. With InstaBuild, you can create stunning landing pages using the power of AI.</p>
            <p>Here's what you can do:</p>
            <ul>
              <li>Create multiple projects to organize your work</li>
              <li>Chat with AI to build and customize landing pages</li>
              <li>Deploy your pages with just a few clicks</li>
              <li>Collaborate with team members</li>
            </ul>
            <a href="${this.frontendUrl}/dashboard" class="button">Get Started</a>
            <p>If you have any questions, check out our documentation or contact our support team.</p>
            <p>Happy building!</p>
            <p>Best regards,<br>The InstaBuild Team</p>
          </div>
          <div class="footer">
            <p>You're receiving this email because you signed up for InstaBuild.</p>
            <p>© 2024 InstaBuild. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to InstaBuild!

      Hello ${displayName},

      Welcome to InstaBuild! We're excited to have you on board. With InstaBuild, you can create stunning landing pages using the power of AI.

      Here's what you can do:
      - Create multiple projects to organize your work
      - Chat with AI to build and customize landing pages
      - Deploy your pages with just a few clicks
      - Collaborate with team members

      Get started: ${this.frontendUrl}/dashboard

      If you have any questions, check out our documentation or contact our support team.

      Happy building!

      Best regards,
      The InstaBuild Team

      © 2024 InstaBuild. All rights reserved.
    `;

    return { subject, html, text };
  }
}
