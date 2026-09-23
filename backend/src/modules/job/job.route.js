import express from "express";
import httpStatus from "http-status";
import JobService from "./job.service.js";
import JobValidator from "./job.validator.js";
import validate from "../../middlewares/validate.middleware.js";

const router = express.Router();

// Looks up, by the jobId returned with a 202, the queued CEP/CNPJ enrichment stored in the database.
router.get(
    "/:jobId",
    ...JobValidator.jobIdParamValidation(),
    validate,
    async (req, res, next) => {
        try {
            const result = await new JobService().findByJobId(req.params.jobId);
            res.status(httpStatus.OK).json(result);
        } catch (error) {
            next(error);
        }
    }
);

export default router;
