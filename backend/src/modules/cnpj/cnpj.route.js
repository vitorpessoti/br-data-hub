import express from "express";
import httpStatus from "http-status";
import CnpjService from "./cnpj.service.js";
import CnpjValidator from "./cnpj.validator.js";
import validate from "../../middlewares/validate.middleware.js";

const router = express.Router();

// 202 when the request limit was reached and the enrichment was queued, 201 when created, 200 when refreshed.
const enrichStatus = ({ created, queued }) => {
    if (queued) return httpStatus.ACCEPTED;
    return created ? httpStatus.CREATED : httpStatus.OK;
};

// Fetches the CNPJ sent in the body on BrasilAPI and stores it (or queues it over the rate limit).
router.post(
    "/",
    ...CnpjValidator.cnpjBodyValidation(),
    validate,
    async (req, res, next) => {
        try {
            const { created, queued, ...result } = await new CnpjService().enrich(req.body.cnpj);
            res.status(enrichStatus({ created, queued })).json(result);
        } catch (error) {
            next(error);
        }
    }
);

// Lists every stored CNPJ, newest first.
router.get("/", async (req, res, next) => {
    try {
        const result = await new CnpjService().list();
        res.status(httpStatus.OK).json(result);
    } catch (error) {
        next(error);
    }
});

router.get(
    "/:cnpj",
    ...CnpjValidator.cnpjParamValidation(),
    validate,
    async (req, res, next) => {
        try {
            const result = await new CnpjService().findByCnpj(req.params.cnpj);
            res.status(httpStatus.OK).json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.patch(
    "/:cnpj",
    ...CnpjValidator.updateValidation(),
    validate,
    async (req, res, next) => {
        try {
            const result = await new CnpjService().update(req.params.cnpj, req.body);
            res.status(httpStatus.OK).json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.delete(
    "/:cnpj",
    ...CnpjValidator.cnpjParamValidation(),
    validate,
    async (req, res, next) => {
        try {
            const result = await new CnpjService().delete(req.params.cnpj);
            res.status(httpStatus.OK).json(result);
        } catch (error) {
            next(error);
        }
    }
);

export default router;
