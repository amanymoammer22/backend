const express = require("express");
const { getUserValidator, createUserValidator, updateUserValidator, deleteUserValidator, changeUserPasswordValidator, updateLoggedUserValidator } = require("../utils/validators/userValidator");

const {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    changeUserPassword,
    getLoggedUserData,
    updateLoggedUserPassword,
    updateLoggedUserData,
    deleteLoggedUserData,
} = require("../services/userService");

// console.log("typeof getLoggedUserData:", typeof getLoggedUserData);
// console.log("typeof getUser:", typeof getUser);

const authService = require("../services/authService");

const router = express.Router();
router.use(authService.protect);
router.put("/changeMyPassword", updateLoggedUserPassword);
router.put("/updateMe", updateLoggedUserValidator, updateLoggedUserData);
router.get("/getMe", getLoggedUserData, getUser);
router.delete("/deleteMe", deleteLoggedUserData);

// Admin
router.use(authService.allowedTo("admin", "manager"));
router.put("/changePassword/:id", changeUserPasswordValidator, changeUserPassword);
router.route("/").get(getUsers).post( createUserValidator, createUser);
router.route("/:id").get(getUserValidator, getUser).put(updateUserValidator, updateUser).delete(deleteUserValidator, deleteUser);
module.exports = router;
