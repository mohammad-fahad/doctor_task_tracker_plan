import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { verifyOrigin } from "./middleware/auth.js";
import { initializeValidated } from "./middleware/validate.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(verifyOrigin);
  app.use(initializeValidated);

  app.use("/api/v1", routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
