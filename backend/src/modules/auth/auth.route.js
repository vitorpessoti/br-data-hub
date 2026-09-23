import express from "express";
import httpStatus from "http-status";
import AuthService from "./auth.service.js";
import AuthValidator from "./auth.validator.js";
import validate from "../../middlewares/validate.middleware.js";

const router = express.Router();

router.post(
    "/register",
    ...AuthValidator.registerValidation(),
    validate,
    async (req, res, next) => {
        try {
            const result = await new AuthService().register(req.body);
            res.status(httpStatus.CREATED).json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.post(
    "/login",
    ...AuthValidator.loginValidation(),
    validate,
    async (req, res, next) => {
        try {
            const result = await new AuthService().login(req.body);
            res.status(httpStatus.OK).json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.post(
    "/forgot-password",
    ...AuthValidator.forgotPasswordValidation(),
    validate,
    async (req, res, next) => {
        try {
            const result = await new AuthService().forgotPassword(req.body);
            res.status(httpStatus.OK).json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.post(
    "/reset-password",
    ...AuthValidator.resetPasswordValidation(),
    validate,
    async (req, res, next) => {
        try {
            const result = await new AuthService().resetPassword(req.body);
            res.status(httpStatus.OK).json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.patch(
    // Authenticated by requireAuthentication (src/routes/index.js), which sets req.user.
    "/users/:id",
    ...AuthValidator.updateValidation(),
    validate,
    async (req, res, next) => {
        try {
            const result = await new AuthService().update(req.params.id, req.body, req.user);
            res.status(httpStatus.OK).json(result);
        } catch (error) {
            next(error);
        }
    }
);

export default router;
