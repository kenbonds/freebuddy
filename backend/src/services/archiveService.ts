import path from "path";
import fs from "fs-extra";
import { exec } from "child_process";
import axios from "axios";
import { Op } from "sequelize";
import Project from "../db/models/Project";
import Ticket from "../db/models/Ticket";
import QAReport from "../db/models/QAReport";
import { archiveAllTicketsByProject } from "./ticketService";
import { writeAuditLog } from "../utils/auditLogger";

const PRIVATE_ROOT = path.resolve(__dirname, "../../../private_workspace");
const SRC_ROOT = path.join(PRIVATE_ROOT, "project_source");
const ARCHIVE_ROOT = path.join(PRIVATE_ROOT, "project_archive");
const UPLOAD_TRIGGER_URL = "http://127.0.0.1:9101/triggerArchiveUpload";

export interface ArchiveCondition {
  allTicketsDone: boolean;
  allQaPassed: boolean;
  unfinishedCount: number;
  qaFailedCount: number;
  canArchive: boolean;
}

/**
 * 检查项目是否满足归档条件
 */
export async function checkArchiveConditions(projectId: number): Promise<ArchiveCondition> {
  // 1. 检查是否所有工单已办结
  const unfinishedCount = await Ticket.count({
    where: {
      projectId,
      deletedAt: null,
      status: { [Op.notIn]: ["已办结", "归档封存"] }
    }
  });
  const allTicketsDone = unfinishedCount === 0;

  // 2. 检查所有工单的最新质检是否合格
  const tickets = await Ticket.findAll({
    where: { projectId, deletedAt: null },
    attributes: ["id"]
  });
  let qaFailedCount = 0;
  for (const t of tickets) {
    const latestReport = await QAReport.findOne({
      where: { ticketId: t.id },
      order: [["createdAt", "DESC"]]
    });
    // 有质检报告且结果为 major_issue 则不合格
    if (latestReport && latestReport.result === "major_issue") {
      qaFailedCount++;
    }
  }
  const allQaPassed = qaFailedCount === 0;

  return {
    allTicketsDone,
    allQaPassed,
    unfinishedCount,
    qaFailedCount,
    canArchive: allTicketsDone && allQaPassed
  };
}

/**
 * 项目归档全流程：
 * 1. 校验归档条件（所有工单办结 + 所有质检通过）
 * 2. 打包项目源码为 tar.gz
 * 3. 设置归档目录只读锁定
 * 4. 批量把所有工单置为「归档封存」
 * 5. 异步触发脱敏上传
 */
export async function archiveProject(projectId: number): Promise<string> {
  const project = await Project.findByPk(projectId);
  if (!project) throw new Error("目标项目不存在");
  if (project.archived) throw new Error("该项目已完成归档，不可重复操作");

  // 前置条件检查
  const conditions = await checkArchiveConditions(projectId);
  if (!conditions.canArchive) {
    const reasons: string[] = [];
    if (!conditions.allTicketsDone) reasons.push(`尚有 ${conditions.unfinishedCount} 个工单未办结`);
    if (!conditions.allQaPassed) reasons.push(`${conditions.qaFailedCount} 个工单质检不合格`);
    throw new Error(`归档条件不满足：${reasons.join("；")}`);
  }

  const projectSrcDir = path.join(SRC_ROOT, String(projectId));
  const timeStamp = new Date().getTime();
  const archiveFileName = `project_${projectId}_${timeStamp}.tar.gz`;
  const archiveFilePath = path.join(ARCHIVE_ROOT, archiveFileName);

  fs.ensureDirSync(ARCHIVE_ROOT);

  // tar 打包
  await new Promise<void>((resolve, reject) => {
    const cmd = `tar -czf "${archiveFilePath}" -C "${projectSrcDir}" .`;
    exec(cmd, (err) => {
      if (err) return reject(new Error(`打包失败: ${err.message}`));
      resolve();
    });
  });

  // 设置只读
  const isWin = process.platform === "win32";
  if (isWin) {
    await new Promise<void>((resolve, reject) => {
      exec(`attrib +R "${archiveFilePath}"`, (e) => e ? reject(e) : resolve());
    });
  } else {
    await new Promise<void>((resolve, reject) => {
      exec(`chmod 444 "${archiveFilePath}"`, (e) => e ? reject(e) : resolve());
    });
  }

  // 更新项目状态
  project.archived = true;
  project.archivePath = archiveFilePath;
  await project.save();

  // 批量归档工单
  await archiveAllTicketsByProject(projectId);

  writeAuditLog(
    `项目${projectId}完成归档，归档包路径:${archiveFilePath}，已设置只读锁定`,
    "archive"
  );

  // 异步触发脱敏上传
  axios.post(UPLOAD_TRIGGER_URL, { projectId, archiveTime: new Date().toISOString() })
    .catch(() => {
      // 网络服务未启动属正常
    });

  return archiveFilePath;
}

/**
 * 获取项目归档历史
 */
export async function getArchiveHistory(projectId: number): Promise<{ archivedAt: string; archivePath: string | null } | null> {
  const project = await Project.findByPk(projectId, {
    attributes: ["archived", "archivePath", "updatedAt"]
  });
  if (!project || !project.archived) return null;
  return {
    archivedAt: project.updatedAt.toISOString(),
    archivePath: project.archivePath
  };
}

