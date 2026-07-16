// 后端标准返回结构
export interface ApiRes<T> {
  code: 0 | 1;
  msg: string;
  data: T | null;
}

// 项目项
export interface ProjectItem {
  id: number;
  projectName: string;
  description: string;
  archived: boolean;
  archivePath: string | null;
  createdAt: string;
}

// 工单项
export interface TicketItem {
  id: number;
  projectId: number;
  title: string;
  content: string;
  status: "待认领" | "处理中" | "待复核" | "测试驳回" | "已办结" | "归档封存";
  assignRole: string | null;
  parentTicketId: number | null;
  finishedAt: string | null;
  createdAt: string;
}

// 模型配置
export interface ModelConfItem {
  id: number;
  alias: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  isLocal: boolean;
}

// WebSocket 消息
export interface WsMsg {
  type: "log" | "status" | "notice";
  content: string;
  timestamp: string;
}
