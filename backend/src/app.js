import './config/env.js';
import express from "express";
import routes from "./routes/index.js";
import cors from "cors";
import httpStatus from "http-status";
import cookieParser from "cookie-parser";

const app = express();

const corsOptions = {
    origin: process.env.CORS_ORIGIN_ALLOWED,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cookieParser());
app.use(cors(corsOptions));
app.use(express.json());
app.use('/', routes);

app.use((err, req, res, next) => {
    res.status(err.status || httpStatus.INTERNAL_SERVER_ERROR).json({
        status: err.status || httpStatus.INTERNAL_SERVER_ERROR,
        error: err.message || "Algo deu errado em sua solicitação.",
    });
});

export default app;
