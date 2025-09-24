const mongoose = require("mongoose");

const subscribeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Subscriber name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Subscriber email is required"],
            lowercase: true,
            unique: true, // كل ايميل مرة وحدة
        },
        message: {
            type: String,
            default: "",
        },
    },
    { timestamps: true },
);

module.exports = mongoose.model("Subscribe", subscribeSchema);
