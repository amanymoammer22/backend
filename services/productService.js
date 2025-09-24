const factory = require("./handlersFactory");
const Product = require("../models/productModel");
const asyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const { uploadMixOfImages } = require("../middlewares/uploadImageMiddleware");
const Subscription = require("../models/subscriberModel");
const sendEmail = require("../utils/sendEmail");

// exports.uploadProductImages = uploadMixOfImages([
//     {
//         name: "imageCover",
//         maxCount: 1,
//     },
//     {
//         name: "images",
//         maxCount: 5,
//     },
// ]);

// const fs = require("fs");
// const path = require("path");

// exports.resizeProductImages = asyncHandler(async (req, res, next) => {
//     const uploadDir = path.join(__dirname, "../uploads/product");
//     if (!fs.existsSync(uploadDir)) {
//         fs.mkdirSync(uploadDir, { recursive: true });
//     }

//     console.log("req.body =>", req.body);
//     console.log("req.files =>", req.files);

//     // 1- Image processing for imageCover
//     if (req.files.imageCover) {
//         const imageCoverFileName = `product-${uuidv4()}-${Date.now()}-cover.jpeg`;

//         await sharp(req.files.imageCover[0].buffer).resize(2000, 1333).toFormat("jpeg").jpeg({ quality: 95 }).toFile(path.join(uploadDir, imageCoverFileName));

//         req.body.imageCover = imageCoverFileName;
//     }

//     // 2- Image processing for other images
//     if (req.files.images) {
//         req.body.images = [];
//         await Promise.all(
//             req.files.images.map(async (img, index) => {
//                 const imageName = `product-${uuidv4()}-${Date.now()}-${index + 1}.jpeg`;

//                 await sharp(img.buffer).resize(2000, 1333).toFormat("jpeg").jpeg({ quality: 95 }).toFile(path.join(uploadDir, imageName));

//                 req.body.images.push(imageName);
//             }),
//         );
//     }

//     next(); // مهم أن يوضع هنا حتى لو ما في images
// });




const multer = require("multer");
const ApiError = require("../utils/apiError");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const asyncHandler = require("express-async-handler");

// تخزين في الميموري
const multerStorage = multer.memoryStorage();

const multerFilter = function (req, file, cb) {
    if (file.mimetype.startsWith("image")) {
        cb(null, true);
    } else {
        cb(new ApiError("Only Images allowed", 400), false);
    }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadProductImages = upload.fields([
    { name: "imageCover", maxCount: 1 },
    { name: "images", maxCount: 5 },
]);

exports.resizeProductImages = asyncHandler(async (req, res, next) => {
    const uploadDir = path.join(__dirname, "../uploads/product");
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    console.log("req.body =>", req.body);
    console.log("req.files =>", req.files);

    // معالجة صورة الكوفر
    if (req.files?.imageCover) {
        const imageCoverFileName = `product-${uuidv4()}-${Date.now()}-cover.jpeg`;
        await sharp(req.files.imageCover[0].buffer).resize(2000, 1333).toFormat("jpeg").jpeg({ quality: 95 }).toFile(path.join(uploadDir, imageCoverFileName));

        req.body.imageCover = `/uploads/product/${imageCoverFileName}`;
    }

    // معالجة باقي الصور
    if (req.files?.images) {
        req.body.images = [];
        await Promise.all(
            req.files.images.map(async (img, index) => {
                const imageName = `product-${uuidv4()}-${Date.now()}-${index + 1}.jpeg`;
                await sharp(img.buffer).resize(2000, 1333).toFormat("jpeg").jpeg({ quality: 95 }).toFile(path.join(uploadDir, imageName));

                req.body.images.push(`/uploads/product/${imageName}`);
            }),
        );
    }

    next();
});




// @desc    Get list of products
// @route   GET /api/v1/products
// @access  Public
exports.getProducts = factory.getAll(Product, "Products");

// @desc    Get specific product by id
// @route   GET /api/v1/products/:id
// @access  Public
exports.getProduct = factory.getOne(Product);

// @desc    Create product
// @route   POST  /api/v1/products
// @access  Private
// exports.createProduct = factory.createOne(Product);



// @desc    Create product
// @route   POST  /api/v1/products
// @access  Private
exports.createProduct = async (req, res, next) => {
    try {
        const product = await Product.create(req.body);
        const subscribers = await Subscription.find();

        if (subscribers.length > 0) {
            await Promise.all(
                subscribers.map((sub) =>
                    sendEmail({
                        email: sub.email,
                        subject: `🆕 New Product: ${product.title}`,
                        message: `Hi ${sub.name || "there"},\n\nWe just added a new product: "${product.title}"!\n\nPrice: $${
                            product.price
                        }\n\nVisit our shop to check it out  here: http://localhost:5173/product/${product._id} \n\nHappy shopping! 🛍️.`,
                    }),
                ),
            );
        }

        res.status(201).json({
            status: "success",
            data: product,
        });
    } catch (err) {
        console.error("❌ Error creating product:", err);
        res.status(500).json({
            status: "error",
            message: "Failed to create product or send notifications.",
        });
    }
};


// @desc    Update specific product
// @route   PUT /api/v1/products/:id
// @access  Private
exports.updateProduct = factory.updateOne(Product);

// @desc    Delete specific product
// @route   DELETE /api/v1/products/:id
// @access  Private
exports.deleteProduct = factory.deleteOne(Product);
