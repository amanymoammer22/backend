// routes/adminRoute.js
const express = require("express");
const router = express.Router();
const { getAdminStats, getAdminOrders, updateOrderStatus,getDashboardStats} = require("../services/adminService");
const authService = require("../services/authService"); // لو عندك حماية

// اختياري: حماية الأدمن
router.use(authService.protect, authService.allowedTo("admin"));

router.get("/stats", getAdminStats);
router.get("/orders", getAdminOrders);
router.patch("/orders/:id/status", updateOrderStatus);
router.get("/dashboard", getDashboardStats);

module.exports = router;


module.exports = router;
