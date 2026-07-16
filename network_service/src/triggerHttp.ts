import http from "http";
import { batchSanitizeRuleFiles } from "./sanitizeUpload";
import { broadcastToPeers } from "./p2pSync";
import { writeNetLog } from "./auditNetLog";

const TRIGGER_LISTEN_PORT = 9101;

export function startTriggerHttpServer(): void {
  const server = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.method !== "POST" || req.url !== "/triggerArchiveUpload") {
      res.writeHead(404);
      res.end(JSON.stringify({ code: 1, msg: "接口不存在" }));
      return;
    }
    let bodyBuf = "";
    req.on("data", chunk => bodyBuf += chunk);
    req.on("end", async () => {
      try {
        const triggerData = JSON.parse(bodyBuf) as { projectId: number; archiveTime: string };
        writeNetLog("trigger", `收到后端归档上传触发，项目ID:${triggerData.projectId}`);
        const sanitizedList = await batchSanitizeRuleFiles();
        await broadcastToPeers(sanitizedList);
        res.end(JSON.stringify({ code: 0, msg: "脱敏上传P2P广播执行完毕" }));
      } catch (err) {
        writeNetLog("trigger_error", `触发上传处理异常:${String(err)}`);
        res.writeHead(500);
        res.end(JSON.stringify({ code: 1, msg: String(err) }));
      }
    });
  });

  server.listen(TRIGGER_LISTEN_PORT, "127.0.0.1", () => {
    writeNetLog("trigger", `归档上传触发器HTTP服务监听127.0.0.1:${TRIGGER_LISTEN_PORT}`);
  });
}
