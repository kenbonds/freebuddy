import Ticket from "../db/models/Ticket";
import Project from "../db/models/Project";
import Goal from "../db/models/Goal";
import type { TicketStatus } from "../types";

// ========== 状态转换映射（标准化步骤依赖锁） ==========
const STATE_TRANSITIONS: Record<string, string[]> = {
  "待认领": ["待执行"],
  "待执行": ["处理中"],
  "处理中": ["待复核"],
  "待复核": ["测试驳回", "已办结"],
  "测试驳回": ["待复核"],
  "已办结": ["归档封存"],
  "归档封存": []
};

// ========== 状态转换校验：步骤依赖锁 ==========
export function validateStepTransition(
  currentStatus: string,
  targetStatus: TicketStatus
): { valid: boolean; message: string } {
  const allowed = STATE_TRANSITIONS[currentStatus];
  if (!allowed) {
    return { valid: false, message: `未知当前状态: ${currentStatus}` };
  }
  if (!allowed.includes(targetStatus)) {
    return {
      valid: false,
      message: `步骤依赖锁阻断：${currentStatus} → ${targetStatus} 不允许，允许的下一步: ${allowed.join("、")}`
    };
  }
  return { valid: true, message: "ok" };
}

// ========== 参数完整性校验 ==========
export function validateParams(
  params: Record<string, any>,
  requiredFields: string[]
): { valid: boolean; message: string; missing: string[] } {
  const missing: string[] = [];
  for (const field of requiredFields) {
    const val = params[field];
    if (val === undefined || val === null || val === "") {
      missing.push(field);
    }
  }
  if (missing.length > 0) {
    return {
      valid: false,
      message: `缺少必要参数: ${missing.join("、")}`,
      missing
    };
  }
  return { valid: true, message: "参数完整", missing: [] };
}

// ========== 前置依赖校验（父子工单/目标依赖） ==========
export async function validateDependencies(
  ticketId: number,
  checkGoal: boolean = false
): Promise<{ valid: boolean; message: string; details: string[] }> {
  const details: string[] = [];
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) return { valid: false, message: "工单不存在", details: ["工单不存在"] };

  // 1. 父工单依赖性校验：如果工单有父工单，父工单必须已办结
  if (ticket.parentTicketId) {
    const parent = await Ticket.findByPk(ticket.parentTicketId);
    if (parent && parent.status !== "已办结" && parent.status !== "归档封存") {
      details.push(`父工单 #${ticket.parentTicketId} 未办结（当前: ${parent.status}），前置任务未完成`);
    }
  }

  // 2. 项目状态校验：项目已归档则所有操作禁止
  const project = await Project.findByPk(ticket.projectId);
  if (project?.archived) {
    details.push(`项目 #${ticket.projectId} 已归档锁定，禁止任何数据增删改操作`);
  }

  // 3. 目标绑定校验（可选）
  if (checkGoal && !ticket.goalId) {
    const goalCount = await Goal.count({ where: { projectId: ticket.projectId } });
    if (goalCount > 0) {
      details.push("项目已配置目标，但工单未绑定任何目标");
    }
  }

  if (details.length > 0) {
    return { valid: false, message: `前置依赖未满足(${details.length}项)`, details };
  }
  return { valid: true, message: "前置依赖校验通过", details: [] };
}

// ========== 结果自洽性校验 ==========
export function validateContentSelfConsistency(
  content: string,
  title: string = ""
): { valid: boolean; message: string; issues: string[] } {
  const issues: string[] = [];

  if (!content || content.trim().length === 0) {
    issues.push("内容为空，无有效产出");
    return { valid: false, message: "内容为空", issues };
  }

  // 1. 最小长度要求（验证有实质内容）
  if (content.length < 20) {
    issues.push(`内容过短(${content.length}字符)，建议至少20字以确保产出质量`);
  }

  // 2. 内容与标题一致性检查（标题的关键词应在内容中出现）
  if (title) {
    const titleKeywords = title.split(/[\s,，。、]/).filter(k => k.length >= 2);
    const missingKeywords = titleKeywords.filter(k => !content.includes(k));
    if (missingKeywords.length > 0 && missingKeywords.length >= titleKeywords.length / 2) {
      issues.push(`内容与标题相关性不足：标题关键词 "${missingKeywords[0]}" 未在内容中出现`);
    }
  }

  // 3. 逻辑矛盾检测（简单启发式）
  const contradictionPairs = [
    ["成功", "失败"], ["启用", "禁用"], ["开启", "关闭"],
    ["增加", "减少"], ["通过", "拒绝"], ["完成", "未完成"]
  ];
  for (const [a, b] of contradictionPairs) {
    if (content.includes(a) && content.includes(b)) {
      // 仅当两者同时出现在相近位置时提示
      const aIdx = content.indexOf(a);
      const bIdx = content.indexOf(b);
      if (Math.abs(aIdx - bIdx) < 100) {
        issues.push(`内容中存在潜在逻辑矛盾："${a}"与"${b}"同时出现`);
        break; // 只报告第一对矛盾
      }
    }
  }

  // 4. 内容结构完整性检查
  const structuralMarkers = ["结论", "总结", "结果", "下一步", "建议", "方案"];
  const hasMarker = structuralMarkers.some(m => content.includes(m));
  if (!hasMarker && content.length > 50) {
    issues.push("内容缺少结论性标识词（结论/总结/结果/下一步），建议补充执行结论");
  }

  if (issues.length > 0) {
    return { valid: false, message: `自洽性校验发现 ${issues.length} 个问题`, issues };
  }
  return { valid: true, message: "内容自洽性校验通过", issues: [] };
}

// ========== 标准化执行逻辑树校验 ==========
export interface LogicTreeNode {
  name: string;
  validate: () => Promise<{ valid: boolean; message: string }>;
  children?: LogicTreeNode[];
}

export interface ValidationContext {
  action: string;          // create / assign / startExecute / finish / etc
  ticketId?: number;
  params: Record<string, any>;
  ticket?: Ticket | null;
}

/**
 * 构建标准化执行逻辑树并按序执行
 * 事务级别: critical(阻断) / warning(警告) / info(提示)
 */
export async function executeLogicTree(context: ValidationContext): Promise<{
  passed: boolean;
  results: { node: string; valid: boolean; message: string; level: string }[];
}> {
  const results: { node: string; valid: boolean; message: string; level: string }[] = [];

  const addResult = (node: string, valid: boolean, message: string, level: string = "critical") => {
    results.push({ node, valid, message, level });
  };

  // 加载工单数据
  if (context.ticketId && !context.ticket) {
    context.ticket = await Ticket.findByPk(context.ticketId);
  }

  // === 逻辑树：按顺序执行校验节点 ===
  const { action, params, ticket } = context;

  // 节点1: 参数完整性校验（所有操作）
  const paramDefs: Record<string, string[]> = {
    create: ["projectId", "title", "content"],
    assign: ["ticketId", "targetRole"],
    startExecute: ["ticketId"],
    submitReview: ["ticketId"],
    reject: ["ticketId", "reason"],
    finish: ["ticketId"],
    edit: ["ticketId"],
    delete: ["ticketId"]
  };
  const requiredParams = paramDefs[action] || Object.keys(params);
  const paramResult = validateParams(params, requiredParams);
  addResult("参数完整性", paramResult.valid, paramResult.message);

  if (!paramResult.valid) {
    return { passed: false, results };
  }

  // 节点2: 工单存在性校验（涉及ticketId的操作）
  if (["assign", "startExecute", "submitReview", "reject", "finish", "edit", "delete"].includes(action)) {
    if (!ticket) {
      addResult("工单存在性", false, "工单不存在");
      return { passed: false, results };
    }
    if (ticket.deletedAt) {
      addResult("工单存在性", false, "工单已被删除");
      return { passed: false, results };
    }
    addResult("工单存在性", true, "工单存在且未删除");
  }

  // 节点3: 项目归档锁校验
  if (ticket || params.projectId) {
    const pid = ticket?.projectId || params.projectId;
    if (pid) {
      const project = await Project.findByPk(pid);
      if (project?.archived) {
        addResult("项目归档锁", false, `项目已归档锁定，禁止操作`);
        return { passed: false, results };
      }
    }
  }
  addResult("项目归档锁", true, "项目未归档，操作允许");

  // 节点4: 步骤依赖锁校验（状态转换类操作）
  const statusActions: Record<string, TicketStatus> = {
    assign: "待执行",
    startExecute: "处理中",
    submitReview: "待复核",
    reject: "测试驳回",
    resubmit: "待复核",
    finish: "已办结"
  };
  if (statusActions[action] && ticket) {
    const targetStatus = statusActions[action];
    const transitionResult = validateStepTransition(ticket.status, targetStatus);
    addResult("步骤依赖锁", transitionResult.valid, transitionResult.message);
    if (!transitionResult.valid) {
      return { passed: false, results };
    }
  } else {
    // create/edit/delete 无状态转换约束
  }

  // 节点5: 前置依赖校验
  if (["startExecute", "submitReview", "finish"].includes(action) && ticket) {
    // 检查父工单依赖
    if (ticket.parentTicketId) {
      const parent = await Ticket.findByPk(ticket.parentTicketId);
      if (parent && parent.status !== "已办结" && parent.status !== "归档封存") {
        addResult("前置依赖", false, `父工单 #${ticket.parentTicketId} 未办结（状态: ${parent.status}）`);
        return { passed: false, results };
      }
    }
    addResult("前置依赖", true, "前置依赖满足");
  }

  // 节点6: 内容自洽性校验（涉及产出内容变更的操作）
  if (["create", "edit", "startExecute"].includes(action) && params.content) {
    const contentResult = validateContentSelfConsistency(params.content, params.title);
    if (!contentResult.valid) {
      addResult("内容自洽性", false, contentResult.message, "warning");
    } else {
      addResult("内容自洽性", true, "内容自洽性校验通过");
    }
  }

  // 节点7: 审计日志一致性（记录操作轨迹）
  const passed = results.every(r => r.valid || r.level === "warning");
  return { passed, results };
}
