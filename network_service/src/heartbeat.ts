import { registerToTracker } from "./trackerClient";
import { writeNetLog } from "./auditNetLog";

const HEARTBEAT_HOURS = [0, 4, 8, 12, 16, 20];
const RETRY_COUNT = 3;
const RETRY_DELAY = 60000;

let heartbeatTimer: NodeJS.Timeout | null = null;

async function singleHeartbeat(p2pPort: number, retry: number = 0): Promise<void> {
  const ok = await registerToTracker(p2pPort);
  if (ok) {
    writeNetLog("heartbeat", "本轮心跳上报成功");
    return;
  }
  if (retry < RETRY_COUNT) {
    writeNetLog("heartbeat", `心跳失败，${RETRY_DELAY / 1000}s后第${retry + 1}次重试`);
    setTimeout(() => singleHeartbeat(p2pPort, retry + 1), RETRY_DELAY);
  } else {
    writeNetLog("heartbeat_error", "心跳全部重试失败，等待下一整点周期");
  }
}

function checkAndTriggerHeartbeat(p2pPort: number): void {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  // 整点0分0秒触发
  if (HEARTBEAT_HOURS.includes(hour) && minute === 0 && second === 0) {
    singleHeartbeat(p2pPort);
  }
}

export function startHeartbeatLoop(p2pPort: number): void {
  heartbeatTimer = setInterval(() => {
    checkAndTriggerHeartbeat(p2pPort);
  }, 1000);
  writeNetLog("heartbeat", "心跳定时检测循环已启动，对齐北京时间整点");
  // 启动立刻执行一次注册入网
  singleHeartbeat(p2pPort);
}

export function stopHeartbeatLoop(): void {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
}
