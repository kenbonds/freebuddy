import { Router } from "express";
import projectRouter from "./projectRouter";
import ticketRouter from "./ticketRouter";
import agentRouter from "./agentRouter";
import modelRouter from "./modelRouter";
import archiveRouter from "./archiveRouter";
import auditRouter from "./auditRouter";

const globalRouter = Router();

globalRouter.use("/project", projectRouter);
globalRouter.use("/ticket", ticketRouter);
globalRouter.use("/agent", agentRouter);
globalRouter.use("/model", modelRouter);
globalRouter.use("/archive", archiveRouter);
globalRouter.use("/audit", auditRouter);

export default globalRouter;
