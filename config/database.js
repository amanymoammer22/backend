const mongoose = require("mongoose");

const dbConnection = () => {
    mongoose
        .connect(process.env.DB_URI)
        .then((conn) => {
            console.log(`Database Connected: ${conn.connection.host}`);
        })
        .catch((err) => {
            console.error(`Database Error: ${err}`);
            process.exit(1);
        });
    console.log("👉 Connected DB_URI:", process.env.DB_URI);

};

module.exports = dbConnection;
