// ========== 工单六态枚举 纯中文状态 ==========
export type TicketStatus =
  | "待认领"
  | "处理中"
  | "待复核"
  | "测试驳回"
  | "已办结"
  | "归档封存";

// ========== 六大智能工作人员角色 ==========
export type AgentRole =
  | "架构规划员"
  | "开发执行员"
  | "测试校验员"
  | "运维部署员"
  | "文档归档员"
  | "工单管控引擎";

// ========== 项目基础结构 ==========
export interface ProjectItem {
  id: number;
  projectName: string;
  description: string;
  createdAt: Date;
  archived: boolean;
  archivePath?: string;
}

// ========== 工单结构 ==========
export interface TicketItem {
  id: number;
  projectId: number;
  title: string;
  content: string;
  status: TicketStatus;
  assignRole: AgentRole | null;
  parentTicketId: number | null;
  createdAt: Date;
  finishedAt: Date | null;
}

// ========== AI模型配置项 ==========
export interface ModelConfig {
  id: number;
  alias: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  isLocal: boolean;
}

// ========== dispatchAI 统一入参 ==========
export interface DispatchAiInput {
  systemPrompt: string;
  userPrompt: string;
  modelId: number;
  temperature?: number;
}

// ========== WebSocket 推送消息体 ==========
export interface WsMessage {
  type: "log" | "status" | "notice";
  content: string;
  timestamp: string;
}

// ========== 网络服务触发器入参（归档后上传） ==========
export interface ArchiveUploadTrigger {
  projectId: number;
  archiveTime: string;
}

// ========== 全局接口通用返回格式 ==========
export interface ApiResult<T> {
  code: 0 | 1;
  msg: string;
  data: T | null;
}
