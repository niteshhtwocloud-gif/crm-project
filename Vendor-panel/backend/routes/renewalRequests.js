const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const db = require('../database/db');
const auth = require('../middleware/auth');
const { applyTenantFilter } = require('../utils/tenant');
const { calculateDaysLeft } = require('../utils/dateUtils');

// @route   POST /api/renewal-requests
// @desc    Create a new renewal request for a service
router.post('/', auth, async (req, res) => {
  try {
    const { serviceId, customerId, customerName, username, vendorId, vendorName, serviceName, domain, currentExpiryDate } = req.body;

    if (!serviceId) {
      return res.status(400).json({ message: "serviceId is required." });
    }

    const targetServiceId = String(serviceId);
    const targetCustId = String(customerId || serviceId);

    // Check if there is already a Pending request for this service
    const existingPending = await db.models.RenewalRequest.findOne({
      $or: [
        { serviceId: targetServiceId, requestStatus: "Pending" },
        { customerId: targetCustId, requestStatus: "Pending" }
      ]
    }).lean();

    if (existingPending) {
      return res.status(400).json({ message: "Renewal request already pending." });
    }

    let finalCustName = customerName || "";
    let finalUsername = username || "";
    let finalServiceName = serviceName || "";
    let finalVendorName = vendorName || "";
    let finalDomain = domain || "";
    let finalExpiry = currentExpiryDate || "";
    let finalStartDate = "";

    const lookupId = customerId || serviceId;
    if (lookupId && mongoose.Types.ObjectId.isValid(lookupId)) {
      const cust = await db.models.Customer.findById(lookupId).lean();
      if (cust) {
        finalCustName = finalCustName || cust.name || cust.customerName || "";
        finalUsername = finalUsername || cust.username || "";
        finalServiceName = finalServiceName || cust.productService || cust.service || "";
        finalVendorName = finalVendorName || cust.vendor || cust.vendorName || "";
        finalDomain = finalDomain || cust.domain || cust.domainName || "";
        finalStartDate = cust.creationDate || cust.loginDate || "";
        if (!finalExpiry && cust.expiryDate) {
          const d = new Date(cust.expiryDate);
          finalExpiry = !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : String(cust.expiryDate);
        }
      }
    }

    const requestedBy = req.user.name || req.user.email || req.user.companyName || "Vendor";
    const requestVendorId = req.user.vendorId || vendorId || String(req.user.id || req.user._id || "");

    const newRequest = await db.models.RenewalRequest.create({
      serviceId: targetServiceId,
      customerId: targetCustId,
      customerName: finalCustName || "Customer",
      username: finalUsername || "—",
      vendorId: requestVendorId,
      vendorName: finalVendorName || requestedBy,
      serviceName: finalServiceName || "Service",
      domain: finalDomain || "—",
      currentExpiryDate: finalExpiry || "—",
      startDate: finalStartDate || "—",
      requestedAt: new Date(),
      requestedBy,
      requestStatus: "Pending"
    });

    // Create Notification for Admin
    const nowStr = new Date().toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }) + ", " + new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });

    await db.models.Notification.create({
      id: Date.now(),
      type: "info",
      category: "Renewal Request",
      text: `Renewal request received for ${finalCustName ? finalCustName + ' - ' : ''}${finalServiceName || 'Service'} by ${requestedBy}`,
      time: nowStr,
      unread: true,
      requestId: newRequest._id.toString()
    });

    return res.status(201).json({ message: "Renewal request submitted successfully.", request: newRequest });
  } catch (error) {
    console.error("Failed to create renewal request:", error);
    res.status(500).json({ message: "Error creating renewal request." });
  }
});

// @route   GET /api/renewal-requests
// @desc    Get all renewal requests
router.get('/', auth, async (req, res) => {
  try {
    let filter = {};
    if (req.user && req.user.role === 'vendor') {
      const vId = String(req.user.id || req.user._id || req.user.vendorId || "");
      filter = { vendorId: vId };
    }

    const requests = await db.models.RenewalRequest.find(filter).sort({ requestedAt: -1 }).lean();

    const enrichedRequests = await Promise.all(requests.map(async (r) => {
      let custName = r.customerName || "";
      let username = r.username || "";
      let product = r.serviceName || "";
      let vendorName = r.vendorName || "";
      let domain = r.domain || "";
      let startDate = r.startDate || "";
      let expiryDate = r.currentExpiryDate || "";

      try {
        const targetId = r.customerId || r.serviceId;
        if (targetId && mongoose.Types.ObjectId.isValid(targetId)) {
          const cust = await db.models.Customer.findById(targetId).lean();
          if (cust) {
            custName = custName || cust.name || cust.customerName || "";
            username = username || cust.username || "";
            product = product || cust.productService || cust.service || "";
            vendorName = vendorName || cust.vendor || cust.vendorName || "";
            domain = domain || cust.domain || cust.domainName || "";
            startDate = startDate || cust.creationDate || cust.loginDate || "";
            if (!expiryDate && cust.expiryDate) {
              const d = new Date(cust.expiryDate);
              expiryDate = !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : String(cust.expiryDate);
            }
          } else {
            const srv = await db.models.Service.findById(targetId).lean();
            if (srv) {
              product = product || srv.name || "";
              startDate = startDate || srv.created || "";
              if (!expiryDate && (srv.expiry || srv.expiryDate)) {
                expiryDate = srv.expiry || srv.expiryDate;
              }
            }
          }
        }
      } catch (err) {
        console.error("Enrichment error:", err);
      }

      return {
        ...r,
        customerName: custName || "Customer",
        username: username || "—",
        serviceName: product || "Service",
        vendorName: vendorName || r.requestedBy || "Vendor",
        domain: domain || "—",
        startDate: startDate || "—",
        currentExpiryDate: expiryDate || "—"
      };
    }));

    res.json(enrichedRequests);
  } catch (error) {
    console.error("Failed to fetch renewal requests:", error);
    res.status(500).json({ message: "Error fetching renewal requests." });
  }
});

// @route   PATCH /api/renewal-requests/:id/approve
// @desc    Approve a renewal request and extend service by 1 calendar year
router.patch('/:id/approve', auth, async (req, res) => {
  try {
    const requestId = req.params.id;
    const requestDoc = await db.models.RenewalRequest.findById(requestId);

    if (!requestDoc) {
      return res.status(404).json({ message: "Renewal request not found." });
    }

    if (requestDoc.requestStatus !== "Pending") {
      return res.status(400).json({ message: `Request has already been ${requestDoc.requestStatus.toLowerCase()}.` });
    }

    const targetServiceId = requestDoc.serviceId;

    // 1. Try to find in Service collection first
    let updatedTarget = null;
    let serviceDoc = null;
    if (mongoose.Types.ObjectId.isValid(targetServiceId)) {
      serviceDoc = await db.models.Service.findById(targetServiceId);
    }
    if (!serviceDoc) {
      serviceDoc = await db.models.Service.findOne({ name: targetServiceId });
    }

    if (serviceDoc) {
      const baseExpiry = serviceDoc.expiry || serviceDoc.expiryDate ? new Date(serviceDoc.expiry || serviceDoc.expiryDate) : new Date();
      const currentExpiry = isNaN(baseExpiry.getTime()) ? new Date() : baseExpiry;

      // Add EXACTLY 1 CALENDAR YEAR
      currentExpiry.setFullYear(currentExpiry.getFullYear() + 1);
      const newExpiryStr = currentExpiry.toISOString().slice(0, 10);
      const daysLeft = calculateDaysLeft(newExpiryStr);
      const newStatus = daysLeft <= 0 ? "Expired" : daysLeft <= 7 ? "Expiring" : "Active";

      await db.models.Service.updateOne({ _id: serviceDoc._id }, {
        $set: {
          expiry: newExpiryStr,
          expiryDate: newExpiryStr,
          status: newStatus,
          daysLeft
        }
      });
      updatedTarget = { type: 'Service', id: serviceDoc._id, newExpiryStr, status: newStatus };
    } else {
      // 2. Try Customer collection
      let custDoc = null;
      if (mongoose.Types.ObjectId.isValid(targetServiceId)) {
        custDoc = await db.models.Customer.findById(targetServiceId);
      }
      if (!custDoc) {
        custDoc = await db.models.Customer.findOne({ id: targetServiceId });
      }

      if (custDoc) {
        const baseExpiry = custDoc.expiryDate ? new Date(custDoc.expiryDate) : new Date();
        const currentExpiry = isNaN(baseExpiry.getTime()) ? new Date() : baseExpiry;

        // Add EXACTLY 1 CALENDAR YEAR
        currentExpiry.setFullYear(currentExpiry.getFullYear() + 1);
        const newExpiryStr = currentExpiry.toISOString().slice(0, 10);
        const daysLeft = calculateDaysLeft(newExpiryStr);
        const newStatus = daysLeft <= 0 ? "Expired" : "Active";

        await db.models.Customer.updateOne({ _id: custDoc._id }, {
          $set: {
            expiryDate: currentExpiry,
            daysLeft,
            status: newStatus
          }
        });
        updatedTarget = { type: 'Customer', id: custDoc._id, newExpiryStr, status: newStatus };
      } else {
        // 3. Try Subscription collection
        let subDoc = null;
        if (mongoose.Types.ObjectId.isValid(targetServiceId)) {
          subDoc = await db.models.Subscription.findById(targetServiceId);
        }
        if (!subDoc) {
          subDoc = await db.models.Subscription.findOne({ id: targetServiceId });
        }

        if (subDoc) {
          const baseExpiry = subDoc.expiry ? new Date(subDoc.expiry) : new Date();
          const currentExpiry = isNaN(baseExpiry.getTime()) ? new Date() : baseExpiry;

          currentExpiry.setFullYear(currentExpiry.getFullYear() + 1);
          const newExpiryStr = currentExpiry.toISOString().slice(0, 10);
          const daysLeft = calculateDaysLeft(newExpiryStr);
          const newStatus = daysLeft <= 0 ? "danger" : daysLeft <= 7 ? "warning" : "success";

          await db.models.Subscription.updateOne({ _id: subDoc._id }, {
            $set: {
              expiry: newExpiryStr,
              daysLeft,
              status: newStatus
            }
          });
          updatedTarget = { type: 'Subscription', id: subDoc._id, newExpiryStr, status: newStatus };
        }
      }
    }

    // Update RenewalRequest record
    requestDoc.requestStatus = "Approved";
    requestDoc.reviewedAt = new Date();
    requestDoc.reviewedBy = req.user.name || req.user.email || "Admin";
    await requestDoc.save();

    res.json({ message: "Renewal request approved successfully.", request: requestDoc, updatedTarget });
  } catch (error) {
    console.error("Failed to approve renewal request:", error);
    res.status(500).json({ message: "Error approving renewal request." });
  }
});

// @route   PATCH /api/renewal-requests/:id/reject
// @desc    Reject a renewal request
router.patch('/:id/reject', auth, async (req, res) => {
  try {
    const requestId = req.params.id;
    const requestDoc = await db.models.RenewalRequest.findById(requestId);

    if (!requestDoc) {
      return res.status(404).json({ message: "Renewal request not found." });
    }

    if (requestDoc.requestStatus !== "Pending") {
      return res.status(400).json({ message: `Request has already been ${requestDoc.requestStatus.toLowerCase()}.` });
    }

    requestDoc.requestStatus = "Rejected";
    requestDoc.reviewedAt = new Date();
    requestDoc.reviewedBy = req.user.name || req.user.email || "Admin";
    await requestDoc.save();

    res.json({ message: "Renewal request rejected.", request: requestDoc });
  } catch (error) {
    console.error("Failed to reject renewal request:", error);
    res.status(500).json({ message: "Error rejecting renewal request." });
  }
});

module.exports = router;
