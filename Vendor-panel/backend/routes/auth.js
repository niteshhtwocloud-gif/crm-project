const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const auth = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyforvendorcrmapp2026';

// @route   POST /api/auth/register
// @desc    Register a new administrator
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Please provide all required fields." });
  }

  try {
    // Check if admin already exists
    const existingAdmin = await db.findAdminByEmail(email);
    if (existingAdmin) {
      return res.status(400).json({ message: "An administrator with this email already exists." });
    }

    // Encrypt password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const newAdmin = await db.addAdmin({
      name,
      email,
      password: hashedPassword
    });

    // Create JWT Token
    const token = jwt.sign(
      { id: newAdmin.id, name: newAdmin.name, email: newAdmin.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email
      }
    });
  } catch (error) {
    console.error('Registration failed:', error);
    res.status(500).json({ message: 'Internal server error during registration.' });
  }
});

// Helper to escape regex
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// @route   POST /api/auth/login
// @desc    Login administrator, vendor or customer and get JWT token
router.post('/login', async (req, res) => {
  const { email, password } = req.body; // email can be username or email

  if (!email || !password) {
    return res.status(400).json({ message: "Please enter your username/email and password." });
  }

  try {
    let userPayload = null;

    // 1. Try finding in admins (admins & vendors)
    if (email.includes('@')) {
      const admin = await db.findAdminByEmail(email);
      if (admin) {
        // Verify password match
        const isMatch = bcrypt.compareSync(password, admin.password);
        if (!isMatch) {
          return res.status(400).json({ message: "Invalid credentials." });
        }

        // Check if this admin email corresponds to a vendor partner
        const VendorModel = db.models.Vendor;
        let vendor = await VendorModel.findOne({ email: new RegExp(`^${escapeRegExp(email)}$`, 'i') }).lean();

        if (!vendor) {
          const allVendors = await VendorModel.find({}).lean();
          vendor = allVendors.find(v => {
            const vName = typeof v.name === 'string' ? v.name.toLowerCase() : '';
            const aName = typeof admin.name === 'string' ? admin.name.toLowerCase() : '';
            if (!vName || !aName) return false;
            return aName.includes(vName) || vName.includes(aName) ||
              (vName === 'amazon web services' && aName.includes('aws')) ||
              (vName === 'godaddy' && aName.includes('godaddy'));
          });
        }

        let finalRole = "vendor";
        if (email.toLowerCase() === "admin@vendorcrm.com" || email.toLowerCase() === "admin@h2cloud.com") {
          finalRole = "super_admin";
        } else if (vendor && vendor.parentVendorId) {
          finalRole = "sub_vendor";
        }

        const displayName = vendor ? (vendor.name || vendor.companyName || admin.name) : admin.name;
        const companyName = vendor ? (vendor.companyName || vendor.name || "") : (admin.name || "");

        userPayload = {
          id: admin.id || admin._id,
          name: displayName,
          vendorName: vendor ? vendor.name : admin.name,
          companyName: companyName,
          email: admin.email,
          role: finalRole,
          vendorId: vendor ? String(vendor._id) : null,
          parentVendorId: vendor && vendor.parentVendorId ? String(vendor.parentVendorId) : null,
          avatar: vendor && vendor.avatar ? vendor.avatar : null
        };
      }
    }

    // 2. Try finding directly in vendors if not found in admins
    if (!userPayload) {
      const VendorModel = db.models.Vendor;
      const vendorDoc = await VendorModel.findOne({
        $or: [
          { email: new RegExp(`^${escapeRegExp(email)}$`, 'i') },
          { username: email }
        ]
      }).lean();

      if (vendorDoc && vendorDoc.password) {
        const isMatch = bcrypt.compareSync(password, vendorDoc.password) || password === vendorDoc.password;
        if (isMatch) {
          const displayName = vendorDoc.name || vendorDoc.companyName || "Vendor User";
          const companyName = vendorDoc.companyName || vendorDoc.name || "";

          userPayload = {
            id: String(vendorDoc._id),
            name: displayName,
            vendorName: vendorDoc.name,
            companyName: companyName,
            email: vendorDoc.email || "",
            role: vendorDoc.parentVendorId ? "sub_vendor" : (vendorDoc.role || "vendor"),
            vendorId: String(vendorDoc._id),
            parentVendorId: vendorDoc.parentVendorId ? String(vendorDoc.parentVendorId) : null,
            avatar: vendorDoc.avatar || null
          };
        }
      }
    }

    // 3. Try finding in users (Customers) if not found in admins or vendors
    if (!userPayload) {
      const CustomerModel = db.models.Customer;
      // Search by username or email
      const customer = await CustomerModel.findOne({
        $or: [
          { username: email },
          { email: new RegExp(`^${escapeRegExp(email)}$`, 'i') }
        ]
      }).lean();

      if (customer && customer.password) {
        // Verify password match
        const isMatch = bcrypt.compareSync(password, customer.password) || password === customer.password;
        if (!isMatch) {
          return res.status(400).json({ message: "Invalid credentials." });
        }

        userPayload = {
          id: customer.id || customer._id,
          name: customer.name,
          vendorName: customer.customerName || customer.name || null,
          companyName: customer.customerName || customer.name || '',
          email: customer.email || '',
          role: "Customer",
          vendorId: customer.vendorId ? String(customer.vendorId) : null,
          parentVendorId: customer.parentVendorId ? String(customer.parentVendorId) : null,
          avatar: null
        };
      }
    }

    if (!userPayload) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    // Sign Token with full payload
    const token = jwt.sign(
      userPayload,
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: userPayload.id,
        name: userPayload.name,
        vendorName: userPayload.vendorName,
        companyName: userPayload.companyName,
        email: userPayload.email,
        role: userPayload.role,
        vendorId: userPayload.vendorId,
        parentVendorId: userPayload.parentVendorId,
        avatar: userPayload.avatar
      }
    });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ message: 'Internal server error during login.' });
  }
});

// @route   GET /api/auth/me
// @desc    Get currently logged in user info (fresh from DB)
router.get('/me', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    let freshUser = { ...req.user };

    if (userId) {
      const Admin = db.models.Admin;
      const Vendor = db.models.Vendor;
      const Customer = db.models.Customer;

      let found = await Admin.findById(userId).lean();
      if (!found) {
        found = await Vendor.findById(userId).lean();
      }
      if (!found) {
        found = await Customer.findById(userId).lean();
      }

      if (found) {
        freshUser.name = found.name || found.companyName || found.customerName || freshUser.name;
        freshUser.email = found.email || freshUser.email;
        freshUser.avatar = found.avatar || null;
      }
    }
    
    res.json({ user: freshUser });
  } catch (err) {
    console.error("Failed to fetch fresh user data in /me:", err);
    res.json({ user: req.user });
  }
});

const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Helpers for OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('Nodemailer verification error:', error);
  } else {
    console.log('Nodemailer is ready to send messages');
  }
});

const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset OTP',
    text: `Hello,\n\nYour OTP for password reset is:\n\n${otp}\n\nThis OTP is valid for 5 minutes.\n\nIf you didn't request this, ignore this email.`
  };

  await transporter.sendMail(mailOptions);
};

// @route   GET /api/auth/forgot-password
router.get('/forgot-password', (req, res) => {
  res.json({ message: "Use POST request for this endpoint." });
});

// @route   POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    let userRole = null;

    // Check if email exists in admins
    const admin = await db.findAdminByEmail(email);
    if (admin) {
      userRole = 'admin';
    } else {
      // Check if email exists in users (Customers)
      const CustomerModel = db.models.Customer;
      const customer = await CustomerModel.findOne({ email: new RegExp(`^${escapeRegExp(email)}$`, 'i') }).lean();
      if (customer) {
        userRole = 'customer';
      }
    }

    if (!userRole) {
      return res.status(404).json({ success: false, message: "Email not found" });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const OTPModel = db.models.OTP;

    // Remove any existing OTP for this email
    await OTPModel.deleteMany({ email: email.toLowerCase() });

    await OTPModel.create({
      email: email.toLowerCase(),
      otp,
      expiresAt,
      verified: false
    });

    await sendOTPEmail(email, otp);

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// @route   POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

  try {
    const OTPModel = db.models.OTP;
    const record = await OTPModel.findOne({ email: email.toLowerCase(), otp });

    if (!record) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (new Date() > record.expiresAt) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // OTP verified, keep it to allow reset-password to proceed
    await OTPModel.updateOne({ _id: record._id }, { $set: { verified: true } });

    res.json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// @route   POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const OTPModel = db.models.OTP;
    await OTPModel.deleteMany({ email: email.toLowerCase() });

    await OTPModel.create({
      email: email.toLowerCase(),
      otp,
      expiresAt,
      verified: false
    });

    await sendOTPEmail(email, otp);

    res.json({ message: "OTP resent successfully" });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// @route   POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) return res.status(400).json({ message: "Email and new password are required" });

  try {
    const OTPModel = db.models.OTP;
    const record = await OTPModel.findOne({ email: email.toLowerCase(), verified: true });

    if (!record) {
      return res.status(400).json({ message: "Session expired or invalid. Please request a new OTP." });
    }

    if (new Date() > record.expiresAt) {
      return res.status(400).json({ message: "Session has expired" });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);

    // Update password in admins or users
    const admin = await db.findAdminByEmail(email);
    if (admin) {
      const AdminModel = db.models.Admin;
      await AdminModel.updateOne({ _id: admin.id || admin._id }, { $set: { password: hashedPassword } });
    } else {
      const CustomerModel = db.models.Customer;
      const customer = await CustomerModel.findOne({ email: new RegExp(`^${escapeRegExp(email)}$`, 'i') }).lean();
      if (customer) {
        await CustomerModel.updateOne({ _id: customer.id || customer._id }, { $set: { password: hashedPassword } });
      } else {
        return res.status(404).json({ message: "User not found" });
      }
    }

    // Delete/clear the OTP after successful verification and reset
    await OTPModel.deleteMany({ email: email.toLowerCase() });

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
