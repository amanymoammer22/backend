const slugify = require("slugify");
const bcrypt = require("bcryptjs");
const { check, body } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const User = require("../../models/userModel");

// Admin: Create user
exports.createUserValidator = [
    body("firstName").notEmpty().withMessage("First name required").isLength({ min: 2 }).withMessage("Too short first name").trim(),
    body("secondName").notEmpty().withMessage("Second name required").isLength({ min: 1 }).withMessage("Too short second name").trim(),
    body("email")
        .notEmpty()
        .withMessage("Email required")
        .isEmail()
        .withMessage("Invalid email address")
        .customSanitizer((v) =>
            String(v || "")
                .toLowerCase()
                .trim(),
        )
        .custom((val) =>
            User.findOne({ email: val }).then((user) => {
                if (user) return Promise.reject(new Error("E-mail already in use"));
            }),
        ),
    body("password")
        .notEmpty()
        .withMessage("Password required")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters")
        .custom((password, { req }) => {
            if (password !== req.body.passwordConfirm) {
                throw new Error("Password Confirmation incorrect");
            }
            return true;
        }),
    body("passwordConfirm").notEmpty().withMessage("Password confirmation required"),
    body("phone").optional().isMobilePhone(["ar-EG", "ar-SA"]).withMessage("Invalid phone number (only EG/SA)"),
    body("profileImg").optional(),
    body("role").optional().isIn(["user", "manager", "admin"]),
    // اختياري: توليد slug من firstName-secondName
    body("firstName").custom((val, { req }) => {
        const fn = (req.body.firstName || "").trim();
        const sn = (req.body.secondName || "").trim();
        if (fn) req.body.slug = slugify(sn ? `${fn}-${sn}` : fn);
        return true;
    }),
    validatorMiddleware,
];

// Admin: Update user
exports.updateUserValidator = [
    check("id").isMongoId().withMessage("Invalid User id format"),

    body("firstName").optional({ nullable: true, checkFalsy: true }).isLength({ min: 2 }).withMessage("Too short first name").trim(),
    body("secondName").optional({ nullable: true, checkFalsy: true }).isLength({ min: 1 }).withMessage("Too short second name").trim(),

    body("email")
        .optional({ nullable: true, checkFalsy: true })
        .isEmail()
        .withMessage("Invalid email address")
        .customSanitizer((v) =>
            String(v || "")
                .toLowerCase()
                .trim(),
        )
        .custom(async (val, { req }) => {
            if (!val) return true;
            const existing = await User.findOne({ email: val });
            if (existing && String(existing._id) !== String(req.params.id)) {
                throw new Error("E-mail already in use");
            }
            return true;
        }),

    body("phone").optional().isMobilePhone(["ar-EG", "ar-SA"]).withMessage("Invalid phone number (only EG/SA)"),

    body("profileImg").optional(),
    body("role").optional().isIn(["user", "manager", "admin"]),

    // اختياري: إعادة توليد slug إذا تغيّر الاسم
    body().custom((_, { req }) => {
        const fn = (req.body.firstName || "").trim();
        const sn = (req.body.secondName || "").trim();
        if (fn) req.body.slug = slugify(sn ? `${fn}-${sn}` : fn);
        return true;
    }),

    validatorMiddleware,
];

// Logged user: Update own profile
exports.updateLoggedUserValidator = [
    body("firstName").optional({ nullable: true, checkFalsy: true }).isLength({ min: 2 }).withMessage("Too short first name").trim(),
    body("secondName").optional({ nullable: true, checkFalsy: true }).isLength({ min: 1 }).withMessage("Too short second name").trim(),
    body("email")
        .optional({ nullable: true, checkFalsy: true })
        .isEmail()
        .withMessage("Invalid email address")
        .customSanitizer((v) =>
            String(v || "")
                .toLowerCase()
                .trim(),
        )
        .custom(async (val, { req }) => {
            if (!val) return true;
            const existing = await User.findOne({ email: val });
            if (existing && String(existing._id) !== String(req.user._id)) {
                throw new Error("E-mail already in use");
            }
            return true;
        }),
    body("phone").optional().isMobilePhone(["ar-EG", "ar-SA"]).withMessage("Invalid phone number (only EG/SA)"),
    // اختياري: slug
    body().custom((_, { req }) => {
        const fn = (req.body.firstName || "").trim();
        const sn = (req.body.secondName || "").trim();
        if (fn) req.body.slug = slugify(sn ? `${fn}-${sn}` : fn);
        return true;
    }),
    validatorMiddleware,
];

// باقي الفاليديترز كما هم
exports.getUserValidator = [check("id").isMongoId().withMessage("Invalid User id format"), validatorMiddleware];

exports.changeUserPasswordValidator = [
    check("id").isMongoId().withMessage("Invalid User id format"),
    body("currentPassword").notEmpty().withMessage("You must enter your current password"),
    body("passwordConfirm").notEmpty().withMessage("You must enter the password confirm"),
    body("password")
        .notEmpty()
        .withMessage("You must enter new password")
        .custom(async (val, { req }) => {
            const user = await User.findById(req.params.id);
            if (!user) throw new Error("There is no user for this id");
            const ok = await bcrypt.compare(req.body.currentPassword, user.password);
            if (!ok) throw new Error("Incorrect current password");
            if (val !== req.body.passwordConfirm) throw new Error("Password Confirmation incorrect");
            return true;
        }),
    validatorMiddleware,
];

exports.deleteUserValidator = [check("id").isMongoId().withMessage("Invalid User id format"), validatorMiddleware];

// const slugify = require("slugify");
// const bcrypt = require("bcryptjs");
// const { check, body } = require("express-validator");
// const validatorMiddleware = require("../../middlewares/validatorMiddleware");
// const User = require("../../models/userModel");

// exports.createUserValidator = [
//     check("name")
//         .notEmpty()
//         .withMessage("User required")
//         .isLength({ min: 3 })
//         .withMessage("Too short User name")
//         .custom((val, { req }) => {
//             req.body.slug = slugify(val);
//             return true;
//         }),

//     check("email")
//         .notEmpty()
//         .withMessage("Email required")
//         .isEmail()
//         .withMessage("Invalid email address")
//         .custom((val) =>
//             User.findOne({ email: val }).then((user) => {
//                 if (user) {
//                     return Promise.reject(new Error("E-mail already in user"));
//                 }
//             }),
//         ),

//     check("password")
//         .notEmpty()
//         .withMessage("Password required")
//         .isLength({ min: 6 })
//         .withMessage("Password must be at least 6 characters")
//         .custom((password, { req }) => {
//             if (password !== req.body.passwordConfirm) {
//                 throw new Error("Password Confirmation incorrect");
//             }
//             return true;
//         }),

//     check("passwordConfirm").notEmpty().withMessage("Password confirmation required"),

//     check("phone").optional().isMobilePhone(["ar-EG", "ar-SA"]).withMessage("Invalid phone number only accepted Egy and SA Phone numbers"),

//     check("profileImg").optional(),
//     check("role").optional(),

//     validatorMiddleware,
// ];

// exports.getUserValidator = [check("id").isMongoId().withMessage("Invalid User id format"), validatorMiddleware];

// exports.updateUserValidator = [
//     check("id").isMongoId().withMessage("Invalid User id format"),
//     body("name")
//         .optional()
//         .custom((val, { req }) => {
//             req.body.slug = slugify(val);
//             return true;
//         }),
//     check("email")
//         .notEmpty()
//         .withMessage("Email required")
//         .isEmail()
//         .withMessage("Invalid email address")
//         .custom((val) =>
//             User.findOne({ email: val }).then((user) => {
//                 if (user) {
//                     return Promise.reject(new Error("E-mail already in user"));
//                 }
//             }),
//         ),
//     check("phone").optional().isMobilePhone(["ar-EG", "ar-PS"]).withMessage("Invalid phone number only accepted Egy and SA Phone numbers"),

//     check("profileImg").optional(),
//     check("role").optional(),
//     validatorMiddleware,
// ];

// exports.changeUserPasswordValidator = [
//     check("id").isMongoId().withMessage("Invalid User id format"),
//     body("currentPassword").notEmpty().withMessage("You must enter your current password"),
//     body("passwordConfirm").notEmpty().withMessage("You must enter the password confirm"),
//     body("password")
//         .notEmpty()
//         .withMessage("You must enter new password")
//         .custom(async (val, { req }) => {
//             // 1) Verify current password
//             const user = await User.findById(req.params.id);
//             if (!user) {
//                 throw new Error("There is no user for this id");
//             }
//             const isCorrectPassword = await bcrypt.compare(req.body.currentPassword, user.password);
//             if (!isCorrectPassword) {
//                 throw new Error("Incorrect current password");
//             }

//             // 2) Verify password confirm
//             if (val !== req.body.passwordConfirm) {
//                 throw new Error("Password Confirmation incorrect");
//             }
//             return true;
//         }),
//     validatorMiddleware,
// ];

// exports.deleteUserValidator = [check("id").isMongoId().withMessage("Invalid User id format"), validatorMiddleware];

// exports.updateLoggedUserValidator = [
//     body("name")
//         .optional()
//         .custom((val, { req }) => {
//             req.body.slug = slugify(val);
//             return true;
//         }),
//     check("email")
//         .notEmpty()
//         .withMessage("Email required")
//         .isEmail()
//         .withMessage("Invalid email address")
//         .custom((val) =>
//             User.findOne({ email: val }).then((user) => {
//                 if (user) {
//                     return Promise.reject(new Error("E-mail already in user"));
//                 }
//             }),
//         ),
//     check("phone").optional().isMobilePhone(["ar-EG", "ar-SA"]).withMessage("Invalid phone number only accepted Egy and SA Phone numbers"),

//     validatorMiddleware,
// ];
