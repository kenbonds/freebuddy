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
  abnormal: boolean;
  priority: string;
  archivePath: string | null;
  createdAt: string;
}

// 项目统计
export interface ProjectStats {
  total: number;
  normal: number;
  archived: number;
  abnormal: number;
  ticketTotal: number;
  ticketDone: number;
  ticketPending: number;
  completionRate: number;
}

// 工单项
export interface TicketItem {
  id: number;
  projectId: number;
  title: string;
  content: string;
  status: "待认领" | "待执行" | "处理中" | "待复核" | "测试驳回" | "已办结" | "归档封存";
  assignRole: string | null;
  parentTicketId: number | null;
  priority: string;
  timeline: string;
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

// 质检报告
interface QAResultDetail {
  ruleId: number;
  ruleName: string;
  ruleType: string;
  severity: string;
  passed: boolean;
  detail: string;
}

export interface QAReportItem {
  id: number;
  ticketId: number;
  projectId: number;
  result: "pass" | "minor_issue" | "major_issue";
  summary: string;
  details: string;  // JSON string
  reportContent: string;
  triggeredBy: string;
  createdAt: string;
}

// 归档条件
export interface ArchiveCondition {
  allTicketsDone: boolean;
  allQaPassed: boolean;
  unfinishedCount: number;
  qaFailedCount: number;
  canArchive: boolean;
}

// 导出数据
export interface ProjectExportData {
  project: ProjectItem | null;
  tickets: TicketItem[];
  qaReports: QAReportItem[];
  auditLogs: unknown[];
  exportedAt: string;
}
