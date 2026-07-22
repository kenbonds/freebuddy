import { Router } from "express";
import projectRouter from "./projectRouter";
import ticketRouter from "./ticketRouter";
import agentRouter from "./agentRouter";
import modelRouter from "./modelRouter";
import archiveRouter from "./archiveRouter";
import auditRouter from "./auditRouter";
import qaRouter from "./qaRouter";
import qaPipelineRouter from "./qaPipelineRouter";
import roleRouter from "./roleRouter";
import goalRouter from "./goalRouter";
import knowledgeRouter from "./knowledgeRouter";
import chatRouter from "./chatRouter";
import executionRouter from "./executionRouter";

const globalRouter = Router();

globalRouter.use("/project", projectRouter);
globalRouter.use("/ticket", ticketRouter);
globalRouter.use("/agent", agentRouter);
globalRouter.use("/model", modelRouter);
globalRouter.use("/archive", archiveRouter);
globalRouter.use("/audit", auditRouter);
globalRouter.use("/qa", qaRouter);
globalRouter.use("/qaPipeline", qaPipelineRouter);
globalRouter.use("/role", roleRouter);
globalRouter.use("/goal", goalRouter);
globalRouter.use("/knowledge", knowledgeRouter);
globalRouter.use("/chat", chatRouter);
globalRouter.use("/execution", executionRouter);

export default globalRouter;
