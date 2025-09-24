const path = require("path");
const cors = require("cors");
const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");


dotenv.config({ path: "config.env" });

const ApiError = require("./utils/apiError");
const globalError = require("./middlewares/errorMiddleware");
const dbConnection = require("./config/database");

// Routes
const categoryRoute = require("./routes/categoryRoute");
const userRoute = require("./routes/userRoute");
const authRoute = require("./routes/authRoute");
const productRoute = require("./routes/productRoute");
const cartRouter = require("./routes/cartRoute");
const wishlistRoute = require("./routes/wishlistRoute");
const adminRoute = require("./routes/adminRoute");
// const contactRoutes = require("./routes/contactRoute");
const subscriberRoute = require("./routes/subscriberRoute");


// 1) Connect DB
dbConnection();

// 2) Create app
const app = express();

// 3) Core middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "uploads")));

if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
    console.log(`mode: ${process.env.NODE_ENV}`);
}

// 4) CORS ( )
app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    }),
);


// (اختياري) لو بدك تضمن الـ credentials بالهيدر
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});


// 5) Mount Routes
app.use("/api/v1/categories", categoryRoute);
app.use("/api/v1/users", userRoute);
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/products", productRoute);
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/wishlist", wishlistRoute);
app.use("/api/v1/admin", adminRoute);
// app.use("/api/v1/contact", contactRoutes);
app.use("/api/v1/subscribe", subscriberRoute);

// 6) 404 handler
app.use((req, res, next) => {
    next(new ApiError(`Can't find this route: ${req.originalUrl}`, 404));
});
// 7) Global error handler
app.use(globalError);
app.use("/Product", express.static("uploads/Product"));

// 8) Start server (مرة واحدة فقط)
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`App running on http://localhost:${PORT}`);
});

// 9) Unhandled rejections
process.on("unhandledRejection", (err) => {
    console.error(`UnhandledRejection: ${err.name} | ${err.message}`);
    server.close(() => {
        console.error("Shutting down....");
        process.exit(1);
    });
});

