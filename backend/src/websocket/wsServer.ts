// backend/src/websocket/wsServer.ts
import http from "http";
import WebSocket from "ws";
import type { WsMessage } from "../types";
import { writeAuditLog } from "../utils/auditLogger";

// 全局保存所有已连接客户端
const connectedClients = new Set<WebSocket>();

/**
 * 向所有前端客户端广播消息
 */
export function broadcastWsMessage(msg: WsMessage): void {
  const payload = JSON.stringify(msg);
  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

/**
 * 挂载WebSocket到HTTP服务实例
 */
export function createWsServer(server: http.Server): void {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    connectedClients.add(ws);
    writeAuditLog("前端客户端建立WebSocket长连接", "websocket");

    ws.on("close", () => {
      connectedClients.delete(ws);
      writeAuditLog("前端WebSocket客户端断开连接", "websocket");
    });

    ws.on("error", (err) => {
      writeAuditLog(`WebSocket连接异常: ${err.message}`, "websocket_error");
    });
  });

  wss.on("error", (err) => {
    writeAuditLog(`WebSocket服务全局异常: ${err.message}`, "websocket_error");
  });
}

/**
 * 快捷推送日志文本（封装固定结构）
 */
export function pushLog(content: string): void {
  const msg: WsMessage = {
    type: "log",
    content,
    timestamp: new Date().toLocaleString("zh-CN")
  };
  broadcastWsMessage(msg);
}
