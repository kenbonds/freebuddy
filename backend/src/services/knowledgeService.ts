import KnowledgeLedger from "../db/models/KnowledgeLedger";
import { writeAuditLog } from "../utils/auditLogger";
import { Op } from "sequelize";

// ========== 三级知识层级自动判定 ==========
function determineLevel(projectId: number | null, ticketId: number | null): string {
  if (ticketId) return "ticket";
  if (projectId) return "project";
  return "public";
}

// ========== 智能自动打标（基于内容关键词） ==========
export function autoTag(title: string, content: string): string[] {
  const text = `${title} ${content}`;
  const tags = new Set<string>();

  // 预定义分类词典
  const dictionaries: Record<string, string[]> = {
    "架构": ["架构", "设计", "系统", "模块", "分层", "微服务", "架构图"],
    "开发": ["开发", "代码", "编程", "实现", "编码", "接口", "API"],
    "数据库": ["数据库", "SQL", "表", "字段", "索引", "数据", "存储"],
    "测试": ["测试", "校验", "验证", "单元测试", "集成测试", "覆盖率"],
    "运维": ["部署", "运维", "Docker", "容器", "环境", "配置", "DevOps"],
    "安全": ["安全", "权限", "认证", "加密", "鉴权", "JWT", "令牌"],
    "前端": ["前端", "React", "Vue", "页面", "UI", "组件", "界面"],
    "后端": ["后端", "Node", "Express", "API", "路由", "中间件"],
    "文档": ["文档", "说明", "手册", "指南", "规范", "流程"],
    "AI": ["AI", "模型", "大模型", "提示词", "Prompt", "智能"]
  };

  for (const [tag, keywords] of Object.entries(dictionaries)) {
    if (keywords.some(kw => text.includes(kw))) {
      tags.add(tag);
    }
  }

  // 若无匹配则加通用标签
  if (tags.size === 0) tags.add("通用");

  return Array.from(tags);
}

// ========== 创建知识条目 ==========
export async function createKnowledge(params: {
  projectId?: number | null;
  ticketId?: number | null;
  title: string;
  content: string;
  tags?: string[];
  sourceType?: string;
}) {
  const level = determineLevel(params.projectId || null, params.ticketId || null);
  const tagArray = params.tags && params.tags.length > 0 ? params.tags : autoTag(params.title, params.content);

  const item = await KnowledgeLedger.create({
    projectId: params.projectId || null,
    ticketId: params.ticketId || null,
    knowledgeLevel: level,
    title: params.title,
    content: params.content,
    tags: JSON.stringify(tagArray),
    sourceType: params.sourceType || "manual_import",
    reuseCount: 0,
    version: "v1.0"
  });
  writeAuditLog(`创建知识 "${params.title}" ID:${item.id} 层级:${level}`, "knowledge");
  return item;
}

// ========== 批量导入 ==========
export async function importBatch(items: {
  projectId?: number | null;
  ticketId?: number | null;
  title: string;
  content: string;
  tags?: string[];
}[]) {
  const created = [];
  for (const item of items) {
    const k = await createKnowledge(item);
    created.push(k);
  }
  writeAuditLog(`批量导入 ${created.length} 条知识`, "knowledge");
  return created;
}

// ========== 搜索知识（关键词匹配+目标导向） ==========
export async function searchKnowledge(params: {
  keyword?: string;
  level?: string;
  projectId?: number;
  ticketId?: number;
  goalKeywords?: string[];
  page?: number;
  pageSize?: number;
}) {
  const where: any = {};
  const conditions: any[] = [];

  if (params.level) where.knowledgeLevel = params.level;
  if (params.projectId) {
    conditions.push({ projectId: params.projectId });
    conditions.push({ knowledgeLevel: "public" });
  }
  if (params.ticketId) {
    conditions.push({ ticketId: params.ticketId });
    conditions.push({ projectId: { [Op.ne]: null }, knowledgeLevel: { [Op.in]: ["public", "project"] } });
  }
  if (params.keyword) {
    where[Op.or] = [
      { title: { [Op.like]: `%${params.keyword}%` } },
      { content: { [Op.like]: `%${params.keyword}%` } },
      { tags: { [Op.like]: `%${params.keyword}%` } }
    ];
  }
  // 目标导向检索：按目标关键词评分排序
  if (params.goalKeywords && params.goalKeywords.length > 0) {
    where[Op.and] = [
      ...(params.keyword ? [{ [Op.or]: [
        { title: { [Op.like]: `%${params.keyword}%` } },
        { content: { [Op.like]: `%${params.keyword}%` } }
      ] }] : []),
      {
        [Op.or]: params.goalKeywords.map(kw => ({
          [Op.or]: [
            { title: { [Op.like]: `%${kw}%` } },
            { content: { [Op.like]: `%${kw}%` } }
          ]
        }))
      }
    ];
  }

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const { rows, count } = await KnowledgeLedger.findAndCountAll({
    where,
    order: [["reuseCount", "DESC"], ["createdAt", "DESC"]],
    offset: (page - 1) * pageSize,
    limit: pageSize
  });

  // 搜索结果含目标匹配度评分
  let results = rows.map(r => {
    const json = r.toJSON();
    let score = 0;
    if (params.goalKeywords && params.goalKeywords.length > 0) {
      const text = `${json.title} ${json.content}`;
      const matchCount = params.goalKeywords.filter(kw => text.includes(kw)).length;
      score = Math.round((matchCount / params.goalKeywords.length) * 100);
    }
    return { ...json, goalScore: score, tags: JSON.parse(json.tags || "[]") };
  });

  // 目标导向按匹配度排序
  if (params.goalKeywords && params.goalKeywords.length > 0) {
    results.sort((a, b) => b.goalScore - a.goalScore);
  }

  return { list: results, total: count, page, pageSize };
}

// ========== 按层级获取 ==========
export async function listByLevel(level: string, projectId?: number) {
  const where: any = { knowledgeLevel: level };
  if (projectId && level === "project") where.projectId = projectId;
  const list = await KnowledgeLedger.findAll({ where, order: [["createdAt", "DESC"]] });
  return list.map(r => ({ ...r.toJSON(), tags: JSON.parse(r.tags || "[]") }));
}

// ========== 获取项目/工单关联知识 ==========
export async function getRelatedKnowledge(projectId?: number, ticketId?: number) {
  const where: any = {};
  if (ticketId) {
    where[Op.or] = [
      { knowledgeLevel: "public" },
      { knowledgeLevel: "project", projectId },
      { knowledgeLevel: "ticket", ticketId }
    ];
  } else if (projectId) {
    where[Op.or] = [
      { knowledgeLevel: "public" },
      { knowledgeLevel: "project", projectId }
    ];
  }
  const list = await KnowledgeLedger.findAll({ where, order: [["reuseCount", "DESC"]] });
  return list.map(r => ({ ...r.toJSON(), tags: JSON.parse(r.tags || "[]") }));
}

// ========== 递增复用计数 ==========
export async function incrementReuse(id: number) {
  const item = await KnowledgeLedger.findByPk(id);
  if (!item) throw new Error("知识条目不存在");
  item.reuseCount += 1;
  await item.save();
  return item;
}

// ========== 知识迭代（新旧对比+增量更新） ==========
export async function iterateKnowledge(id: number, newContent: string, changeNote?: string) {
  const old = await KnowledgeLedger.findByPk(id);
  if (!old) throw new Error("知识条目不存在");

  // 版本号递增
  const versionParts = old.version.replace("v", "").split(".");
  const major = parseInt(versionParts[0]) || 1;
  const minor = parseInt(versionParts[1]) || 0;
  const newVersion = `v${major}.${minor + 1}`;

  // 创建新版本条目（保留原关联）
  const newItem = await KnowledgeLedger.create({
    projectId: old.projectId,
    ticketId: old.ticketId,
    knowledgeLevel: old.knowledgeLevel,
    title: old.title,
    content: newContent,
    tags: old.tags,
    sourceType: "iteration",
    reuseCount: 0,
    version: newVersion
  });

  // 旧条目标记过期（可选）
  writeAuditLog(
    `知识 "${old.title}" 迭代: ${old.version} → ${newVersion}，变更说明: ${changeNote || "无"}`,
    "knowledge"
  );
  return { old: { ...old.toJSON(), tags: JSON.parse(old.tags || "[]") }, new: newItem };
}

// ========== 知识统计 ==========
export async function getKnowledgeStats() {
  const all = await KnowledgeLedger.findAll();
  const total = all.length;
  const byLevel: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  let totalReuse = 0;
  let totalIterations = 0;

  for (const k of all) {
    byLevel[k.knowledgeLevel] = (byLevel[k.knowledgeLevel] || 0) + 1;
    bySource[k.sourceType] = (bySource[k.sourceType] || 0) + 1;
    totalReuse += k.reuseCount;
    if (k.sourceType === "iteration") totalIterations++;
  }

  return { total, byLevel, bySource, totalReuse, totalIterations };
}

// ========== 自动解析文档（简单文本分段） ==========
export function parseDocument(text: string, title: string = ""): { sections: { heading: string; content: string }[] } {
  const lines = text.split("\n");
  const sections: { heading: string; content: string }[] = [];
  let currentHeading = "概述";
  let currentContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ") || trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
      if (currentContent.length > 0) {
        sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
      }
      currentHeading = trimmed.replace(/^#+\s*/, "");
      currentContent = [];
    } else if (trimmed.length > 0) {
      currentContent.push(trimmed);
    }
  }
  if (currentContent.length > 0) {
    sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
  }

  if (sections.length === 0) {
    sections.push({ heading: title || "内容", content: text.trim() });
  }

  return { sections };
}
