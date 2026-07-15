import cors from "cors";
import express, { Express, Request } from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { openapiDocument } from "./docs/openapi";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { apiRouter } from "./routes";
import { isProduction } from "./config/env";

export function createApp(): Express {
  const app = express();

  // Trust the first hop (reverse proxy/load balancer) so req.ip reflects the real client address.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors());
  app.use(
    express.json({
      // Paystack webhook signatures are HMAC'd over the exact raw request bytes,
      // so we stash the buffer here rather than re-serializing the parsed body.
      verify: (req, _res, buf) => {
        (req as Request).rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(isProduction ? "combined" : "dev"));

  app.get("/api/docs.json", (_req, res) => res.json(openapiDocument));
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
