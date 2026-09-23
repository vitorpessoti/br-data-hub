import express from "express";
import httpStatus from "http-status";
import StatusService from '../services/status.service.js';

const router = express.Router();

router.route('/')
    .get(async (req, res, next) => {
        try {
            res.status(httpStatus.OK).json(await new StatusService().execute());
        } catch (error) {
            next(error);
        }
    });

export default router;
