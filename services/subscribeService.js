const asyncHandler = require("express-async-handler");
const Subscribe = require("../models/subscriberModel");

// إضافة مشترك جديد
exports.createSubscription = asyncHandler(async (req, res) => {
    const { name, email, message } = req.body;

    const existing = await Subscribe.findOne({ email });
    if (existing) {
        return res.status(400).json({ message: "You are already subscribed!" });
    }

    const newSub = await Subscribe.create({ name, email, message });
    res.status(201).json({ status: "success", data: newSub });
});

// الحصول على كل المشتركين (ممكن تحتاجها للإدمن)
exports.getSubscribers = asyncHandler(async (req, res) => {
    const subs = await Subscribe.find();
    res.status(200).json({ status: "success", results: subs.length, data: subs });
});
