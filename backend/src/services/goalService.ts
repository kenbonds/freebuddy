import Goal from "../db/models/Goal";
import type { GoalAttributes } from "../db/models/Goal";
import Ticket from "../db/models/Ticket";
import Project from "../db/models/Project";
import { writeAuditLog } from "../utils/auditLogger";
import { Op } from "sequelize";

interface GoalTreeNode extends GoalAttributes {
  children: GoalTreeNode[];
}

// ========== 创建目标 ==========
export async function createGoal(
  projectId: number,
  title: string,
  description: string,
  parentGoalId: number | null = null,
  ticketId: number | null = null
) {
  const goal = await Goal.create({
    projectId,
    title,
    description,
    parentGoalId,
    ticketId,
    status: "active",
    matchScore: 0,
    deviationReason: "",
    achievedAt: null
  });
  writeAuditLog(`创建目标 "${title}" (ID:${goal.id}) 归属项目${projectId}`, "goal");
  return goal;
}

// ========== 获取目标的完整子目标树 ==========
export async function getGoalTree(projectId: number) {
  const all = await Goal.findAll({ where: { projectId }, order: [["createdAt", "ASC"]] });
  const map = new Map<number, GoalTreeNode>();
  const roots: GoalTreeNode[] = [];

  for (const g of all) {
    map.set(g.id, { ...g.get({ plain: true }), children: [] });
  }
  for (const g of map.values()) {
    if (g.parentGoalId && map.has(g.parentGoalId)) {
      map.get(g.parentGoalId)!.children.push(g);
    } else if (!g.parentGoalId) {
      roots.push(g);
    }
  }
  return roots;
}

// ========== AI自动拆解总目标为一级子目标（启发式拆分） ==========
export async function decomposeGoal(goalId: number) {
  const parent = await Goal.findByPk(goalId);
  if (!parent) throw new Error("目标不存在");
  if (parent.parentGoalId) throw new Error("仅总目标（顶层目标）可自动拆解");

  // 检查是否已有子目标
  const existing = await Goal.count({ where: { parentGoalId: goalId } });
  if (existing > 0) throw new Error("该目标已被拆解，不允许重复拆解");

  const desc = parent.description || parent.title;
  const keywords = extractKeywords(desc);

  // 启发式生成子目标：根据关键词将大目标拆解为多个执行节点
  const subGoals: { title: string; description: string }[] = [];

  if (keywords.length >= 3) {
    // 关键词丰富时按关键词分组生成子目标
    const chunks = chunkArray(keywords, Math.ceil(keywords.length / 3));
    chunks.forEach((group, i) => {
      subGoals.push({
        title: `子目标${i + 1}：${group.join("、")}分析`,
        description: `针对 ${group.join("、")} 进行专项分析和执行，确保覆盖所有关键点。源目标: ${parent.title}`
      });
    });
  } else {
    // 关键词不足时按标准化步骤拆分
    const steps = ["需求调研与分析", "方案设计与规划", "执行与验证"];
    steps.forEach((step) => {
      subGoals.push({
        title: step,
        description: `${step} — 基于总目标「${parent.title}」: ${desc.substring(0, 50)}`
      });
    });
  }

  const created: Goal[] = [];
  for (const sg of subGoals) {
    const child = await createGoal(
      parent.projectId,
      sg.title,
      sg.description,
      parent.id,
      null
    );
    created.push(child);
  }
  writeAuditLog(`目标 "${parent.title}" (ID:${goalId}) 自动拆解为 ${created.length} 个子目标`, "goal");
  return created;
}

/** 从文本中提取关键词（简单分词+停用词过滤） */
function extractKeywords(text: string): string[] {
  // 简单中文分词：按常见分隔符拆分
  const tokens = text.split(/[\s,，。、；;：:！!？?（）()【】\[\]{}]/).filter(t => t.length >= 2);
  // 停用词过滤
  const stopwords = new Set(["这个", "那个", "什么", "如何", "怎么", "怎样", "一个", "可以", "进行", "通过", "基于", "关于"]);
  const unique = new Set<string>();
  for (const t of tokens) {
    if (!stopwords.has(t) && t.length >= 2) unique.add(t);
  }
  return Array.from(unique);
}

/** 数组分块 */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// ========== 检测工单与目标的匹配度 ==========
export async function checkGoalMatch(ticketId: number) {
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) throw new Error("工单不存在");
  if (!ticket.goalId) return { matched: false, score: 0, reason: "工单未绑定目标", details: [] };

  const goal = await Goal.findByPk(ticket.goalId);
  if (!goal) return { matched: false, score: 0, reason: "关联目标不存在", details: [] };

  const details: { aspect: string; matched: boolean; detail: string }[] = [];
  let matchedCount = 0;
  let totalChecks = 0;

  // 1. 标题匹配
  totalChecks++;
  const titleMatch = computeSimilarity(ticket.title, goal.title);
  if (titleMatch > 0.3) matchedCount++;
  details.push({
    aspect: "标题匹配",
    matched: titleMatch > 0.3,
    detail: `工单标题「${ticket.title}」vs 目标「${goal.title}」→ 相似度 ${(titleMatch * 100).toFixed(0)}%`
  });

  // 2. 内容关键词匹配
  totalChecks++;
  const goalKeywords = extractKeywords(goal.title + " " + goal.description);
  const ticketContent = ticket.title + " " + ticket.content;
  const contentMatch = goalKeywords.length > 0
    ? goalKeywords.filter(k => ticketContent.includes(k)).length / goalKeywords.length
    : 0;
  if (contentMatch > 0.2) matchedCount++;
  details.push({
    aspect: "关键词覆盖",
    matched: contentMatch > 0.2,
    detail: `目标关键词 ${goalKeywords.length} 个，工单覆盖 ${Math.round(contentMatch * goalKeywords.length)} 个，覆盖率 ${(contentMatch * 100).toFixed(0)}%`
  });

  // 3. 执行状态检查（仅完成状态的工单可获得高分）
  totalChecks++;
  const isFinished = ticket.status === "已办结" || ticket.status === "归档封存";
  if (isFinished) matchedCount++;
  details.push({
    aspect: "执行完成度",
    matched: isFinished,
    detail: isFinished ? "工单已办结，目标执行完成" : "工单尚未办结，目标执行中"
  });

  const score = totalChecks > 0 ? Math.round((matchedCount / totalChecks) * 100) : 0;
  const isBelowThreshold = score < 40;
  const deviationReason = isBelowThreshold
    ? `目标匹配度不足: 工单「${ticket.title}」与目标「${goal.title}」匹配度仅 ${score}%（阈值 40%）`
    : "";

  // 更新目标匹配度
  goal.matchScore = score;
  if (isBelowThreshold) {
    goal.status = "deviated";
    goal.deviationReason = deviationReason;
  } else if (isFinished && score >= 80) {
    goal.status = "completed";
    goal.achievedAt = new Date();
  }
  await goal.save();

  writeAuditLog(
    `工单${ticketId}目标匹配度校验: ${score}% ${isBelowThreshold ? "⚠️执行偏离" : "✅正常"}`,
    "goal"
  );

  return {
    matched: score >= 40,
    score,
    reason: deviationReason || "目标匹配正常",
    details,
    goalStatus: goal.status
  };
}

/** 简单字符串相似度（基于公共子串比例） */
function computeSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0 || bLen === 0) return 0;

  // 计算最长公共子串长度
  let maxLen = 0;
  const dp: number[][] = Array.from({ length: aLen + 1 }, () => Array(bLen + 1).fill(0));
  for (let i = 1; i <= aLen; i++) {
    for (let j = 1; j <= bLen; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > maxLen) maxLen = dp[i][j];
      }
    }
  }
  return maxLen / Math.max(aLen, bLen);
}

// ========== 生成目标达成度分析报告 ==========
export async function generateGoalReport(projectId: number) {
  const project = await Project.findByPk(projectId);
  if (!project) throw new Error("项目不存在");

  const goals = await Goal.findAll({ where: { projectId }, order: [["createdAt", "ASC"]] });
  if (goals.length === 0) return { reportContent: "该项目暂无目标数据", summary: {} };

  const total = goals.length;
  const completed = goals.filter(g => g.status === "completed").length;
  const deviated = goals.filter(g => g.status === "deviated").length;
  const active = goals.filter(g => g.status === "active").length;
  const avgScore = goals.length > 0
    ? Math.round(goals.reduce((s, g) => s + g.matchScore, 0) / goals.length)
    : 0;

  // 关联工单统计
  const tickets = await Ticket.findAll({
    where: { projectId, deletedAt: null, goalId: { [Op.ne]: null } }
  });

  // 构建树状报告
  let reportContent = `# 目标达成度分析报告\n\n`;
  reportContent += `**项目**: ${project.projectName} (ID: ${projectId})\n`;
  reportContent += `**生成时间**: ${new Date().toLocaleString("zh-CN")}\n\n`;
  reportContent += `---\n\n`;
  reportContent += `## 一、总体统计\n\n`;
  reportContent += `| 指标 | 数值 |\n|------|------|\n`;
  reportContent += `| 目标总数 | ${total} |\n`;
  reportContent += `| 已完成 | ${completed} |\n`;
  reportContent += `| 进行中 | ${active} |\n`;
  reportContent += `| 偏离告警 | ${deviated} |\n`;
  reportContent += `| 平均匹配度 | ${avgScore}% |\n`;
  reportContent += `| 关联工单数 | ${tickets.length} |\n\n`;
  reportContent += `**完成率**: ${total > 0 ? (completed / total * 100).toFixed(1) : 0}%\n\n`;
  reportContent += `---\n\n`;
  reportContent += `## 二、目标分解树\n\n`;

  const treeData = await getGoalTree(projectId);
  const lines: string[] = [];
  for (const root of treeData) {
    appendGoalToReport(lines, root, 0);
  }
  reportContent += lines.join("\n");

  reportContent += `---\n\n`;
  reportContent += `## 三、偏离与优化建议\n\n`;

  const deviatedGoals = goals.filter(g => g.status === "deviated");
  if (deviatedGoals.length === 0) {
    reportContent += `✅ 所有目标均执行正常，无偏离告警。\n\n`;
  } else {
    for (const dg of deviatedGoals) {
      reportContent += `### ⚠️ 偏离目标: ${dg.title}\n`;
      reportContent += `- **匹配度**: ${dg.matchScore}%\n`;
      reportContent += `- **偏离原因**: ${dg.deviationReason || "未记录"}\n`;
      reportContent += `- **建议**: 检查关联工单执行方向，调整内容以贴合目标要求\n\n`;
    }
  }

  reportContent += `---\n\n`;
  reportContent += `## 四、优化建议\n\n`;
  if (avgScore < 60) {
    reportContent += `1. 🔄 整体匹配度偏低(${avgScore}%)，建议审视工单与目标的关联性\n`;
  }
  if (active > total / 2) {
    reportContent += `2. ⏳ 超过半数目标仍在进行中，建议加速执行推进\n`;
  }
  if (deviated > 0) {
    reportContent += `3. 🚨 ${deviated} 个目标出现偏离，建议优先纠偏\n`;
  }
  reportContent += `4. 📊 推荐定期运行目标匹配度校验，确保执行方向不偏离\n\n`;

  return {
    reportContent,
    summary: { total, completed, active, deviated, avgScore, ticketCount: tickets.length }
  };
}

function appendGoalToReport(lines: string[], goal: GoalTreeNode, depth: number): void {
  const indent = "  ".repeat(depth);
  const statusIcon = goal.status === "completed" ? "✅" : goal.status === "deviated" ? "⚠️" : "🔄";
  lines.push(`${indent}- ${statusIcon} **${goal.title}** (匹配度: ${goal.matchScore}%, 状态: ${goal.status})`);
  if (goal.deviationReason) {
    lines.push(`${indent}  - ⚠️ ${goal.deviationReason}`);
  }
  for (const child of goal.children) {
    appendGoalToReport(lines, child, depth + 1);
  }
}

// ========== 更新目标状态（支持手动纠偏） ==========
export async function updateGoalStatus(
  goalId: number,
  status: "active" | "completed" | "deviated",
  matchScore?: number,
  deviationReason?: string
) {
  const goal = await Goal.findByPk(goalId);
  if (!goal) throw new Error("目标不存在");

  goal.status = status;
  if (matchScore !== undefined) goal.matchScore = matchScore;
  if (deviationReason !== undefined) goal.deviationReason = deviationReason;
  if (status === "completed") goal.achievedAt = new Date();
  await goal.save();

  writeAuditLog(`目标 "${goal.title}" (ID:${goalId}) 状态更新为 ${status}`, "goal");
  return goal;
}

// ========== 获取项目完整目标看板数据 ==========
export async function getGoalDashboard(projectId: number) {
  const goals = await Goal.findAll({ where: { projectId } });
  const tree = await getGoalTree(projectId);
  const report = await generateGoalReport(projectId);

  return {
    tree,
    report: report.reportContent,
    summary: report.summary,
    allGoals: goals
  };
}
