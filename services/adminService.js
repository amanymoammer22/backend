// services/adminService.js
const Product = require("../models/productModel");
const Order = require("../models/orderModel"); 
const ApiFeatures = require("../utils/apiFeatures"); // لو عندك كلاس ApiFeatures بمكان آخر، تجاهل هذا الاستيراد
const asyncHandler = require("express-async-handler");
// const Product = require("../models/productModel");
const User = require("../models/userModel");
const Cart = require("../models/cartModel");
// GET /api/v1/admin/stats
exports.getAdminStats = async (req, res, next) => {
    try {
        const [productsCount, ordersCount, pendingCount, revenueAgg] = await Promise.all([
            Product.countDocuments(),
            Order.countDocuments(), // لو ما عندك Orders، رجّع 0
            Order.countDocuments({ status: "pending" }), // كذلك
            Order.aggregate([{ $group: { _id: null, sum: { $sum: "$total" } } }]),
        ]);

        const revenue = revenueAgg[0]?.sum || 0;
        res.json({
            products: productsCount || 0,
            totalOrders: ordersCount || 0,
            pendingOrders: pendingCount || 0,
            revenue,
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/v1/admin/orders
exports.getAdminOrders = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || "1");
        const limit = parseInt(req.query.limit || "10");
        const sort = req.query.sort || "-createdAt";
        const status = req.query.status;
        const search = (req.query.search || "").toLowerCase();

        const filter = {};
        if (status) filter.status = status;

        if (search) {
            filter.$or = [{ "customer.name": { $regex: search, $options: "i" } }, { "customer.email": { $regex: search, $options: "i" } }, { "customer.phone": { $regex: search, $options: "i" } }];
        }

        const totalDocs = await Order.countDocuments(filter);
        const orders = await Order.find(filter)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .select("customer total status createdAt items")
            .lean();

        res.json({
            data: orders,
            paginationResult: {
                currentPage: page,
                limit,
                numberOfPages: Math.max(1, Math.ceil(totalDocs / limit)),
            },
        });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/v1/admin/orders/:id/status
exports.updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const allowed = ["pending", "processing", "shipped", "delivered", "cancelled"];
        if (!allowed.includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        const doc = await Order.findByIdAndUpdate(id, { status }, { new: true });
        if (!doc) return res.status(404).json({ message: "Order not found" });
        res.json({ data: doc });
    } catch (err) {
        next(err);
    }
};

exports.getDashboardStats = asyncHandler(async (req, res) => {
    const totalProducts = await Product.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalOrders = await Cart.countDocuments(); // إذا الكارت بيمثل الأوردر
    const pendingOrders = await Cart.countDocuments({ status: "pending" });

    res.status(200).json({
        totalProducts,
        totalUsers,
        totalOrders,
        pendingOrders,
        totalRevenue: 0, // بتضيف حساب الإيرادات لاحقاً
    });
});






