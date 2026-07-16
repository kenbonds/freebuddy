import axios from "axios";
import crypto from "crypto";
import { writeNetLog } from "./auditNetLog";

// 公共Tracker服务地址，支持后续替换自建私有Tracker
const TRACKER_URL = "https://freebuddy-tracker.example.com/node/register";

// 单次启动生成固定匿名节点ID，重启即重置
export const NODE_ID = crypto.randomUUID();

export interface NodeRegisterBody {
  nodeId: string;
  publicIp: string;
  p2pPort: number;
}

let lastRegisterTime = 0;

export async function registerToTracker(p2pPort: number): Promise<boolean> {
  const now = Date.now();
  // 最小间隔30s防频繁注册
  if (now - lastRegisterTime < 30000) return true;
  try {
    const payload: NodeRegisterBody = {
      nodeId: NODE_ID,
      publicIp: "auto",
      p2pPort
    };
    await axios.post(TRACKER_URL, payload, { timeout: 10000 });
    lastRegisterTime = now;
    writeNetLog("tracker", `节点${NODE_ID}成功上报Tracker，P2P端口${p2pPort}`);
    return true;
  } catch (e) {
    writeNetLog("tracker_error", `Tracker注册失败:${String(e)}`);
    return false;
  }
}

// 获取在线节点列表用于P2P寻址
export async function fetchPeerList(): Promise<string[]> {
  try {
    const res = await axios.get(`${TRACKER_URL}/peers`, { timeout: 8000 });
    return Array.isArray(res.data.peers) ? res.data.peers : [];
  } catch (e) {
    writeNetLog("tracker_error", `拉取节点列表失败:${String(e)}`);
    return [];
  }
}
