import { dispatchAI } from "../gateway/dispatchAI";
import AgentPrompt from "../db/models/AgentPrompt";
import Ticket from "../db/models/Ticket";
import type { AgentRole } from "../types";
import { writeAuditLog } from "../utils/auditLogger";

/**
 * 获取角色预设提示词，无记录则返回基础默认话术
 */
async function getRoleSystemPrompt(role: AgentRole): Promise<string> {
  const record = await AgentPrompt.findOne({ where: { role } });
  if (record) return record.promptContent;

  const defaultMap: Record<AgentRole, string> = {
    "架构规划员": "你是后端架构规划专家，负责项目整体模块拆分、数据库表结构设计、前后端接口定义、风险点排查，输出结构化架构方案。",
    "开发执行员": "你是全栈开发工程师，严格按照架构文档编写TypeScript代码，遵循TS严格类型，按需编写路由、逻辑、接口，可生成Git提交说明。",
    "测试校验员": "你负责代码类型检查、单元测试用例编写、自动化E2E测试方案、安全漏洞扫描，校验不通过明确列出问题并驳回工单。",
    "运维部署员": "你负责生成Nginx配置、PM2进程配置、SSH远程部署脚本、灰度发布方案、多盘备份策略。",
    "文档归档员": "你负责整理RACI权责文档、版本履历、接口文档，输出可归档的标准化说明文本。",
    "工单管控引擎": "你负责拆解父工单为子任务工单，维护工单依赖关系，按照流程自动推进流转状态。"
  };
  return defaultMap[role];
}

/**
 * 向指定角色发起一次智能体调用，绑定工单上下文
 */
export async function runAgentTask(
  ticketId: number,
  modelId: number,
  userInput: string
): Promise<string> {
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket || !ticket.assignRole) throw new Error("工单未指派角色，无法执行智能体任务");

  const systemPrompt = await getRoleSystemPrompt(ticket.assignRole);
  const result = await dispatchAI({
    systemPrompt,
    userPrompt: userInput,
    modelId
  });

  writeAuditLog(`工单${ticketId} 角色${ticket.assignRole} 调用AI完成，结果长度${result.length}`, "agent_dispatch");
  return result;
}

/**
 * 更新角色提示词模板（用于后续脱敏上传同步）
 */
export async function upsertAgentPrompt(role: AgentRole, promptText: string, version: string) {
  const [item] = await AgentPrompt.upsert({
    role,
    promptContent: promptText,
    versionTag: version
  });
  writeAuditLog(`更新${role}提示词模板，版本${version}`, "agent_prompt");
  return item;
}
