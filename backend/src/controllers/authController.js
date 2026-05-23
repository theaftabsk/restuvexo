const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const emailService = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || "ros_super_secret_jwt_key_2026_restuvexo";

// 1. Stage 1: Owner Registration Request (Generates & Sends Email OTP)
exports.ownerSignup = async (req, res) => {
  const { name, restaurantName, phone, email, password } = req.body;

  if (!name || !restaurantName || !phone || !email || !password) {
    return res.status(400).json({ error: "All fields are required to register your restaurant." });
  }

  if (password.length > 100 || email.length > 100 || phone.length > 100 || name.length > 100 || restaurantName.length > 100) {
    return res.status(400).json({ error: "Input lengths exceed permitted security limits." });
  }

  try {
    console.log(`[Security Log] Owner signup request initiated for email: ${email}, restaurant: ${restaurantName} (IP: ${req.ip})`);
    // 1. Check if email already exists in restaurants
    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { email: email }
    });

    if (existingRestaurant) {
      return res.status(400).json({ error: "A restaurant with this email address already exists." });
    }

    // 2. Check if phone already exists in restaurants
    const existingRestaurantPhone = await prisma.restaurant.findFirst({
      where: { phone: phone }
    });

    if (existingRestaurantPhone) {
      return res.status(400).json({ error: "A restaurant with this phone number already exists." });
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Save pending registration payload in OtpVerification
    const payload = JSON.stringify({ name, restaurantName, phone, passwordHash });

    await prisma.otpVerification.upsert({
      where: { email: email },
      update: {
        otp: otp,
        payload: payload,
        createdAt: new Date()
      },
      create: {
        email: email,
        otp: otp,
        payload: payload
      }
    });

    // Send OTP to email via SMTP Nodemailer
    await emailService.sendOtpEmail(email, name, otp);

    res.status(200).json({
      message: "Email verification code has been dispatched. Check your inbox!"
    });

  } catch (error) {
    console.error('[Signup Request Error]', error);
    res.status(500).json({ error: error.message || "Could not process registration. Try again." });
  }
};

// 2. Stage 2: Confirm Email OTP & Complete Account Creation
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and verification code are required." });
  }

  if (email.length > 100 || otp.length > 20) {
    return res.status(400).json({ error: "Input lengths exceed permitted security limits." });
  }

  try {
    console.log(`[Security Log] OTP verification attempt for email: ${email} (IP: ${req.ip})`);
    const record = await prisma.otpVerification.findUnique({
      where: { email: email }
    });

    if (!record) {
      return res.status(400).json({ error: "No pending registration found for this email address." });
    }

    // Verify OTP code match
    if (record.otp !== otp) {
      console.log(`[Security Alert] Invalid OTP verification attempt for email: ${email} (IP: ${req.ip})`);
      return res.status(400).json({ error: "Invalid verification code. Please try again." });
    }

    // OTP matches! Decode details
    const { name, restaurantName, phone, passwordHash } = JSON.parse(record.payload);

    // Dynamic verification duplicate safety check (if credentials got claimed in the meantime)
    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { email: email }
    });

    if (existingRestaurant) {
      return res.status(400).json({ error: "A restaurant with this email address has already been registered." });
    }

    const existingRestaurantPhone = await prisma.restaurant.findFirst({
      where: { phone: phone }
    });

    if (existingRestaurantPhone) {
      return res.status(400).json({ error: "A restaurant with this phone number has already been registered." });
    }
    
    const salt = await bcrypt.genSalt(10);
    const defaultPinHash = await bcrypt.hash("0000", salt); // Default owner PIN

    const result = await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: restaurantName,
          phone: phone,
          email: email
        }
      });

      const user = await tx.user.create({
        data: {
          restaurantId: restaurant.id,
          name: name,
          role: "owner",
          loginId: email, // Owner loginId = their email address
          passwordHash: passwordHash,
          pinHash: defaultPinHash,
          status: "active",
          // Owner has 100% full master permissions by default
          hasPos: true,
          hasKitchen: true,
          hasOrders: true,
          hasInventory: true,
          hasStaff: true
        }
      });

      return { restaurant, user };
    });

    // Delete OtpVerification record
    await prisma.otpVerification.delete({
      where: { email: email }
    });

    // Send Welcome Email (Non-blocking fallback to prevent signup errors if SMTP credentials are missing)
    try {
      await emailService.sendWelcomeEmail(email, name, restaurantName);
    } catch (mailErr) {
      console.error("Failed to transmit Welcome email:", mailErr.message);
    }

    console.log(`[Security Log] Email verified successfully and owner account created. Email: ${email} (IP: ${req.ip})`);



    // Sign JWT
    const token = jwt.sign(
      { 
        id: result.user.id, 
        restaurantId: result.restaurant.id, 
        role: result.user.role, 
        name: result.user.name 
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: "Email verified successfully! Restaurant dashboard is live.",
      token,
      restaurant: {
        id: result.restaurant.id,
        name: result.restaurant.name
      },
      user: {
        id: result.user.id,
        name: result.user.name,
        role: result.user.role,
        hasPos: result.user.hasPos,
        hasKitchen: result.user.hasKitchen,
        hasOrders: result.user.hasOrders,
        hasInventory: result.user.hasInventory,
        hasStaff: result.user.hasStaff
      }
    });

  } catch (error) {
    console.error('[OTP Verify Error]', error);
    res.status(500).json({ error: "Failed to verify registration code. Try again." });
  }
};

// 3. Single Unified Login API
exports.login = async (req, res) => {
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
      // Owner email login: look up by restaurant email, then find owner user
      const restaurant = await prisma.restaurant.findUnique({
        where: { email: phoneOrEmail }
      });
      if (restaurant) {
        user = await prisma.user.findFirst({
          where: { restaurantId: restaurant.id, role: "owner" }
        });
      }
    } else {
      // Staff login: look up by 10-digit loginId
      user = await prisma.user.findUnique({
        where: { loginId: phoneOrEmail }
      });
    }

    if (!user || user.status !== 'active') {
      console.log(`[Security Alert] Unsuccessful login - user not found or inactive for: ${phoneOrEmail} (IP: ${req.ip})`);
      return res.status(401).json({ error: "Account not found, inactive, or invalid credentials." });
    }

    // Owners use passwordHash; staff also use passwordHash (set manually by owner)
    const isMatch = await bcrypt.compare(credential, user.passwordHash);

    if (!isMatch) {
      console.log(`[Security Alert] Unsuccessful login - invalid credentials for: ${phoneOrEmail} (IP: ${req.ip})`);
      return res.status(401).json({ error: "Invalid password. Please try again." });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: user.restaurantId }
    });

    const token = jwt.sign(
      {
        id: user.id,
        restaurantId: user.restaurantId,
        role: user.role,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

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
        hasPos: user.hasPos,
        hasKitchen: user.hasKitchen,
        hasOrders: user.hasOrders,
        hasInventory: user.hasInventory,
        hasStaff: user.hasStaff
      }
    });

  } catch (error) {
    console.error('[Unified Login Error]', error);
    res.status(500).json({ error: "Server authentication error. Please try again." });
  }
};


// 3a. Forgot Password Request (Generates & Sends Reset Password link)
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email address is required." });
  }

  if (email.length > 100) {
    return res.status(400).json({ error: "Input lengths exceed permitted security limits." });
  }

  console.log(`[Security Log] Forgot password requested for email: ${email} (IP: ${req.ip})`);

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { email: email }
    });

    if (!restaurant) {
      // Security measure: Do not disclose whether email exists or not
      console.log(`[Security Alert] Forgot password requested for non-existent email: ${email} (IP: ${req.ip})`);
      return res.status(200).json({
        message: "If your email is registered in our system, you will receive a password reset link shortly."
      });
    }

    const owner = await prisma.user.findFirst({
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

    // Generate secure random token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour validity

    // Save token on user record
    await prisma.user.update({
      where: { id: owner.id },
      data: {
        resetToken: token,
        resetExpires: tokenExpiry
      }
    });

    // Send email with reset password link
    const frontendUrl = process.env.FRONTEND_URL || "http://app.localhost:3000";
    const resetLink = `${frontendUrl}/auth/reset-password?token=${token}`;

    await emailService.sendResetPasswordEmail(email, owner.name, resetLink);

    console.log(`[Security Log] Forgot password link sent to email: ${email} (IP: ${req.ip})`);

    res.status(200).json({
      message: "If your email is registered in our system, you will receive a password reset link shortly."
    });

  } catch (error) {
    console.error('[Forgot Password Error]', error);
    res.status(500).json({ error: "Failed to process forgot password request." });
  }
};

// 3b. Reset Password (Verifies Token & Sets New Password)
exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: "Token and password are required fields." });
  }

  if (password.length > 100 || token.length > 200) {
    return res.status(400).json({ error: "Input lengths exceed permitted security limits." });
  }

  console.log(`[Security Log] Reset password request with token (IP: ${req.ip})`);

  try {
    const user = await prisma.user.findFirst({
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

    // Update user record: set new password, clear token fields
    await prisma.user.update({
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

  } catch (error) {
    console.error('[Reset Password Error]', error);
    res.status(500).json({ error: "Failed to reset password. Please try again." });
  }
};

// 4. Add Staff (Owner Only) — Auto-generates unique 10-digit Login ID
exports.addStaff = async (req, res) => {
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
    // Generate a unique 10-digit Login ID
    let loginId;
    let attempts = 0;
    do {
      loginId = String(Math.floor(1000000000 + Math.random() * 9000000000));
      const existing = await prisma.user.findUnique({ where: { loginId } });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    const salt = await bcrypt.genSalt(10);
    const finalPassword = password || Math.random().toString(36) + Math.random().toString(36);
    const passwordHash = await bcrypt.hash(finalPassword, salt);
    const pinHash = await bcrypt.hash('0000', salt); // Default PIN (unused for staff)

    const dbRole = role === 'other' ? 'other' : role;
    const hasPos = role === 'waiter';
    const hasKitchen = role === 'kitchen';
    const hasOrders = role === 'waiter';

    const newStaff = await prisma.user.create({
      data: {
        restaurantId,
        name,
        role: dbRole,
        loginId,
        passwordHash,
        pinHash,
        status: 'active',
        hasPos,
        hasKitchen,
        hasOrders,
        hasInventory: false,
        hasStaff: false
      }
    });

    res.status(201).json({
      message: 'Staff member onboarded successfully!',
      staff: {
        id: newStaff.id,
        name: newStaff.name,
        role,
        loginId, // Return generated loginId so owner can hand it to staff
        hasPos: newStaff.hasPos,
        hasKitchen: newStaff.hasKitchen,
        hasOrders: newStaff.hasOrders,
        hasInventory: newStaff.hasInventory,
        hasStaff: newStaff.hasStaff,
        status: newStaff.status
      }
    });
  } catch (error) {
    console.error('[Add Staff Error]', error);
    res.status(500).json({ error: 'Could not create staff account. Please try again.' });
  }
};


// 5. Get All Staff Members (Owner Only)
exports.getStaff = async (req, res) => {
  const restaurantId = req.user.restaurantId;
  try {
    const staff = await prisma.user.findMany({
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
        hasPos: true,
        hasKitchen: true,
        hasOrders: true,
        hasInventory: true,
        hasStaff: true,
        createdAt: true
      },
      orderBy: { id: 'asc' }
    });
    res.json(staff);
  } catch (error) {
    console.error('[Get Staff Error]', error);
    res.status(500).json({ error: 'Failed to retrieve staff list.' });
  }
};


// 6. Update Staff Active/Inactive Status
exports.updateStaffStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const restaurantId = req.user.restaurantId;

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }

  try {
    const staff = await prisma.user.update({
      where: { id: parseInt(id), restaurantId },
      data: { status }
    });
    res.json({ message: 'Staff account status updated successfully.', staff });
  } catch (error) {
    console.error('[Update Staff Status Error]', error);
    res.status(500).json({ error: 'Failed to update staff status.' });
  }
};

// 6b. Edit Staff Details (Name, Role, Password)
exports.editStaff = async (req, res) => {
  const { id } = req.params;
  const { name, role, password, hasPos, hasKitchen, hasOrders, hasInventory, hasStaff } = req.body;
  const restaurantId = req.user.restaurantId;

  try {
    const staffMember = await prisma.user.findFirst({
      where: { id: parseInt(id), restaurantId, role: { not: 'owner' } }
    });

    if (!staffMember) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }

    const updateData = {};

    if (name) updateData.name = name;
    if (role && ['waiter', 'kitchen', 'other'].includes(role)) {
      updateData.role = role;
      // Auto-adjust permissions on role change
      if (hasPos === undefined) updateData.hasPos = role === 'waiter';
      if (hasKitchen === undefined) updateData.hasKitchen = role === 'kitchen';
      if (hasOrders === undefined) updateData.hasOrders = role === 'waiter';
    }
    if (password && password.length >= 4) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(password, salt);
    }
    if (hasPos !== undefined) updateData.hasPos = !!hasPos;
    if (hasKitchen !== undefined) updateData.hasKitchen = !!hasKitchen;
    if (hasOrders !== undefined) updateData.hasOrders = !!hasOrders;
    if (hasInventory !== undefined) updateData.hasInventory = !!hasInventory;
    if (hasStaff !== undefined) updateData.hasStaff = !!hasStaff;

    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true, name: true, role: true, loginId: true, status: true,
        hasPos: true, hasKitchen: true, hasOrders: true, hasInventory: true, hasStaff: true
      }
    });

    res.json({ message: 'Staff account updated successfully.', staff: updated });
  } catch (error) {
    console.error('[Edit Staff Error]', error);
    res.status(500).json({ error: 'Failed to update staff account. Please try again.' });
  }
};


// 7. Update Staff Module Permissions Switches
exports.updateStaffPermissions = async (req, res) => {
  const { id } = req.params;
  const { hasPos, hasKitchen, hasOrders, hasInventory, hasStaff } = req.body;
  const restaurantId = req.user.restaurantId;

  try {
    const staff = await prisma.user.update({
      where: { id: parseInt(id), restaurantId: restaurantId },
      data: {
        hasPos: hasPos !== undefined ? !!hasPos : false,
        hasKitchen: hasKitchen !== undefined ? !!hasKitchen : false,
        hasOrders: hasOrders !== undefined ? !!hasOrders : false,
        hasInventory: hasInventory !== undefined ? !!hasInventory : false,
        hasStaff: hasStaff !== undefined ? !!hasStaff : false
      }
    });
    res.json({ message: "Staff permissions successfully synchronized.", staff });
  } catch (error) {
    console.error('[Update Staff Permissions Error]', error);
    res.status(500).json({ error: "Failed to update staff permissions." });
  }
};

// 8. Delete Staff Member Completely (Owner Only - Database Hard Delete)
exports.deleteStaff = async (req, res) => {
  const { id } = req.params;
  const restaurantId = req.user.restaurantId;

  try {
    const staffIdInt = parseInt(id);
    
    // Safety check: Don't allow owner to delete themselves
    if (staffIdInt === req.user.id) {
      return res.status(400).json({ error: "Safety trigger: You cannot delete your own owner account!" });
    }

    const staffMember = await prisma.user.findFirst({
      where: { id: staffIdInt, restaurantId: restaurantId }
    });

    if (!staffMember) {
      return res.status(404).json({ error: "Staff member not found." });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Safe Transfer: Transfer all orders created by this staff member to the deleting Owner/Admin
      await tx.order.updateMany({
        where: { createdBy: staffIdInt, restaurantId: restaurantId },
        data: { createdBy: req.user.id }
      });

      // 2. Safe Delete: Remove staff account from database completely
      await tx.user.delete({
        where: { id: staffIdInt }
      });
    });

    res.json({ message: `Staff member "${staffMember.name}" has been permanently deleted from database!` });

  } catch (error) {
    console.error('[Delete Staff Error]', error);
    res.status(500).json({ error: error.message || "Failed to permanently delete staff member. Try again." });
  }
};

