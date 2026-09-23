import express from "express";
import httpStatus from "http-status";
import CepService from "./cep.service.js";
import CepValidator from "./cep.validator.js";
import validate from "../../middlewares/validate.middleware.js";

const router = express.Router();

// 202 when the request limit was reached and the enrichment was queued, 201 when created, 200 when refreshed.
const enrichStatus = ({ created, queued }) => {
    if (queued) return httpStatus.ACCEPTED;
    return created ? httpStatus.CREATED : httpStatus.OK;
};

// Fetches the CEP sent in the body on ViaCEP and stores it (or queues it over the rate limit).
router.post(
    "/",
    ...CepValidator.cepBodyValidation(),
    validate,
    async (req, res, next) => {
        try {
            const { created, queued, ...result } = await new CepService().enrich(req.body.cep);
            res.status(enrichStatus({ created, queued })).json(result);
        } catch (error) {
            next(error);
        }
    }
);

// Lists every stored CEP, newest first.
router.get("/", async (req, res, next) => {
    try {
        const result = await new CepService().list();
        res.status(httpStatus.OK).json(result);
    } catch (error) {
        next(error);
    }
});

router.get(
    "/:cep",
    ...CepValidator.cepParamValidation(),
    validate,
    async (req, res, next) => {
        try {
            const result = await new CepService().findByCep(req.params.cep);
            res.status(httpStatus.OK).json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.patch(
    "/:cep",
    ...CepValidator.updateValidation(),
    validate,
    async (req, res, next) => {
        try {
            const result = await new CepService().update(req.params.cep, req.body);
            res.status(httpStatus.OK).json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.delete(
    "/:cep",
    ...CepValidator.cepParamValidation(),
    validate,
    async (req, res, next) => {
        try {
            const result = await new CepService().delete(req.params.cep);
            res.status(httpStatus.OK).json(result);
        } catch (error) {
            next(error);
        }
    }
);

export default router;
