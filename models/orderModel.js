// models/orderModel.js
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        customer: {
            name: String,
            email: String,
            phone: String,
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        },
        items: [
            {
                product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
                qty: { type: Number, default: 1, min: 1 },
                price: { type: Number, required: true },
            },
        ],
        total: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
            default: "pending",
        },
    },
    { timestamps: true }, // createdAt / updatedAt
);

orderSchema.pre("save", function (next) {
    if (!this.total) {
        this.total = this.items.reduce((s, it) => s + (it.price || 0) * (it.qty || 1), 0);
    }
    next();
});

module.exports = mongoose.model("Order", orderSchema);
