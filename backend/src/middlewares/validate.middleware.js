import { validationResult } from "express-validator";
import httpStatus from "http-status";

const validate = (req, res, next) => {
    const err = validationResult(req);
    if (!err.isEmpty()) {
        const errors = err.errors.map(error => error.msg);
        return res.status(httpStatus.BAD_REQUEST).json({ errors });
    }
    next();
};

export default validate;
