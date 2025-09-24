const multer = require("multer");
const ApiError = require("../utils/apiError");
const path = require("path");

const multerStorage = multer.memoryStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/Product"); //
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname); //
        const filename = `product-${Date.now()}${ext}`; //
        cb(null, filename);
    },
});

const multerFilter = function (req, file, cb) {
    if (file.mimetype.startsWith("image")) {
        cb(null, true);
    } else {
        cb(new ApiError("Only Images allowed", 400), false);
    }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadSingleImage = (fieldName) => upload.single(fieldName);

exports.uploadMixOfImages = (arrayOfFields) => upload.fields(arrayOfFields);
