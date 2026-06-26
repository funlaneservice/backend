import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes";
import { adminRouter } from "../modules/admin/admin.routes";
import { agentRouter, agentAdminRouter } from "../modules/agent/agent.routes";
import { usersRouter } from "../modules/users/users.routes";
import { requestsRouter } from "../modules/requests/requests.routes";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({ statusCode: 200, status: "ok" });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/agent", agentRouter);
apiRouter.use("/admin/agents", agentAdminRouter);
apiRouter.use("/admin/users", usersRouter);
apiRouter.use("/requests", requestsRouter);
