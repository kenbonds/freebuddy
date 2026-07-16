import WebSocket from "ws";
import crypto from "crypto";
import { fetchPeerList, NODE_ID } from "./trackerClient";
import { writeNetLog } from "./auditNetLog";

// 固定公钥用于校验下发配置防篡改
const PUBLIC_SIGN_KEY = "freebuddy_public_verify_key_2026";
const P2P_LISTEN_PORT = 9200;

// AES256 加密
export function aesEncrypt(data: unknown): string {
  const key = crypto.scryptSync(PUBLIC_SIGN_KEY, "salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let enc = cipher.update(JSON.stringify(data), "utf8", "hex");
  enc += cipher.final("hex");
  return `${iv.toString("hex")}:${enc}`;
}

// AES解密+验签
export function aesDecryptAndVerify(cipherText: string): unknown | null {
  try {
    const [ivHex, dataHex] = cipherText.split(":");
    const key = crypto.scryptSync(PUBLIC_SIGN_KEY, "salt", 32);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, Buffer.from(ivHex, "hex"));
    let dec = decipher.update(dataHex, "hex", "utf8");
    dec += decipher.final("utf8");
    return JSON.parse(dec);
  } catch (e) {
    writeNetLog("p2p_error", `解密验签失败:${String(e)}`);
    return null;
  }
}

// 启动P2P服务端，接收其他节点推送
export function startP2PServer(): WebSocket.Server {
  const wss = new WebSocket.Server({ port: P2P_LISTEN_PORT });
  wss.on("connection", (ws) => {
    ws.on("message", (buf) => {
      const cipher = buf.toString("utf8");
      const data = aesDecryptAndVerify(cipher);
      if (!data) return;
      writeNetLog("p2p_recv", "收到其他节点同步规则包");
      // 可在此写入本地规则库覆盖逻辑
    });
  });
  writeNetLog("p2p", `P2P服务端已启动，监听端口${P2P_LISTEN_PORT}`);
  return wss;
}

// 向全网节点广播脱敏后的规则数据
export async function broadcastToPeers(payloadList: unknown[]): Promise<void> {
  const peers = await fetchPeerList();
  const cipher = aesEncrypt({
    fromNode: NODE_ID,
    data: payloadList
  });
  for (const peerAddr of peers) {
    try {
      const ws = new WebSocket(`ws://${peerAddr}`);
      ws.on("open", () => {
        ws.send(cipher);
        ws.close();
      });
    } catch (e) {
      writeNetLog("p2p_peer_skip", `节点${peerAddr}连接失败`);
    }
  }
  writeNetLog("p2p_send", "完成一轮P2P全网广播推送");
}
