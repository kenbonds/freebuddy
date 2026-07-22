import { Op } from "sequelize";
import Project from "../db/models/Project";
import Ticket from "../db/models/Ticket";
import QAReport from "../db/models/QAReport";
import AuditRecord from "../db/models/AuditRecord";

export interface ProjectExportData {
  project: Project | null;
  tickets: Ticket[];
  qaReports: QAReport[];
  auditLogs: AuditRecord[];
  exportedAt: string;
}

/**
 * 导出项目全量数据（溯源复盘用）
 */
export async function exportProjectData(projectId: number): Promise<ProjectExportData> {
  const project = await Project.findByPk(projectId);
  if (!project) throw new Error("项目不存在");

  const tickets = await Ticket.findAll({
    where: { projectId, deletedAt: null },
    order: [["createdAt", "ASC"]]
  });

  const ticketIds = tickets.map(t => t.id);

  const qaReports = await QAReport.findAll({
    where: { ticketId: ticketIds },
    order: [["createdAt", "DESC"]]
  });

  const auditLogs = await AuditRecord.findAll({
    where: {
      content: { [Op.like]: `%项目${projectId}%` }
    },
    order: [["createdAt", "DESC"]],
    limit: 500
  });

  return {
    project,
    tickets,
    qaReports,
    auditLogs,
    exportedAt: new Date().toISOString()
  };
}
