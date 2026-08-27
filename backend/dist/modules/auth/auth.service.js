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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const settings_service_1 = require("../../shared/settings.service");
const email_service_1 = require("../../shared/email.service");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const JWT_SECRET = process.env.JWT_SECRET || "VexoSecretRosJwtToken2026MasterKey";
let AuthService = class AuthService {
    constructor(prisma, settingsService, emailService) {
        this.prisma = prisma;
        this.settingsService = settingsService;
        this.emailService = emailService;
    }
    async ownerSignup(req, res) {
        const { name, restaurantName, phone, email, password } = req.body;
        if (!name || !restaurantName || !phone || !email || !password) {
            return res.status(400).json({ error: "All fields are required to register your restaurant." });
        }
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedPhone = phone.trim().replace(/[\s-]/g, '');
        if (password.length > 100 || normalizedEmail.length > 100 || normalizedPhone.length > 50 || name.length > 100 || restaurantName.length > 100) {
            return res.status(400).json({ error: "Input lengths exceed permitted security limits." });
        }
        try {
            console.log(`[Security Log] Owner signup request initiated for email: ${normalizedEmail}, phone: ${normalizedPhone} (IP: ${req.ip})`);
            const existingRestaurantEmail = await this.prisma.restaurant.findUnique({
                where: { email: normalizedEmail }
            });
            const existingUserEmail = await this.prisma.user.findFirst({
                where: { loginId: normalizedEmail }
            });
            if (existingRestaurantEmail || existingUserEmail) {
                return res.status(400).json({ error: "An account with this email address is already registered. Please sign in instead." });
            }
            const existingRestaurantPhone = await this.prisma.restaurant.findFirst({
                where: { phone: normalizedPhone }
            });
            const existingUserPhone = await this.prisma.user.findFirst({
                where: { phone: normalizedPhone }
            });
            if (existingRestaurantPhone || existingUserPhone) {
                return res.status(400).json({ error: "An account with this phone number is already registered with another restaurant." });
            }
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            const payload = JSON.stringify({
                name: name.trim(),
                restaurantName: restaurantName.trim(),
                phone: normalizedPhone,
                passwordHash
            });
            await this.prisma.otpVerification.upsert({
                where: { email: normalizedEmail },
                update: {
                    otp: otp,
                    payload: payload,
                    createdAt: new Date()
                },
                create: {
                    email: normalizedEmail,
                    otp: otp,
                    payload: payload
                }
            });
            await this.emailService.sendOtpEmail(normalizedEmail, name, otp);
            res.status(200).json({
                message: "Email verification code has been dispatched. Check your inbox!"
            });
        }
        catch (error) {
            console.error('[Signup Request Error]', error);
            res.status(500).json({ error: error.message || "Could not process registration. Try again." });
        }
    }
    ;
    async verifyOtp(req, res) {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ error: "Email and verification code are required." });
        }
        const normalizedEmail = email.trim().toLowerCase();
        if (normalizedEmail.length > 100 || otp.length > 20) {
            return res.status(400).json({ error: "Input lengths exceed permitted security limits." });
        }
        try {
            console.log(`[Security Log] OTP verification attempt for email: ${normalizedEmail} (IP: ${req.ip})`);
            const record = await this.prisma.otpVerification.findUnique({
                where: { email: normalizedEmail }
            });
            if (!record) {
                return res.status(400).json({ error: "No pending registration found for this email address." });
            }
            if (record.otp !== otp) {
                console.log(`[Security Alert] Invalid OTP verification attempt for email: ${normalizedEmail} (IP: ${req.ip})`);
                return res.status(400).json({ error: "Invalid verification code. Please try again." });
            }
            const { name, restaurantName, phone, passwordHash } = JSON.parse(record.payload);
            const normalizedPhone = phone.trim().replace(/[\s-]/g, '');
            const existingRestaurant = await this.prisma.restaurant.findUnique({
                where: { email: normalizedEmail }
            });
            if (existingRestaurant) {
                return res.status(400).json({ error: "An account with this email address has already been registered." });
            }
            const existingRestaurantPhone = await this.prisma.restaurant.findFirst({
                where: { phone: normalizedPhone }
            });
            if (existingRestaurantPhone) {
                return res.status(400).json({ error: "An account with this phone number has already been registered." });
            }
            const salt = await bcrypt.genSalt(10);
            const defaultPinHash = await bcrypt.hash("0000", salt);
            const result = await this.prisma.$transaction(async (tx) => {
                const restaurant = await tx.restaurant.create({
                    data: {
                        name: restaurantName,
                        phone: normalizedPhone,
                        email: normalizedEmail,
                        firstMonthPromoUsed: false
                    }
                });
                const user = await tx.user.create({
                    data: {
                        restaurantId: restaurant.id,
                        name: name,
                        role: "owner",
                        loginId: normalizedEmail,
                        phone: normalizedPhone,
                        passwordHash: passwordHash,
                        pinHash: defaultPinHash,
                        status: "active"
                    }
                });
                return { restaurant, user };
            });
            await this.prisma.otpVerification.delete({
                where: { email: normalizedEmail }
            });
            try {
                await this.emailService.sendWelcomeEmail(normalizedEmail, name, restaurantName);
            }
            catch (mailErr) {
                console.error("Failed to transmit Welcome email:", mailErr.message);
            }
            console.log(`[Security Log] Email verified successfully and owner account created. Email: ${normalizedEmail} (IP: ${req.ip})`);
            const token = jwt.sign({
                id: result.user.id,
                restaurantId: result.restaurant.id,
                role: result.user.role,
                name: result.user.name
            }, JWT_SECRET, { expiresIn: '30d' });
            res.status(201).json({
                message: "Email verified successfully! Restaurant dashboard is live.",
                token,
                onboardingRequired: true,
                restaurant: {
                    id: result.restaurant.id,
                    name: result.restaurant.name
                },
                user: {
                    id: result.user.id,
                    name: result.user.name,
                    role: result.user.role,
                    restaurantId: result.user.restaurantId
                }
            });
        }
        catch (error) {
            console.error('[OTP Verify Error]', error);
            res.status(500).json({ error: "Failed to verify registration code. Try again." });
        }
    }
    ;
    async resendOtp(req, res) {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email address is required to resend verification code." });
        }
        try {
            const record = await this.prisma.otpVerification.findUnique({
                where: { email: email }
            });
            if (!record) {
                return res.status(404).json({ error: "No pending signup found for this email. Please register again." });
            }
            const timeSinceCreated = Date.now() - new Date(record.createdAt).getTime();
            if (timeSinceCreated < 30000) {
                const waitSec = Math.ceil((30000 - timeSinceCreated) / 1000);
                return res.status(429).json({ error: `Please wait ${waitSec} seconds before requesting a new code.` });
            }
            const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
            const payloadObj = JSON.parse(record.payload);
            await this.prisma.otpVerification.update({
                where: { email: email },
                data: {
                    otp: newOtp,
                    createdAt: new Date()
                }
            });
            await this.emailService.sendOtpEmail(email, payloadObj.name || "Restaurant Owner", newOtp);
            console.log(`[Security Log] Resent fresh OTP to ${email}`);
            res.status(200).json({ message: "A fresh verification code has been sent to your email!" });
        }
        catch (error) {
            console.error('[Resend OTP Error]', error);
            res.status(500).json({ error: "Could not resend verification code. Please try again." });
        }
    }
    ;
    async login(req, res) {
        const { phoneOrEmail, credential } = req.body;
        if (!phoneOrEmail || !credential) {
            return res.status(400).json({ error: "Login ID/Email and Password are required." });
        }
        if (credential.length > 100 || phoneOrEmail.length > 255) {
            return res.status(400).json({ error: "Input lengths exceed permitted security limits." });
        }
        try {
            console.log(`[Security Log] Login attempt started for: ${phoneOrEmail} (IP: ${req.ip})`);
            let user = null;
            if (phoneOrEmail.includes('@')) {
                const restaurant = await this.prisma.restaurant.findUnique({
                    where: { email: phoneOrEmail }
                });
                if (restaurant) {
                    user = await this.prisma.user.findFirst({
                        where: { restaurantId: restaurant.id, role: "owner" }
                    });
                }
            }
            else {
                user = await this.prisma.user.findUnique({
                    where: { loginId: phoneOrEmail }
                });
            }
            if (!user || user.status !== 'active') {
                console.log(`[Security Alert] Unsuccessful login - user not found or inactive for: ${phoneOrEmail} (IP: ${req.ip})`);
                return res.status(401).json({ error: "Account not found, inactive, or invalid credentials." });
            }
            if (user.role === 'other') {
                return res.status(403).json({ error: "Access Denied. Other staff are not permitted to log in." });
            }
            const hashToCompare = user.role === 'owner' ? user.passwordHash : user.pinHash;
            const isMatch = await bcrypt.compare(credential, hashToCompare);
            if (!isMatch) {
                console.log(`[Security Alert] Unsuccessful login - invalid credentials for: ${phoneOrEmail} (IP: ${req.ip})`);
                return res.status(401).json({ error: user.role === 'owner' ? "Invalid password. Please try again." : "Invalid PIN. Please try again." });
            }
            const restaurant = await this.prisma.restaurant.findUnique({
                where: { id: user.restaurantId }
            });
            const token = jwt.sign({
                id: user.id,
                restaurantId: user.restaurantId,
                role: user.role,
                name: user.name
            }, JWT_SECRET, { expiresIn: '30d' });
            console.log(`[Security Log] User ${user.role} successfully logged in: ${phoneOrEmail} (IP: ${req.ip})`);
            res.json({
                message: `Authenticated successfully as ${user.role.toUpperCase()}!`,
                token,
                restaurant: {
                    id: restaurant.id,
                    name: restaurant.name
                },
                user: {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    restaurantId: user.restaurantId
                }
            });
        }
        catch (error) {
            console.error('[Unified Login Error]', error);
            res.status(500).json({ error: "Server authentication error. Please try again." });
        }
    }
    ;
    async forgotPassword(req, res) {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email address is required." });
        }
        if (email.length > 100) {
            return res.status(400).json({ error: "Input lengths exceed permitted security limits." });
        }
        console.log(`[Security Log] Forgot password requested for email: ${email} (IP: ${req.ip})`);
        try {
            const restaurant = await this.prisma.restaurant.findUnique({
                where: { email: email }
            });
            if (!restaurant) {
                console.log(`[Security Alert] Forgot password requested for non-existent email: ${email} (IP: ${req.ip})`);
                return res.status(200).json({
                    message: "If your email is registered in our system, you will receive a password reset link shortly."
                });
            }
            const owner = await this.prisma.user.findFirst({
                where: {
                    restaurantId: restaurant.id,
                    role: "owner"
                }
            });
            if (!owner) {
                return res.status(200).json({
                    message: "If your email is registered in our system, you will receive a password reset link shortly."
                });
            }
            const token = crypto.randomBytes(32).toString('hex');
            const tokenExpiry = new Date(Date.now() + 3600000);
            await this.prisma.user.update({
                where: { id: owner.id },
                data: {
                    resetToken: token,
                    resetExpires: tokenExpiry
                }
            });
            const frontendUrl = process.env.FRONTEND_URL || "http://app.localhost:3000";
            const resetLink = `${frontendUrl}/auth/reset-password?token=${token}`;
            await this.emailService.sendResetPasswordEmail(email, owner.name, resetLink);
            console.log(`[Security Log] Forgot password link sent to email: ${email} (IP: ${req.ip})`);
            res.status(200).json({
                message: "If your email is registered in our system, you will receive a password reset link shortly."
            });
        }
        catch (error) {
            console.error('[Forgot Password Error]', error);
            res.status(500).json({ error: "Failed to process forgot password request." });
        }
    }
    ;
    async resetPassword(req, res) {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ error: "Token and password are required fields." });
        }
        if (password.length > 100 || token.length > 200) {
            return res.status(400).json({ error: "Input lengths exceed permitted security limits." });
        }
        console.log(`[Security Log] Reset password request with token (IP: ${req.ip})`);
        try {
            const user = await this.prisma.user.findFirst({
                where: {
                    resetToken: token,
                    resetExpires: {
                        gt: new Date()
                    }
                }
            });
            if (!user) {
                console.log(`[Security Alert] Invalid or expired password reset token used (IP: ${req.ip})`);
                return res.status(400).json({ error: "The password reset token is invalid or has expired." });
            }
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    passwordHash: passwordHash,
                    resetToken: null,
                    resetExpires: null
                }
            });
            console.log(`[Security Log] Password successfully reset for user ID: ${user.id} (IP: ${req.ip})`);
            res.status(200).json({
                message: "Your password has been successfully updated! You can now log in with your new credentials."
            });
        }
        catch (error) {
            console.error('[Reset Password Error]', error);
            res.status(500).json({ error: "Failed to reset password. Please try again." });
        }
    }
    ;
    async addStaff(req, res) {
        const { name, role, password } = req.body;
        const restaurantId = req.user.restaurantId;
        if (!name || !role) {
            return res.status(400).json({ error: "Name and role are required fields." });
        }
        if (!['waiter', 'kitchen', 'other'].includes(role)) {
            return res.status(400).json({ error: "Invalid role. Must be 'waiter', 'kitchen', or 'other'." });
        }
        if (role !== 'other' && !password) {
            return res.status(400).json({ error: "Password is required for waiter and kitchen staff." });
        }
        if (password && (password.length < 4 || password.length > 100)) {
            return res.status(400).json({ error: "Password must be between 4 and 100 characters." });
        }
        try {
            let loginId;
            let attempts = 0;
            do {
                loginId = String(Math.floor(1000000000 + Math.random() * 9000000000));
                const existing = await this.prisma.user.findUnique({ where: { loginId } });
                if (!existing)
                    break;
                attempts++;
            } while (attempts < 10);
            const salt = await bcrypt.genSalt(10);
            const finalPassword = password || Math.random().toString(36) + Math.random().toString(36);
            const passwordHash = await bcrypt.hash(finalPassword, salt);
            const pinHash = await bcrypt.hash('0000', salt);
            const dbRole = role === 'other' ? 'other' : role;
            const newStaff = await this.prisma.user.create({
                data: {
                    restaurantId,
                    name,
                    role: dbRole,
                    loginId,
                    passwordHash,
                    pinHash,
                    status: 'active'
                }
            });
            res.status(201).json({
                message: 'Staff member onboarded successfully!',
                staff: {
                    id: newStaff.id,
                    name: newStaff.name,
                    role,
                    loginId,
                    status: newStaff.status
                }
            });
        }
        catch (error) {
            console.error('[Add Staff Error]', error);
            res.status(500).json({ error: 'Could not create staff account. Please try again.' });
        }
    }
    ;
    async getStaff(req, res) {
        const restaurantId = req.user.restaurantId;
        try {
            const staff = await this.prisma.user.findMany({
                where: {
                    restaurantId,
                    role: { not: 'owner' }
                },
                select: {
                    id: true,
                    name: true,
                    role: true,
                    loginId: true,
                    status: true,
                    createdAt: true
                },
                orderBy: { id: 'asc' }
            });
            res.json(staff);
        }
        catch (error) {
            console.error('[Get Staff Error]', error);
            res.status(500).json({ error: 'Failed to retrieve staff list.' });
        }
    }
    ;
    async updateStaffStatus(req, res) {
        const { id } = req.params;
        const { status } = req.body;
        const restaurantId = req.user.restaurantId;
        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status value.' });
        }
        try {
            const staff = await this.prisma.user.update({
                where: { id: parseInt(id), restaurantId },
                data: { status }
            });
            res.json({ message: 'Staff account status updated successfully.', staff });
        }
        catch (error) {
            console.error('[Update Staff Status Error]', error);
            res.status(500).json({ error: 'Failed to update staff status.' });
        }
    }
    ;
    async editStaff(req, res) {
        const { id } = req.params;
        const { name, role, password } = req.body;
        const restaurantId = req.user.restaurantId;
        try {
            const staffMember = await this.prisma.user.findFirst({
                where: { id: parseInt(id), restaurantId, role: { not: 'owner' } }
            });
            if (!staffMember) {
                return res.status(404).json({ error: 'Staff member not found.' });
            }
            const updateData = {};
            if (name)
                updateData.name = name;
            if (role && ['waiter', 'kitchen', 'other'].includes(role)) {
                updateData.role = role;
            }
            if (password && password.length >= 4) {
                const salt = await bcrypt.genSalt(10);
                updateData.passwordHash = await bcrypt.hash(password, salt);
            }
            const updated = await this.prisma.user.update({
                where: { id: parseInt(id) },
                data: updateData,
                select: {
                    id: true, name: true, role: true, loginId: true, status: true
                }
            });
            res.json({ message: 'Staff account updated successfully.', staff: updated });
        }
        catch (error) {
            console.error('[Edit Staff Error]', error);
            res.status(500).json({ error: 'Failed to update staff account. Please try again.' });
        }
    }
    ;
    async deleteStaff(req, res) {
        const { id } = req.params;
        const restaurantId = req.user.restaurantId;
        try {
            const staffIdInt = parseInt(id);
            if (staffIdInt === req.user.id) {
                return res.status(400).json({ error: "Safety trigger: You cannot delete your own owner account!" });
            }
            const staffMember = await this.prisma.user.findFirst({
                where: { id: staffIdInt, restaurantId: restaurantId }
            });
            if (!staffMember) {
                return res.status(404).json({ error: "Staff member not found." });
            }
            await this.prisma.$transaction(async (tx) => {
                await tx.order.updateMany({
                    where: { createdBy: staffIdInt, restaurantId: restaurantId },
                    data: { createdBy: req.user.id }
                });
                await tx.user.delete({
                    where: { id: staffIdInt }
                });
            });
            res.json({ message: `Staff member "${staffMember.name}" has been permanently deleted from database!` });
        }
        catch (error) {
            console.error('[Delete Staff Error]', error);
            res.status(500).json({ error: error.message || "Failed to permanently delete staff member. Try again." });
        }
    }
    ;
    async updateRestaurant(req, res) {
        const restaurantId = req.user.restaurantId;
        const { name, address, logoUrl } = req.body;
        try {
            const currentRestaurant = await this.prisma.restaurant.findUnique({
                where: { id: restaurantId }
            });
            if (logoUrl && currentRestaurant?.logoUrl && currentRestaurant.logoUrl !== logoUrl) {
                const oldPath = path.join(__dirname, `../../../public${currentRestaurant.logoUrl}`);
                if (fs.existsSync(oldPath)) {
                    try {
                        fs.unlinkSync(oldPath);
                        console.log(`[Storage] Deleted old logo file: ${oldPath}`);
                    }
                    catch (err) {
                        console.error(`[Storage] Failed to delete old logo file: ${oldPath}`, err);
                    }
                }
            }
            const updatedRestaurant = await this.prisma.restaurant.update({
                where: { id: restaurantId },
                data: {
                    name,
                    address,
                    logoUrl
                }
            });
            res.json({
                message: "Restaurant details updated successfully.",
                restaurant: updatedRestaurant
            });
        }
        catch (error) {
            console.error('[Update Restaurant Failed]', error);
            res.status(400).json({ error: error.message || "Failed to update restaurant details." });
        }
    }
    async updateProfile(req, res) {
        const userId = req.user.id;
        const restaurantId = req.user.restaurantId;
        const { name, phone } = req.body;
        if (!name?.trim()) {
            return res.status(400).json({ error: "Name is required." });
        }
        try {
            const updatedUser = await this.prisma.user.update({
                where: { id: userId },
                data: { name }
            });
            let updatedRestaurant = null;
            if (phone) {
                updatedRestaurant = await this.prisma.restaurant.update({
                    where: { id: restaurantId },
                    data: { phone }
                });
            }
            res.json({
                message: "Profile details updated successfully.",
                user: {
                    id: updatedUser.id,
                    name: updatedUser.name,
                    role: updatedUser.role
                },
                restaurant: updatedRestaurant ? {
                    id: updatedRestaurant.id,
                    name: updatedRestaurant.name,
                    phone: updatedRestaurant.phone,
                    address: updatedRestaurant.address,
                    logoUrl: updatedRestaurant.logoUrl
                } : undefined
            });
        }
        catch (error) {
            console.error('[Update Profile Failed]', error);
            res.status(400).json({ error: error.message || "Failed to update profile details." });
        }
    }
    async getRestaurant(req, res) {
        const restaurantId = req.user.restaurantId;
        try {
            const restaurant = await this.prisma.restaurant.findUnique({
                where: { id: restaurantId }
            });
            if (!restaurant) {
                return res.status(404).json({ error: "Restaurant not found." });
            }
            res.json(restaurant);
        }
        catch (error) {
            console.error('[Get Restaurant Error]', error);
            res.status(500).json({ error: "Failed to retrieve restaurant details." });
        }
    }
    async changePassword(req, res) {
        try {
            const userId = req.user.id;
            const { currentPassword, newPassword } = req.body;
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: "Current password and new password are required." });
            }
            if (newPassword.length < 6) {
                return res.status(400).json({ error: "New password must be at least 6 characters." });
            }
            const user = await this.prisma.user.findUnique({
                where: { id: userId }
            });
            if (!user) {
                return res.status(404).json({ error: "User not found." });
            }
            const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!isValid) {
                return res.status(400).json({ error: "Incorrect current password." });
            }
            const newPasswordHash = await bcrypt.hash(newPassword, 10);
            await this.prisma.user.update({
                where: { id: userId },
                data: { passwordHash: newPasswordHash }
            });
            return res.json({ success: true, message: "Password changed successfully." });
        }
        catch (error) {
            console.error('[Change Password Error]', error);
            return res.status(500).json({ error: error.message || "Failed to update password." });
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, settings_service_1.SettingsService, email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map