import { startHeartbeatLoop } from "./heartbeat";
import { startP2PServer } from "./p2pSync";
import { startTriggerHttpServer } from "./triggerHttp";
import { fetchOfficialBaseRule } from "./cdnFetch";
import { writeNetLog } from "./auditNetLog";

const P2P_PORT = 9200;

function main() {
  writeNetLog("system", "FreeBuddy网络协同子进程启动");

  // 1. 启动心跳上报循环
  startHeartbeatLoop(P2P_PORT);

  // 2. 启动P2P接收服务
  startP2PServer();

  // 3. 启动后端归档触发HTTP接口
  startTriggerHttpServer();

  // 4. 每日0点执行CDN基线拉取
  setInterval(() => {
    const h = new Date().getHours();
    const m = new Date().getMinutes();
    if (h === 0 && m === 0) {
      fetchOfficialBaseRule();
    }
  }, 60000);

  // 进程异常守护，崩溃自动重启提示（由父脚本start.bat管控）
  process.on("uncaughtException", (e) => {
    writeNetLog("fatal", `网络子进程未捕获异常:${e.message}`);
    process.exit(1);
  });
}

main();
