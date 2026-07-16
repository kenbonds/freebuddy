import Ticket from "../db/models/Ticket";
import type { TicketStatus, AgentRole } from "../types";
import { writeAuditLog } from "../utils/auditLogger";

/** 创建新工单，初始状态固定为「待认领」 */
export async function createTicket(
  projectId: number,
  title: string,
  content: string,
  parentTicketId: number | null = null
) {
  const ticket = await Ticket.create({
    projectId,
    title,
    content,
    status: "待认领",
    assignRole: null,
    parentTicketId,
    finishedAt: null
  });
  writeAuditLog(`新建工单 ID:${ticket.id} 归属项目${projectId}`, "ticket");
  return ticket;
}

/** 指派工单给指定智能角色 */
export async function assignTicket(ticketId: number, targetRole: AgentRole) {
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) throw new Error("工单不存在");
  ticket.assignRole = targetRole;
  ticket.status = "处理中";
  await ticket.save();
  writeAuditLog(`工单${ticketId}指派至${targetRole}，状态切换为处理中`, "ticket");
  return ticket;
}

/** 工单流转：提交进入待复核 */
export async function submitForReview(ticketId: number) {
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) throw new Error("工单不存在");
  ticket.status = "待复核";
  await ticket.save();
  writeAuditLog(`工单${ticketId}提交复核`, "ticket");
  return ticket;
}

/** 复核驳回，退回测试驳回状态 */
export async function rejectTicket(ticketId: number, reason: string) {
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) throw new Error("工单不存在");
  ticket.status = "测试驳回";
  await ticket.save();
  writeAuditLog(`工单${ticketId}驳回，原因：${reason}`, "ticket");
  return ticket;
}

/** 工单办结 */
export async function finishTicket(ticketId: number) {
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) throw new Error("工单不存在");
  ticket.status = "已办结";
  ticket.finishedAt = new Date();
  await ticket.save();
  writeAuditLog(`工单${ticketId}标记为已办结`, "ticket");
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

/** 根据项目ID查询工单列表 */
export async function listTicketsByProject(projectId: number) {
  return Ticket.findAll({ where: { projectId }, order: [["createdAt", "ASC"]] });
}

/** 根据ID获取单条工单详情 */
export async function getTicketDetail(ticketId: number) {
  return Ticket.findByPk(ticketId);
}
