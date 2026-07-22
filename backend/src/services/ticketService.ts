import Ticket from "../db/models/Ticket";
import type { TicketStatus, AgentRole } from "../types";
import { writeAuditLog } from "../utils/auditLogger";
import { executeQAPipeline } from "./qaPipelineService";
import { checkGoalMatch } from "./goalService";
import { executeLogicTree } from "./logicValidatorService";
import Project from "../db/models/Project";
import Goal from "../db/models/Goal";
import { createKnowledge, searchKnowledge } from "./knowledgeService";

/** 记录一条时间线事件 */
async function addTimeline(ticket: Ticket, event: string) {
  const tl = JSON.parse(ticket.timeline || "[]");
  tl.push({ time: new Date().toISOString(), event });
  ticket.timeline = JSON.stringify(tl);
  await ticket.save();
}

/** 创建新工单，初始状态固定为「待认领」 */
export async function createTicket(
  projectId: number,
  title: string,
  content: string,
  priority: string = "P3",
  parentTicketId: number | null = null
) {
  // 逻辑树校验（含归档锁、参数完整性、内容自洽性）
  const treeResult = await executeLogicTree({
    action: "create",
    params: { projectId, title, content, priority, parentTicketId }
  });
  if (!treeResult.passed) {
    const errMsg = treeResult.results.filter(r => !r.valid).map(r => r.message).join("; ");
    throw new Error(`逻辑校验未通过: ${errMsg}`);
  }
  const ticket = await Ticket.create({
    projectId,
    title,
    content,
    status: "待认领",
    priority,
    assignRole: null,
    parentTicketId,
    timeline: JSON.stringify([{ time: new Date().toISOString(), event: "工单创建" }]),
    finishedAt: null,
    deletedAt: null
  });
  writeAuditLog(`新建工单 ID:${ticket.id} 归属项目${projectId} 优先级${priority}`, "ticket");
  return ticket;
}

/** 指派工单给指定智能角色 */
export async function assignTicket(ticketId: number, targetRole: AgentRole) {
  // 逻辑树校验
  const treeResult = await executeLogicTree({
    action: "assign", ticketId, params: { ticketId, targetRole }
  });
  if (!treeResult.passed) {
    const errMsg = treeResult.results.filter(r => !r.valid).map(r => r.message).join("; ");
    throw new Error(`逻辑校验未通过: ${errMsg}`);
  }
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) throw new Error("工单不存在");
  ticket.assignRole = targetRole;
  ticket.status = "待执行";
  await addTimeline(ticket, `指派至${targetRole}，状态切换为待执行`);
  writeAuditLog(`工单${ticketId}指派至${targetRole}，状态切换为待执行`, "ticket");
  return ticket;
}

/** 开始执行工单（待执行→处理中） */
export async function startExecute(ticketId: number) {
  // 逻辑树校验
  const treeResult = await executeLogicTree({
    action: "startExecute", ticketId, params: { ticketId }
  });
  if (!treeResult.passed) {
    const errMsg = treeResult.results.filter(r => !r.valid).map(r => r.message).join("; ");
    throw new Error(`逻辑校验未通过: ${errMsg}`);
  }
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) throw new Error("工单不存在");

  // 目标校验：检查项目下是否有目标，如有则工单必须绑定目标
  const project = await Project.findByPk(ticket.projectId);
  if (project) {
    const projectGoalCount = await Goal.count({ where: { projectId: project.id } });
    if (projectGoalCount > 0 && !ticket.goalId) {
      throw new Error("该项目已绑定目标，工单必须绑定目标后方可执行（无目标禁止执行）");
    }
  }

  ticket.status = "处理中";
  await addTimeline(ticket, "开始执行任务");
  writeAuditLog(`工单${ticketId}开始执行，状态切换为处理中`, "ticket");

  // 自动匹配关联知识作为执行上下文
  try {
    const matched = await searchKnowledge({
      keyword: ticket.title,
      projectId: ticket.projectId,
      ticketId: ticket.id
    });
    if (matched.list.length > 0) {
      writeAuditLog(`工单${ticketId}启动时自动匹配到${matched.list.length}条关联知识`, "knowledge");
    }
  } catch { /* 知识匹配异常不影响工单执行 */ }

  return ticket;
}

/** 工单流转：提交进入待复核 */
export async function submitForReview(ticketId: number) {
  // 逻辑树校验
  const treeResult = await executeLogicTree({
    action: "submitReview", ticketId, params: { ticketId }
  });
  if (!treeResult.passed) {
    const errMsg = treeResult.results.filter(r => !r.valid).map(r => r.message).join("; ");
    throw new Error(`逻辑校验未通过: ${errMsg}`);
  }
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) throw new Error("工单不存在");
  ticket.status = "待复核";
  await addTimeline(ticket, "提交复核");
  writeAuditLog(`工单${ticketId}提交复核`, "ticket");
  return ticket;
}

/** 复核驳回，退回测试驳回状态 */
export async function rejectTicket(ticketId: number, reason: string) {
  // 逻辑树校验
  const treeResult = await executeLogicTree({
    action: "reject", ticketId, params: { ticketId, reason }
  });
  if (!treeResult.passed) {
    const errMsg = treeResult.results.filter(r => !r.valid).map(r => r.message).join("; ");
    throw new Error(`逻辑校验未通过: ${errMsg}`);
  }
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) throw new Error("工单不存在");
  ticket.status = "测试驳回";
  await addTimeline(ticket, `复核驳回，原因：${reason}`);
  writeAuditLog(`工单${ticketId}驳回，原因：${reason}`, "ticket");
  return ticket;
}

/** 驳回后重新提交 */
export async function resubmitTicket(ticketId: number) {
  // 逻辑树校验
  const treeResult = await executeLogicTree({
    action: "resubmit", ticketId, params: { ticketId }
  });
  if (!treeResult.passed) {
    const errMsg = treeResult.results.filter(r => !r.valid).map(r => r.message).join("; ");
    throw new Error(`逻辑校验未通过: ${errMsg}`);
  }
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) throw new Error("工单不存在");
  ticket.status = "待复核";
  await addTimeline(ticket, "驳回后重新提交复核");
  writeAuditLog(`工单${ticketId}驳回后重新提交`, "ticket");
  return ticket;
}

/** 工单办结 — 办结后自动触发质检流水线 */
export async function finishTicket(ticketId: number) {
  // 逻辑树校验
  const treeResult = await executeLogicTree({
    action: "finish", ticketId, params: { ticketId }
  });
  if (!treeResult.passed) {
    const errMsg = treeResult.results.filter(r => !r.valid).map(r => r.message).join("; ");
    throw new Error(`逻辑校验未通过: ${errMsg}`);
  }
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) throw new Error("工单不存在");
  ticket.status = "已办结";
  ticket.finishedAt = new Date();
  await addTimeline(ticket, "工单已办结");
  writeAuditLog(`工单${ticketId}标记为已办结`, "ticket");
  // 自动触发质检流水线
  try {
    const report = await executeQAPipeline(ticketId, "auto");
    writeAuditLog(`工单${ticketId}办结后质检流水线自动执行完成, 结果:${report.result}`, "qa");
  } catch (qaErr) {
    writeAuditLog(`工单${ticketId}办结后质检流水线执行异常: ${String(qaErr)}`, "qa");
  }

  // 自动沉淀知识（有效产出内容归入工单知识库）
  if (ticket.content && ticket.content.trim().length > 20) {
    try {
      await createKnowledge({
        projectId: ticket.projectId,
        ticketId: ticket.id,
        title: `工单产出: ${ticket.title}`,
        content: ticket.content,
        sourceType: "auto_generated"
      });
      writeAuditLog(`工单${ticketId}产出内容自动沉淀为知识`, "knowledge");
    } catch (kErr) {
      writeAuditLog(`工单${ticketId}知识自动沉淀异常: ${String(kErr)}`, "knowledge");
    }
  }

  // 目标匹配度自动校验
  if (ticket.goalId) {
    try {
      const matchResult = await checkGoalMatch(ticketId);
      writeAuditLog(
        `工单${ticketId}办结后目标匹配度校验: ${matchResult.score}% ${matchResult.matched ? "✅正常" : "⚠️偏离"}`,
        "goal"
      );
    } catch (goalErr) {
      writeAuditLog(`工单${ticketId}办结后目标匹配度校验异常: ${String(goalErr)}`, "goal");
    }
  }

  return ticket;
}

/** 编辑工单 */
export async function editTicket(ticketId: number, updates: { title?: string; content?: string; priority?: string }) {
  // 逻辑树校验
  const treeResult = await executeLogicTree({
    action: "edit", ticketId, params: { ticketId, ...updates }
  });
  if (!treeResult.passed) {
    const errMsg = treeResult.results.filter(r => !r.valid).map(r => r.message).join("; ");
    throw new Error(`逻辑校验未通过: ${errMsg}`);
  }
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) throw new Error("工单不存在");
  if (updates.title) ticket.title = updates.title;
  if (updates.content) ticket.content = updates.content;
  if (updates.priority) ticket.priority = updates.priority;
  await addTimeline(ticket, "工单信息已编辑");
  writeAuditLog(`工单${ticketId}信息已编辑`, "ticket");
  return ticket;
}

/** 软删除工单 */
export async function deleteTicket(ticketId: number) {
  // 逻辑树校验
  const treeResult = await executeLogicTree({
    action: "delete", ticketId, params: { ticketId }
  });
  if (!treeResult.passed) {
    const errMsg = treeResult.results.filter(r => !r.valid).map(r => r.message).join("; ");
    throw new Error(`逻辑校验未通过: ${errMsg}`);
  }
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) throw new Error("工单不存在");
  ticket.deletedAt = new Date();
  await addTimeline(ticket, "工单已删除");
  writeAuditLog(`工单${ticketId}已删除`, "ticket");
  return ticket;
}

/** 项目整体归档时批量将项目下所有工单设为归档封存 */
export async function archiveAllTicketsByProject(projectId: number) {
  await Ticket.update(
    { status: "归档封存" as TicketStatus },
    { where: { projectId } }
  );
  writeAuditLog(`项目${projectId}全部工单批量归档封存`, "ticket");
}

/** 根据项目ID查询工单列表（不含已删除） */
export async function listTicketsByProject(projectId: number) {
  return Ticket.findAll({ where: { projectId, deletedAt: null }, order: [["createdAt", "ASC"]] });
}

/** 根据ID获取单条工单详情 */
export async function getTicketDetail(ticketId: number) {
  return Ticket.findByPk(ticketId);
}
