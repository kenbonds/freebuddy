// backend/src/services/archiveService.ts
import path from "path";
import fs from "fs-extra";
import { exec } from "child_process";
import axios from "axios";
import Project from "../db/models/Project";
import { archiveAllTicketsByProject } from "./ticketService";
import { writeAuditLog } from "../utils/auditLogger";

// 目录常量
const PRIVATE_ROOT = path.resolve(__dirname, "../../../private_workspace");
const SRC_ROOT = path.join(PRIVATE_ROOT, "project_source");
const ARCHIVE_ROOT = path.join(PRIVATE_ROOT, "project_archive");

// 网络服务触发器固定端口（network_service 监听9101接收归档上传指令）
const UPLOAD_TRIGGER_URL = "http://127.0.0.1:9101/triggerArchiveUpload";

/**
 * 项目归档全流程：
 * 1. 标记项目归档状态
 * 2. 打包项目源码为tar.gz
 * 3. Windows/Linux/macOS 设置归档目录只读锁定 attrib +R / chmod 444
 * 4. 批量把该项目所有工单置为「归档封存」
 * 5. HTTP调用网络子进程，触发四层脱敏自动上传公共规则
 */
export async function archiveProject(projectId: number): Promise<string> {
  const project = await Project.findByPk(projectId);
  if (!project) {
    throw new Error("目标项目不存在");
  }
  if (project.archived) {
    throw new Error("该项目已完成归档，不可重复操作");
  }

  const projectSrcDir = path.join(SRC_ROOT, String(projectId));
  const timeStamp = new Date().getTime();
  const archiveFileName = `project_${projectId}_${timeStamp}.tar.gz`;
  const archiveFilePath = path.join(ARCHIVE_ROOT, archiveFileName);

  // 确保归档根目录存在
  fs.ensureDirSync(ARCHIVE_ROOT);

  // 1. tar 打包源码目录
  await new Promise<void>((resolve, reject) => {
    const cmd = `tar -czf "${archiveFilePath}" -C "${projectSrcDir}" .`;
    exec(cmd, (err) => {
      if (err) return reject(new Error(`打包失败: ${err.message}`));
      resolve();
    });
  });

  // 2. 设置归档文件与目录只读
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

  // 3. 更新项目数据库归档标记
  project.archived = true;
  project.archivePath = archiveFilePath;
  await project.save();

  // 4. 本项目全部工单改为归档封存
  await archiveAllTicketsByProject(projectId);

  writeAuditLog(
    `项目${projectId}完成归档，归档包路径:${archiveFilePath}，已设置只读锁定`,
    "archive"
  );

  // 5. 异步调用网络服务，触发脱敏上传（不阻塞主归档流程）
  const triggerPayload = {
    projectId,
    archiveTime: new Date().toISOString()
  };
  axios.post(UPLOAD_TRIGGER_URL, triggerPayload)
    .catch((e) => {
      writeAuditLog(
        `归档后触发脱敏上传请求失败（网络服务未启动则属正常）:${String(e)}`,
        "archive_upload_trigger"
      );
    });

  return archiveFilePath;
}
