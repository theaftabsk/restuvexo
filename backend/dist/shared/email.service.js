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
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM = process.env.RESEND_FROM || (SMTP_USER ? `"RESTUVEXO" <${SMTP_USER}>` : "RESTUVEXO <onboarding@resend.dev>");
const FRONTEND_URL = process.env.FRONTEND_URL || "https://app.restuvexo.shop";
const svgLock = (size = 12, color = '#cbd5e1') => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px; width: ${size}px; height: ${size}px;">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
`;
const svgSparkles = (size = 24, color = '#10b981') => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-left: 8px; width: ${size}px; height: ${size}px;">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
    <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5z"></path>
    <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z"></path>
  </svg>
`;
const svgClock = (size = 14, color = '#f97316') => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 6px; width: ${size}px; height: ${size}px;">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
`;
const svgShieldLock = (size = 32, color = '#f97316') => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; width: ${size}px; height: ${size}px;">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    <rect x="9" y="11" width="6" height="4" rx="1"></rect>
    <path d="M10 11V9a2 2 0 1 1 4 0v2"></path>
  </svg>
`;
const svgKey = (size = 16, color = '#ffffff') => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 8px; width: ${size}px; height: ${size}px;">
    <circle cx="7.5" cy="15.5" r="5.5"></circle>
    <path d="m21 2-9.6 9.6"></path>
    <path d="m15.5 7.5 3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
  </svg>
`;
const svgParty = (size = 32, color = '#f97316') => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; width: ${size}px; height: ${size}px;">
    <path d="M5.8 11.3 2 22l10.7-3.8"></path>
    <path d="M4 14h.01"></path>
    <path d="M17 14h.01"></path>
    <path d="M7 8h.01"></path>
    <path d="M12 2h.01"></path>
    <path d="m19 6-1 1-1.5-1.5L18 4z"></path>
    <path d="m10 14-1 1.5 2 2.5 1.5-1.5z"></path>
  </svg>
`;
const svgCheckCircle = (size = 14, color = '#16a34a') => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 6px; width: ${size}px; height: ${size}px;">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
`;
const svgArrowRight = (size = 16, color = '#ffffff') => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-left: 8px; width: ${size}px; height: ${size}px;">
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
`;
const svgReceipt = (size = 18, color = '#f97316') => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; width: ${size}px; height: ${size}px;">
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"></path>
    <path d="M16 8H8"></path>
    <path d="M16 12H8"></path>
    <path d="M13 16H8"></path>
  </svg>
`;
const svgSmartphone = (size = 18, color = '#f97316') => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; width: ${size}px; height: ${size}px;">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
    <line x1="12" y1="18" x2="12" y2="18"></line>
  </svg>
`;
const svgChefHat = (size = 18, color = '#f97316') => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; width: ${size}px; height: ${size}px;">
    <path d="M6 18h12a2 2 0 0 1 2 2v2H4v-2a2 2 0 0 1 2-2Z"></path>
    <path d="M18 18a6 6 0 0 0 0-12 6 6 0 0 0-12 0 6 6 0 0 0 0 12"></path>
  </svg>
`;
const svgUsers = (size = 18, color = '#f97316') => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; width: ${size}px; height: ${size}px;">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
`;
const svgPackage = (size = 18, color = '#f97316') => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; width: ${size}px; height: ${size}px;">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
    <polygon points="12 22.08 12 12 3 6.92 3 17.02 12 22.08"></polygon>
    <polygon points="12 22.08 21 17.02 21 6.92 12 12 12 22.08"></polygon>
    <polygon points="12 12 21 6.92 12 1.84 3 6.92 12 12"></polygon>
  </svg>
`;
const emailHeader = (accentColor = '#f97316') => `
  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 40px; text-align: center; border-radius: 20px 20px 0 0;">
    <div style="text-align: center; margin-bottom: 8px;">
      <img src="${FRONTEND_URL}/restuvexo_logo.png" alt="RESTUVEXO" style="height: 38px; width: auto; display: inline-block; vertical-align: middle; margin-right: 10px; border-radius: 8px;" />
      <span style="color: #ffffff; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; display: inline-block; vertical-align: middle; line-height: 38px;">RESTUVEXO</span>
    </div>
    <p style="color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; margin: 4px 0 0 0; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">Restaurant Operating System</p>
  </div>
`;
const emailFooter = () => `
  <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 40px; text-align: center; border-radius: 0 0 20px 20px;">
    <p style="font-size: 11px; color: #94a3b8; margin: 0 0 6px 0; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; line-height: 1.6;">
      © 2026 RESTUVEXO Inc. All rights reserved.<br />
      This is an automated transactional security message. Please do not reply directly.
    </p>
    <p style="font-size: 10px; color: #cbd5e1; margin: 0; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
      ${svgLock(12, '#cbd5e1')} Secure SSL Connection &nbsp;•&nbsp; Multi-Tenant Restaurant POS
    </p>
  </div>
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
            });
        }
    }
    async dispatchEmail(to, subject, html) {
        if (RESEND_API_KEY) {
            try {
                const res = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${RESEND_API_KEY}`
                    },
                    body: JSON.stringify({
                        from: RESEND_FROM,
                        to: [to],
                        subject: subject,
                        html: html
                    })
                });
                if (res.ok) {
                    console.log(`[Resend API] Email successfully transmitted to ${to}`);
                    return true;
                }
                else {
                    const errData = await res.json().catch(() => ({}));
                    console.error('[Resend API Warning]', errData);
                }
            }
            catch (err) {
                console.error('[Resend API Exception]', err.message);
            }
        }
        if (this.transporter && SMTP_USER) {
            try {
                await this.transporter.sendMail({
                    from: `"RESTUVEXO" <${SMTP_USER}>`,
                    to,
                    subject,
                    html
                });
                console.log(`[Nodemailer SMTP] Email sent successfully to ${to}`);
                return true;
            }
            catch (smtpErr) {
                console.error('[Nodemailer SMTP Error]', smtpErr.message);
            }
        }
        console.log(`[Email Sandbox] Email rendered for ${to}: ${subject}`);
        return true;
    }
    async sendOtpEmail(email, name, otp) {
        console.log(`\n======================================================`);
        console.log(`[RESTUVEXO SECURITY] OTP GENERATED FOR SIGNUP:`);
        console.log(`Email: ${email}`);
        console.log(`OTP Code: ${otp}`);
        console.log(`======================================================\n`);
        const htmlContent = `
      <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; box-shadow: 0 8px 30px rgba(0,0,0,0.06); overflow: hidden;">
        ${emailHeader('#10b981')}

        <div style="padding: 40px 40px 20px 40px;">
          <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0;">
            Welcome, ${name}! ${svgSparkles(22, '#10b981')}
          </h2>
          <p style="font-size: 15px; line-height: 1.7; color: #475569; margin: 0 0 30px 0;">
            Thank you for registering your restaurant with RESTUVEXO. Use the 6-digit verification code below to verify your email address and activate your workspace:
          </p>

          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px dashed #86efac; border-radius: 16px; padding: 30px; margin: 0 0 28px 0; text-align: center;">
            <p style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; color: #16a34a; margin: 0 0 10px 0;">Your Verification Code</p>
            <span style="font-size: 48px; font-weight: 900; color: #15803d; letter-spacing: 12px; font-variant-numeric: tabular-nums;">${otp}</span>
          </div>

          <div style="background: #fff7ed; border-left: 4px solid #f97316; border-radius: 4px; padding: 14px 18px; margin-bottom: 28px;">
            <p style="font-size: 13px; color: #9a3412; margin: 0; line-height: 1.6;">
              ${svgClock(14, '#f97316')} This code is valid for <strong>15 minutes</strong>. If you did not request this, please ignore this email.
            </p>
          </div>
        </div>

        ${emailFooter()}
      </div>
    `;
        return this.dispatchEmail(email, `[RESTUVEXO] Your 6-Digit Email Verification Code — ${otp}`, htmlContent);
    }
    async sendResetPasswordEmail(email, name, resetLink) {
        console.log(`\n======================================================`);
        console.log(`[RESTUVEXO SECURITY] PASSWORD RESET LINK GENERATED:`);
        console.log(`Email: ${email}`);
        console.log(`Link: ${resetLink}`);
        console.log(`======================================================\n`);
        const htmlContent = `
      <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; box-shadow: 0 8px 30px rgba(0,0,0,0.06); overflow: hidden;">
        ${emailHeader('#f97316')}

        <div style="padding: 40px 40px 20px 40px;">
          <div style="width: 56px; height: 56px; background: #fff7ed; border-radius: 16px; margin: 0 0 20px 0; display: table; text-align: center;">
            <div style="display: table-cell; vertical-align: middle;">
              ${svgShieldLock(32, '#ea580c')}
            </div>
          </div>
          <h2 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0;">Password Reset Request</h2>
          <p style="font-size: 15px; line-height: 1.7; color: #475569; margin: 0 0 28px 0;">
            Hello <strong>${name}</strong>,<br /><br />
            We received a request to reset the password for your RESTUVEXO owner account. Click the button below to set a new password:
          </p>

          <div style="text-align: center; margin: 0 0 28px 0;">
            <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 18px 44px; border-radius: 14px; box-shadow: 0 10px 25px -5px rgba(249, 115, 22, 0.4);">
              ${svgKey(16, '#ffffff')} Reset My Password
            </a>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="font-size: 12px; color: #64748b; margin: 0 0 6px 0; font-weight: 600;">Or paste this link into your browser:</p>
            <p style="font-size: 11px; color: #f97316; word-break: break-all; margin: 0; font-weight: 600;">${resetLink}</p>
          </div>

          <div style="background: #fff1f2; border-left: 4px solid #f43f5e; border-radius: 4px; padding: 14px 18px; margin-bottom: 28px;">
            <p style="font-size: 13px; color: #9f1239; margin: 0; line-height: 1.6;">
              ${svgClock(14, '#f43f5e')} This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.
            </p>
          </div>
        </div>

        ${emailFooter()}
      </div>
    `;
        return this.dispatchEmail(email, `[RESTUVEXO] Reset Your Password`, htmlContent);
    }
    async sendWelcomeEmail(email, name, restaurantName) {
        console.log(`\n======================================================`);
        console.log(`[RESTUVEXO SUCCESS] SENDING WELCOME EMAIL:`);
        console.log(`Email: ${email}`);
        console.log(`Restaurant: ${restaurantName}`);
        console.log(`======================================================\n`);
        const loginUrl = `${FRONTEND_URL}/auth/login`;
        const features = [
            { svg: svgReceipt(18, '#f97316'), title: 'POS Billing Panel', desc: 'Blazing-fast billing with offline support' },
            { svg: svgSmartphone(18, '#f97316'), title: 'QR Self-Ordering', desc: 'Custom QR menus with print themes' },
            { svg: svgChefHat(18, '#f97316'), title: 'Live Kitchen Display (KDS)', desc: 'Real-time KOTs via Socket.io' },
            { svg: svgUsers(18, '#f97316'), title: 'Staff & Waiter Panel', desc: 'Secure 10-digit IDs with role access' },
            { svg: svgPackage(18, '#f97316'), title: 'Inventory & Expenses', desc: 'Live stock tracking & profit reports' },
        ];
        const htmlContent = `
      <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; box-shadow: 0 8px 30px rgba(0,0,0,0.06); overflow: hidden;">
        ${emailHeader('#f97316')}

        <div style="padding: 40px 40px 20px 40px;">
          <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #fff7ed, #ffedd5); border-radius: 16px; margin: 0 0 20px 0; display: table; text-align: center;">
            <div style="display: table-cell; vertical-align: middle;">
              ${svgParty(32, '#ea580c')}
            </div>
          </div>
          <h2 style="font-size: 26px; font-weight: 900; color: #0f172a; margin: 0 0 8px 0; line-height: 1.2;">Your Restaurant is Live!</h2>
          <p style="font-size: 15px; line-height: 1.7; color: #475569; margin: 0 0 28px 0;">
            Hello <strong>${name}</strong>,<br /><br />
            Congratulations! <strong>${restaurantName}</strong> has been successfully registered on RESTUVEXO. Your multi-tenant cloud workspace is now live and ready for service.
          </p>

          <div style="background: linear-gradient(135deg, #fff7ed 0%, #fffbf8 100%); border: 1px solid #fed7aa; border-radius: 16px; padding: 24px; margin: 0 0 28px 0;">
            <h3 style="font-size: 13px; font-weight: 800; color: #f97316; text-transform: uppercase; margin: 0 0 14px 0; letter-spacing: 1px; display: inline-block;">
              ${svgCheckCircle(14, '#f97316')} What's included in your workspace
            </h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${features.map(f => `
                <tr>
                  <td style="padding: 8px 10px 8px 0; width: 32px; vertical-align: middle; text-align: center;">
                    ${f.svg}
                  </td>
                  <td style="padding: 8px 10px 8px 0; vertical-align: middle;">
                    <strong style="font-size: 13px; color: #0f172a;">${f.title}</strong>
                    <br /><span style="font-size: 11px; color: #64748b;">${f.desc}</span>
                  </td>
                </tr>
              `).join('')}
            </table>
          </div>

          <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 14px 0;">⚡ Quick Start (4 Steps)</h3>
          <ol style="margin: 0 0 28px 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.8;">
            <li style="margin-bottom: 8px;">Log in with your registered email and password.</li>
            <li style="margin-bottom: 8px;">Go to <strong>Menu Manager</strong> → add your categories, items, and prices.</li>
            <li style="margin-bottom: 8px;">Open <strong>Tables / QR Panel</strong> → set your layout and download print-ready QRs.</li>
            <li>Onboard your staff under <strong>Staff Panel</strong> → assign roles and 10-digit secure IDs.</li>
          </ol>

          <div style="text-align: center; margin: 0 0 28px 0;">
            <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 18px 44px; border-radius: 14px; box-shadow: 0 10px 25px -5px rgba(249, 115, 22, 0.4);">
              Launch Owner Dashboard ${svgArrowRight(16, '#ffffff')}
            </a>
          </div>
        </div>

        ${emailFooter()}
      </div>
    `;
        return this.dispatchEmail(email, `Welcome to RESTUVEXO — ${restaurantName} is Live!`, htmlContent);
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EmailService);
//# sourceMappingURL=email.service.js.map