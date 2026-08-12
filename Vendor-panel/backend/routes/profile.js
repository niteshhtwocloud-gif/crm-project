const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const auth = require('../middleware/auth');

// Helper to escape regex
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Helper to find current user in DB (checking all 3 collections: Admin, Vendor, Customer)
const findCurrentUser = async (userId) => {
  const Admin = db.models.Admin;
  const Vendor = db.models.Vendor;
  const Customer = db.models.Customer;

  let user = await Admin.findById(userId);
  if (user) return { doc: user, model: Admin, role: 'admin' };

  user = await Vendor.findById(userId);
  if (user) return { doc: user, model: Vendor, role: 'vendor' };

  user = await Customer.findById(userId);
  if (user) return { doc: user, model: Customer, role: 'customer' };

  return null;
};

// Helper to check for duplicate email across all collections
const checkDuplicateEmail = async (email, excludeUserId) => {
  const regexEmail = new RegExp(`^${escapeRegExp(email)}$`, 'i');
  const Admin = db.models.Admin;
  const Vendor = db.models.Vendor;
  const Customer = db.models.Customer;

  const a = await Admin.findOne({ email: regexEmail, _id: { $ne: excludeUserId } });
  if (a) return true;

  const v = await Vendor.findOne({ email: regexEmail, _id: { $ne: excludeUserId } });
  if (v) return true;

  const c = await Customer.findOne({ email: regexEmail, _id: { $ne: excludeUserId } });
  if (c) return true;

  return false;
};

// @route   PATCH /api/profile
// @desc    Update user profile details and password
router.patch('/', auth, async (req, res) => {
  const { name, email, currentPassword, newPassword } = req.body;
  const userId = req.user.id || req.user._id;

  try {
    const userResult = await findCurrentUser(userId);
    if (!userResult) {
      return res.status(404).json({ message: "User not found in database." });
    }

    const { doc, model } = userResult;

    // Email update check
    if (email && email.toLowerCase() !== (doc.email || '').toLowerCase()) {
      const isDuplicate = await checkDuplicateEmail(email, doc._id);
      if (isDuplicate) {
        return res.status(400).json({ message: "This email address is already in use." });
      }
    }

    const updateFields = {};
    if (name) {
      updateFields.name = name;
      // Some models like Vendor/Customer also use companyName or customerName
      if (doc.companyName !== undefined) updateFields.companyName = name;
      if (doc.customerName !== undefined) updateFields.customerName = name;
    }
    if (email) {
      updateFields.email = email;
    }

    // Password Update Flow
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required to set a new password." });
      }
      
      const isMatch = bcrypt.compareSync(currentPassword, doc.password) || currentPassword === doc.password;
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect." });
      }

      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(newPassword, salt);
      updateFields.password = hashedPassword;
    }

    if (Object.keys(updateFields).length > 0) {
      await model.updateOne({ _id: doc._id }, { $set: updateFields });
    }

    // Don't send back password
    const updatedUser = await model.findById(doc._id).lean();
    delete updatedUser.password;

    res.json({ message: "Profile updated successfully.", user: updatedUser });
  } catch (error) {
    console.error("Failed to update profile:", error);
    res.status(500).json({ message: "Failed to update profile." });
  }
});

// @route   POST /api/profile/avatar
// @desc    Upload new profile photo (base64)
router.post('/avatar', auth, async (req, res) => {
  const { avatar } = req.body;
  const userId = req.user.id || req.user._id;

  if (!avatar) {
    return res.status(400).json({ message: "No avatar data provided." });
  }

  try {
    const userResult = await findCurrentUser(userId);
    if (!userResult) {
      return res.status(404).json({ message: "User not found." });
    }

    const { doc, model } = userResult;
    await model.updateOne({ _id: doc._id }, { $set: { avatar } });

    res.json({ message: "Profile photo updated successfully.", avatar });
  } catch (error) {
    console.error("Failed to upload avatar:", error);
    res.status(500).json({ message: "Failed to upload profile photo." });
  }
});

// @route   DELETE /api/profile/avatar
// @desc    Reset profile photo
router.delete('/avatar', auth, async (req, res) => {
  const userId = req.user.id || req.user._id;

  try {
    const userResult = await findCurrentUser(userId);
    if (!userResult) {
      return res.status(404).json({ message: "User not found." });
    }

    const { doc, model } = userResult;
    await model.updateOne({ _id: doc._id }, { $unset: { avatar: 1 } });

    res.json({ message: "Profile photo reset successfully." });
  } catch (error) {
    console.error("Failed to reset avatar:", error);
    res.status(500).json({ message: "Failed to reset profile photo." });
  }
});

module.exports = router;
