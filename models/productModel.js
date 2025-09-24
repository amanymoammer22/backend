const mongoose = require("mongoose");
const slugify = require("slugify");
const productSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            minlength: [3, "Too short product title"],
            maxlength: [100, "Too long product title"],
        },
        slug: {
            type: String,
            lowercase: true,
        },
        description: {
            type: String,
            required: [true, "Product description is required"],
            minlength: [20, "Too short product description"],
        },
        quantity: {
            type: Number,
            required: [true, "Product quantity is required"],
        },

        price: {
            type: Number,
            required: [true, "Product price is required"],
            trim: true,
            max: [2000, "Too long product price"],
        },
        priceAfterDiscount: {
            type: Number,
        },
        imageCover: {
            type: String,
            required: [true, "Product Image cover is required"],
        },

        category: {
            type: mongoose.Schema.ObjectId,
            ref: "Category",
            required: [true, "Product must be belong to category"],
        },
    
    },
    { timestamps: true },
);

// Mongoose query middleware
productSchema.pre(/^find/, function (next) {
    this.populate({
        path: "category",
        select: "name -_id",
    });
    next();
});

module.exports = mongoose.model("Product", productSchema);
