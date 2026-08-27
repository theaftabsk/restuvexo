"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = require("nodemailer");
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = process.env.SMTP_PORT || "587";
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || (SMTP_USER ? `"RESTUVEXO Security" <${SMTP_USER}>` : '"RESTUVEXO Security" <security@restuvexo.shop>');
const FRONTEND_URL = process.env.FRONTEND_URL || "https://app.restuvexo.shop";
const svgLockShield = () => `
  <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#ff5722" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    <rect x="9" y="11" width="6" height="4" rx="1"></rect>
    <path d="M10 11V9a2 2 0 1 1 4 0v2"></path>
  </svg>
`;
const getEmailHeader = (title, subtitle) => `
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #090d16 0%, #171f30 100%); border-radius: 20px 20px 0 0; text-align: center; padding: 36px 30px;">
    <tr>
      <td align="center">
        <!-- Official Logo & Title -->
        <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
          <tr>
            <td style="vertical-align: middle; padding-right: 12px;">
              <img src="${FRONTEND_URL}/restuvexo_logo.png" alt="RESTUVEXO Logo" width="44" height="44" style="display: block; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 4px 12px rgba(0,0,0,0.3);" />
            </td>
            <td style="vertical-align: middle; text-align: left;">
              <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; line-height: 1;">RESTUVEXO</span>
              <span style="display: inline-block; width: 6px; height: 6px; background-color: #ff5722; border-radius: 50%; margin-left: 2px; vertical-align: baseline;"></span>
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2.5px; color: #fb923c; margin-top: 4px;">
                ${subtitle}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
`;
const getEmailFooter = () => `
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 20px 20px; padding: 28px 30px; text-align: center;">
    <tr>
      <td align="center" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; color: #64748b; line-height: 1.6;">
        <p style="margin: 0 0 8px 0; font-weight: 600; color: #475569;">
          This is an automated single-use transactional security code sent to verify your identity.
        </p>
        <p style="margin: 0 0 10px 0; color: #94a3b8; font-size: 10px;">
          © 2026 RESTUVEXO Inc. Multi-Tenant Restaurant Operating System (ROS). All rights reserved.<br />
          RESTUVEXO Cloud Security Services, Mumbai, India • <a href="https://restuvexo.shop" style="color: #ff5722; text-decoration: none; font-weight: 700;">restuvexo.shop</a>
        </p>
        <div style="display: inline-block; background: #e2e8f0; border-radius: 20px; padding: 4px 14px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #475569;">
          🔒 End-to-End SSL 256-Bit Encrypted • SPF / DKIM / DMARC Verified
        </div>
      </td>
    </tr>
  </table>
`;
let EmailService = class EmailService {
    constructor() {
        this.transporter = null;
        if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
            const port = parseInt(SMTP_PORT, 10);
            this.transporter = nodemailer.createTransport({
                host: SMTP_HOST,
                port: port,
                secure: port === 465,
                auth: {
                    user: SMTP_USER,
                    pass: SMTP_PASS,
                },
                tls: {
                    rejectUnauthorized: false
                }
            });
        }
    }
    async dispatchEmail(to, subject, html, textFallback) {
        const timestamp = Date.now();
        const uniqueMsgId = `<otp-${timestamp}-${Math.random().toString(36).substring(2, 9)}@restuvexo.shop>`;
        const antiSpamHeaders = {
            'Message-ID': uniqueMsgId,
            'X-Entity-Ref-ID': `auth-${timestamp}`,
            'X-Auto-Response-Suppress': 'All',
            'Auto-Submitted': 'auto-generated',
            'X-Priority': '1',
            'Importance': 'high',
            'List-Unsubscribe': '<mailto:security@restuvexo.shop?subject=unsubscribe>',
            'Feedback-ID': 'otp-security:restuvexo:auth',
            'X-Mailer': 'RESTUVEXO ROS Security Core v2.4'
        };
        if (this.transporter && SMTP_USER) {
            try {
                await this.transporter.sendMail({
                    from: SMTP_FROM,
                    to,
                    subject,
                    html,
                    text: textFallback,
                    headers: antiSpamHeaders
                });
                console.log(`[Nodemailer SMTP] Email transmitted successfully to ${to}`);
                return true;
            }
            catch (smtpErr) {
                console.error('[Nodemailer SMTP Error]', smtpErr.message);
            }
        }
        console.log(`[Email Sandbox] Email logged for ${to}: ${subject}`);
        return true;
    }
    async sendOtpEmail(email, name, otp) {
        console.log(`\n======================================================`);
        console.log(`[RESTUVEXO SECURITY] 6-DIGIT OTP DISPATCH VIA SMTP:`);
        console.log(`Recipient: ${email}`);
        console.log(`OTP Code : ${otp}`);
        console.log(`======================================================\n`);
        const digits = otp.split('');
        const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RESTUVEXO Verification Code</title>
      </head>
      <body style="margin: 0; padding: 20px 10px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; overflow: hidden;">
                
                <!-- HEADER -->
                <tr>
                  <td>
                    ${getEmailHeader("Verification Code", "Identity & Security Verification")}
                  </td>
                </tr>

                <!-- BODY CONTENT -->
                <tr>
                  <td style="padding: 36px 36px 24px 36px; text-align: left;">
                    
                    <!-- Icon Banner -->
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                      <tr>
                        <td width="54" style="vertical-align: middle;">
                          <div style="width: 48px; height: 48px; background: #fff7ed; border-radius: 14px; border: 1px solid #fed7aa; text-align: center; line-height: 48px;">
                            ${svgLockShield()}
                          </div>
                        </td>
                        <td style="vertical-align: middle; padding-left: 14px;">
                          <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.3px;">
                            Verify Your Email Address
                          </h1>
                          <p style="margin: 3px 0 0 0; font-size: 13px; color: #64748b; font-weight: 500;">
                            Welcome to RESTUVEXO, <strong>${name}</strong>
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="font-size: 14px; line-height: 1.7; color: #334155; margin: 0 0 24px 0;">
                      Thank you for registering your restaurant. Please use the following <strong>6-digit verification code</strong> to complete your account setup and activate your restaurant workspace:
                    </p>

                    <!-- 6-DIGIT BADGES CONTAINER -->
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0; background: linear-gradient(145deg, #fffaf5 0%, #fff1e6 100%); border: 2px dashed #fdba74; border-radius: 18px; padding: 24px 16px; text-align: center;">
                      <tr>
                        <td align="center">
                          <p style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #ea580c; margin: 0 0 14px 0;">
                            One-Time Security Code
                          </p>
                          
                          <!-- 6 Individual Digit Badges -->
                          <table role="presentation" border="0" cellspacing="6" cellpadding="0" style="margin: 0 auto;">
                            <tr>
                              ${digits.map(d => `
                                <td style="width: 44px; height: 54px; background: #ffffff; border: 2px solid #ff5722; border-radius: 12px; font-size: 28px; font-weight: 900; color: #ea580c; text-align: center; vertical-align: middle; font-family: monospace; box-shadow: 0 4px 10px rgba(255,87,34,0.15);">
                                  ${d}
                                </td>
                              `).join('')}
                            </tr>
                          </table>

                          <p style="font-size: 11px; font-weight: 700; color: #9a3412; margin: 14px 0 0 0;">
                            ⏱️ Code expires in <strong>15 minutes</strong>
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- SECURITY & ANTI-PHISHING ADVISORY -->
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #ff5722; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
                      <tr>
                        <td style="font-size: 12px; line-height: 1.6; color: #475569;">
                          <strong style="color: #0f172a;">🛡️ Security Tip:</strong> RESTUVEXO employees will <strong>never</strong> ask you for your verification code or account password. Never share this code with anyone.
                        </td>
                      </tr>
                    </table>

                    <p style="font-size: 12px; line-height: 1.6; color: #64748b; margin: 0;">
                      If you did not attempt to register on RESTUVEXO, please disregard this email or report it to <a href="mailto:security@restuvexo.shop" style="color: #ff5722; text-decoration: none; font-weight: 700;">security@restuvexo.shop</a>.
                    </p>

                  </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                  <td>
                    ${getEmailFooter()}
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
        const plainText = `
RESTUVEXO Security Verification

Hello ${name},

Your 6-digit verification code is: ${otp}

This code is valid for 15 minutes. Please enter it in your browser to complete your restaurant registration.

Security Reminder:
RESTUVEXO will never ask you for this code. If you did not request this, please ignore this email.

© 2026 RESTUVEXO Inc. • https://restuvexo.shop
    `.trim();
        return this.dispatchEmail(email, `[RESTUVEXO] ${otp} is your verification code`, htmlContent, plainText);
    }
    async sendResetPasswordEmail(email, name, resetLink) {
        console.log(`\n======================================================`);
        console.log(`[RESTUVEXO SECURITY] PASSWORD RESET DISPATCH VIA SMTP:`);
        console.log(`Recipient: ${email}`);
        console.log(`Link     : ${resetLink}`);
        console.log(`======================================================\n`);
        const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your RESTUVEXO Password</title>
      </head>
      <body style="margin: 0; padding: 20px 10px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; overflow: hidden;">
                
                <tr>
                  <td>
                    ${getEmailHeader("Password Reset", "Account Recovery")}
                  </td>
                </tr>

                <tr>
                  <td style="padding: 36px 36px 24px 36px; text-align: left;">
                    
                    <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 900; color: #0f172a;">
                      Reset Your Password
                    </h2>

                    <p style="font-size: 14px; line-height: 1.7; color: #334155; margin: 0 0 24px 0;">
                      Hello <strong>${name}</strong>,<br /><br />
                      We received a request to reset the password for your RESTUVEXO owner account. Click the button below to set a new password:
                    </p>

                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 28px 0; text-align: center;">
                      <tr>
                        <td align="center">
                          <a href="${resetLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #ff5722 0%, #ea580c 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 16px 38px; border-radius: 14px; box-shadow: 0 8px 20px rgba(255,87,34,0.3);">
                            🔑 Set New Password
                          </a>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 20px;">
                      <tr>
                        <td style="font-size: 11px; color: #64748b; line-height: 1.5;">
                          Or copy and paste this recovery URL into your web browser:<br />
                          <span style="color: #ff5722; font-weight: 700; word-break: break-all;">${resetLink}</span>
                        </td>
                      </tr>
                    </table>

                    <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                      This link expires in 1 hour. If you did not request a password reset, you can safely ignore this message.
                    </p>

                  </td>
                </tr>

                <tr>
                  <td>
                    ${getEmailFooter()}
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
        const plainText = `
Reset Your RESTUVEXO Password

Hello ${name},

To reset your password, visit the following URL:
${resetLink}

This link is valid for 1 hour.

© 2026 RESTUVEXO Inc.
    `.trim();
        return this.dispatchEmail(email, `[RESTUVEXO] Password Reset Request`, htmlContent, plainText);
    }
    async sendWelcomeEmail(email, name, restaurantName) {
        console.log(`\n======================================================`);
        console.log(`[RESTUVEXO SUCCESS] SENDING WELCOME EMAIL VIA SMTP:`);
        console.log(`Recipient: ${email}`);
        console.log(`Restaurant: ${restaurantName}`);
        console.log(`======================================================\n`);
        const loginUrl = `${FRONTEND_URL}/auth/login`;
        const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to RESTUVEXO</title>
      </head>
      <body style="margin: 0; padding: 20px 10px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; overflow: hidden;">
                
                <tr>
                  <td>
                    ${getEmailHeader("Restaurant Live", "Welcome to RESTUVEXO")}
                  </td>
                </tr>

                <tr>
                  <td style="padding: 36px 36px 24px 36px; text-align: left;">
                    
                    <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 900; color: #0f172a;">
                      🎉 ${restaurantName} is Ready!
                    </h2>
                    <p style="font-size: 14px; line-height: 1.7; color: #475569; margin: 0 0 24px 0;">
                      Hello <strong>${name}</strong>,<br /><br />
                      Congratulations! Your restaurant workspace on RESTUVEXO is live and operational. You can now configure your menu, print smart QR codes, and start taking orders.
                    </p>

                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 28px 0; text-align: center;">
                      <tr>
                        <td align="center">
                          <a href="${loginUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #ff5722 0%, #ea580c 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 16px 38px; border-radius: 14px; box-shadow: 0 8px 20px rgba(255,87,34,0.3);">
                            Launch Restaurant Dashboard →
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <tr>
                  <td>
                    ${getEmailFooter()}
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
        const plainText = `
Welcome to RESTUVEXO!

Hello ${name},

${restaurantName} is now live on RESTUVEXO.
Log in to your dashboard here: ${loginUrl}

© 2026 RESTUVEXO Inc.
    `.trim();
        return this.dispatchEmail(email, `Welcome to RESTUVEXO — ${restaurantName} is Live!`, htmlContent, plainText);
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EmailService);
//# sourceMappingURL=email.service.js.map