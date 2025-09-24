class ApiFeatures {
    constructor(mongooseQuery, queryString) {
        this.mongooseQuery = mongooseQuery;
        this.queryString = queryString;
    }

    filter() {
        const queryStringObj = { ...this.queryString };
        const excludesFields = ["page", "sort", "limit", "fields", "keyword"];
        excludesFields.forEach((field) => delete queryStringObj[field]);

        let mongoQuery = {};
        const mongoose = require("mongoose");

        for (let key in queryStringObj) {
            if (key.includes("[")) {
                // مثال: price[gte] => { price: { $gte: value } }
                const [field, operator] = key.split("[");
                const cleanOperator = operator.replace("]", "");
                if (!mongoQuery[field]) mongoQuery[field] = {};
                mongoQuery[field][`$${cleanOperator}`] = queryStringObj[key];
            } else {
                let value = queryStringObj[key];

                // 🟢 تحسين: أي مفتاح بينتهي بـ "id" أو اسمه "category" نحوله لـ ObjectId
                if (key.toLowerCase().endsWith("id") || key === "category") {
                    try {
                        value = new mongoose.Types.ObjectId(value);
                    } catch (err) {
                        console.warn(`⚠️ ${key} value is not a valid ObjectId:`, value);
                    }
                }

                mongoQuery[key] = value;
            }
        }

        console.log("✅ Final Filter:", mongoQuery);
        this.mongooseQuery = this.mongooseQuery.find(mongoQuery);
        return this;
    }

    sort() {
        if (this.queryString.sort) {
            const sortBy = this.queryString.sort.split(",").join(" ");
            this.mongooseQuery = this.mongooseQuery.sort(sortBy);
        } else {
            this.mongooseQuery = this.mongooseQuery.sort("-createdAt -_id");
        }
        return this;
    }

    limitFields() {
        if (this.queryString.fields) {
            const fields = this.queryString.fields.split(",").join(" ");
            this.mongooseQuery = this.mongooseQuery.select(fields);
        } else {
            this.mongooseQuery = this.mongooseQuery.select("-__v");
        }
        return this;
    }

    search(modelName) {
        if (this.queryString.keyword) {
            let query = {};
            if (modelName === "Products") {
                query.$or = [{ title: { $regex: this.queryString.keyword, $options: "i" } }, { description: { $regex: this.queryString.keyword, $options: "i" } }];
            } else {
                query = { name: { $regex: this.queryString.keyword, $options: "i" } };
            }

            this.mongooseQuery = this.mongooseQuery.find(query);
        }
        return this;
    }

    paginate(countDocuments) {
        const page = this.queryString.page * 1 || 1;
        const limit = this.queryString.limit * 1 || 50;
        const skip = (page - 1) * limit;
        const endIndex = page * limit;

        // Pagination result
        const pagination = {};
        pagination.currentPage = page;
        pagination.limit = limit;
        pagination.numberOfPages = Math.max(1, Math.ceil(countDocuments / limit));

        // next page
        if (endIndex < countDocuments) {
            pagination.next = page + 1;
        }
        if (skip > 0) {
            pagination.prev = page - 1;
        }
        this.mongooseQuery = this.mongooseQuery.skip(skip).limit(limit);

        this.paginationResult = pagination;
        return this;
    }
}

module.exports = ApiFeatures;

