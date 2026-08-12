const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const db = require('../database/db');
const auth = require('../middleware/auth');
const { applyTenantFilter } = require('../utils/tenant');
const { calculateDaysLeft } = require('../utils/dateUtils');

// @route   PATCH /api/renew/:id
// @desc    Renew a service or customer subscription by 1 calendar year
router.patch('/:id', auth, async (req, res) => {
  const targetId = String(req.params.id);

  try {
    // 1. Try to find the record in Subscriptions collection first
    const subConditions = await applyTenantFilter(req.user, 'subscriptions', { id: targetId });
    const existingSub = await db.models.Subscription.findOne(subConditions).lean();

    if (existingSub) {
      // Calculate + 1 year from current expiry
      const currentExpiry = new Date(existingSub.expiry);
      currentExpiry.setFullYear(currentExpiry.getFullYear() + 1);
      const newExpiryStr = currentExpiry.toISOString().slice(0, 10);

      const daysLeft = Math.ceil((new Date(newExpiryStr) - new Date()) / (1000 * 60 * 60 * 24));
      
      let status = 'success';
      if (daysLeft <= 3) status = 'danger';
      else if (daysLeft <= 8) status = 'warning';
      else if (daysLeft <= 12) status = 'info';

      const updatedSub = {
        ...existingSub,
        expiry: newExpiryStr,
        daysLeft,
        status,
        recordType: 'Subscription' // hint for frontend
      };

      await db.models.Subscription.updateOne(subConditions, { 
        $set: {
          expiry: newExpiryStr,
          daysLeft,
          status
        }
      });

      return res.json(updatedSub);
    }

    // 2. If not found, try to find in Customers collection
    if (mongoose.Types.ObjectId.isValid(targetId)) {
      const custConditions = await applyTenantFilter(req.user, 'users', { _id: targetId });
      const existingCustomer = await db.models.Customer.findOne(custConditions).lean();

      if (existingCustomer) {
        // Find existing expiry date
        const existingExpiryDate = existingCustomer.expiryDate ? new Date(existingCustomer.expiryDate) : new Date();
        existingExpiryDate.setFullYear(existingExpiryDate.getFullYear() + 1);
        const newExpiryDateStr = existingExpiryDate.toISOString().slice(0, 10);
        
        const daysLeft = calculateDaysLeft(newExpiryDateStr);

        // Typical Customer status update
        const updatedCustomer = {
          ...existingCustomer,
          expiryDate: newExpiryDateStr,
          daysLeft,
          status: 'Active',
          recordType: 'Customer' // hint for frontend
        };

        // Format for Mongoose response compatibility with frontend
        updatedCustomer.id = updatedCustomer._id.toString();

        await db.models.Customer.updateOne(custConditions, {
          $set: {
            expiryDate: existingExpiryDate,
            daysLeft,
            status: 'Active'
          }
        });

        return res.json(updatedCustomer);
      }
    }

    // Not found in either collection
    return res.status(404).json({ message: "Service or Customer not found." });

  } catch (error) {
    console.error('Failed to renew service:', error);
    res.status(500).json({ message: 'Error processing renewal on the server.' });
  }
});

module.exports = router;
