const mongoose = require('mongoose');
const { models } = require('../database/db');

const getTenantFilter = async (user, tableName = '') => {
  if (!user || user.role === 'super_admin') return null;

  let vendorDoc = null;
  if (user.vendorId) {
    const isOid = mongoose.Types.ObjectId.isValid(user.vendorId);
    vendorDoc = await models.Vendor.findOne({
      $or: [
        ...(isOid ? [{ _id: user.vendorId }] : []),
        { vendorId: user.vendorId },
        { id: String(user.vendorId) }
      ]
    }).lean();
  }
  if (!vendorDoc && user.email) {
    vendorDoc = await models.Vendor.findOne({ email: new RegExp('^' + user.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }).lean();
  }

  if (!vendorDoc) {
    const fallbackId = String(user.vendorId || user.id || '');
    return {
      allowedIds: fallbackId ? [fallbackId] : [],
      emails: user.email ? [user.email] : []
    };
  }

  const baseIds = [String(vendorDoc._id), vendorDoc.vendorId, vendorDoc.id ? String(vendorDoc.id) : null].filter(Boolean);
  const emails = [vendorDoc.email].filter(Boolean);

  // If sub-vendor, only include this vendor's IDs
  if (user.role === 'sub_vendor' && vendorDoc.parentVendorId && String(vendorDoc.parentVendorId) !== String(vendorDoc._id)) {
    return { allowedIds: baseIds, emails };
  }

  // Main vendor: also find all sub-vendors under this vendor
  const subVendors = await models.Vendor.find({
    $or: [
      { parentVendorId: { $in: baseIds } },
      { vendorId: { $in: baseIds } }
    ],
    _id: { $ne: vendorDoc._id }
  }).lean();

  const allAllowedIds = [...baseIds];
  subVendors.forEach(sv => {
    if (sv._id) allAllowedIds.push(String(sv._id));
    if (sv.vendorId) allAllowedIds.push(sv.vendorId);
    if (sv.id) allAllowedIds.push(String(sv.id));
    if (sv.email) emails.push(sv.email);
  });

  return { allowedIds: [...new Set(allAllowedIds)], emails: [...new Set(emails)] };
};

const applyTenantFilter = async (user, tableName, conditions = {}) => {
  const filter = await getTenantFilter(user, tableName);
  if (!filter) return conditions; // super_admin

  const { allowedIds, emails } = filter;
  if (typeof tableName === 'string' && tableName.toLowerCase() === 'vendors' && user.role !== 'super_admin') {
    const isOidList = allowedIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    conditions.$or = [
      ...(isOidList.length > 0 ? [{ _id: { $in: isOidList } }] : []),
      { vendorId: { $in: allowedIds } },
      { parentVendorId: { $in: allowedIds } }
    ];
  } else if (typeof tableName === 'string' && tableName.toLowerCase() === 'users') {
    const vendorCond = {
      $or: [
        { vendorId: { $in: allowedIds } },
        { parentVendorId: { $in: allowedIds } },
        ...(emails.length > 0 ? [{ vendorEmail: { $in: emails } }] : [])
      ]
    };
    if (Object.keys(conditions).length > 0) {
      if (!conditions.$and) conditions.$and = [];
      conditions.$and.push(vendorCond);
    } else {
      conditions.$or = vendorCond.$or;
    }
  } else {
    conditions.vendorId = { $in: allowedIds };
  }
  return conditions;
};

const applyTenantInsert = (user, tableName, doc = {}) => {
  if (user && user.role !== 'super_admin') {
    if (typeof tableName === 'string' && tableName.toLowerCase() === 'vendors') {
      doc.parentVendorId = user.vendorId || user.id;
    } else if (user.vendorId) {
      doc.vendorId = user.vendorId;
    }
  }
  return doc;
};

module.exports = {
  getTenantFilter,
  applyTenantFilter,
  applyTenantInsert
};
