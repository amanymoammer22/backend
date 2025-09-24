const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const ApiFeatures = require("../utils/apiFeatures");

exports.deleteOne = (Model) =>
    asyncHandler(async (req, res, next) => {
        const { id } = req.params;
        const document = await Model.findByIdAndDelete(id);

        if (!document) {
            return next(new ApiError(`No document for this id ${id}`, 404));
        }
        res.status(204).send();
    });

exports.updateOne = (Model) =>
    asyncHandler(async (req, res, next) => {
        const document = await Model.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });

        if (!document) {
            return next(new ApiError(`No document for this id ${req.params.id}`, 404));
        }
        res.status(200).json({ data: document });
    });

exports.createOne = (Model) =>
    asyncHandler(async (req, res) => {
         console.log("📩 DATA RECEIVED FROM FRONTEND:");
         console.log("BODY:", req.body);
         console.log("FILES:", req.files);
        const newDoc = await Model.create(req.body);
        res.status(201).json({ data: newDoc });
    });

exports.getOne = (Model) =>
    asyncHandler(async (req, res, next) => {
        const { id } = req.params;
        const document = await Model.findById(id);
        if (!document) {
            return next(new ApiError(`No document for this id ${id}`, 404));
        }
        res.status(200).json({ data: document });
    });

exports.getAll = (Model, modelName = "") =>
    asyncHandler(async (req, res) => {
          console.log("🟢 Raw req.query at entry:", req.query); 
        let filter = {};
        if (req.filterObj) {
            filter = req.filterObj;
        }
        // Build query
        const forCount = new ApiFeatures(Model.find(filter), req.query).filter().search(modelName);
        const countConditions = forCount.mongooseQuery.getQuery();
        const documentsCounts = await Model.countDocuments(countConditions);
        const apiFeatures = new ApiFeatures(Model.find(filter), req.query).filter().search(modelName).sort().paginate(documentsCounts).limitFields();

        // Execute query
        const { mongooseQuery, paginationResult } = apiFeatures;
        const documents = await mongooseQuery;
        

        res.status(200).json({ results: documents.length, paginationResult, data: documents });
    });
