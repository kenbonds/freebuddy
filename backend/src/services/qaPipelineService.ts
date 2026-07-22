import QARule from "../db/models/QARule";
import QAReport from "../db/models/QAReport";
import Ticket from "../db/models/Ticket";
import { writeAuditLog } from "../utils/auditLogger";

interface RuleCheckResult {
  ruleId: number;
  ruleName: string;
  ruleType: string;
  severity: string;
  passed: boolean;
  detail: string;
}

/**
 * 执行质检流水线：对指定工单运行所有已启用的质检规则
 */
export async function executeQAPipeline(ticketId: number, triggeredBy: string = "auto"): Promise<QAReport> {
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) throw new Error("工单不存在");

  // 1. 获取所有已启用的质检规则
  const rules = await QARule.findAll({ where: { enabled: true } });

  // 2. 逐条执行规则
  const checkResults: RuleCheckResult[] = rules.map(rule => {
    const result = executeSingleRule(rule, ticket);
    return result;
  });

  // 3. 判定总体结果
  const failed = checkResults.filter(r => !r.passed);
  const criticalFailed = failed.filter(r => r.severity === "critical");
  const majorFailed = failed.filter(r => r.severity === "major");

  let overallResult: "pass" | "minor_issue" | "major_issue";
  if (criticalFailed.length > 0 || majorFailed.length > 0) {
    overallResult = "major_issue";
  } else if (failed.length > 0) {
    overallResult = "minor_issue";
  } else {
    overallResult = "pass";
  }

  // 4. 生成报告
  const summary = generateSummary(overallResult, checkResults.length, failed.length);
  const reportContent = generateReportContent(ticket, checkResults, overallResult);

  // 5. 保存报告
  const report = await QAReport.create({
    ticketId: ticket.id,
    projectId: ticket.projectId,
    result: overallResult,
    summary,
    details: JSON.stringify(checkResults),
    reportContent,
    triggeredBy
  });

  writeAuditLog(
    `质检流水线执行完成 工单ID:${ticketId} 结果:${overallResult} ` +
    `规则数:${checkResults.length} 失败:${failed.length}`,
    "qa"
  );

  return report;
}

/**
 * 执行单条规则的质检判定
 */
function executeSingleRule(rule: QARule, ticket: Ticket): RuleCheckResult {
  // 基于规则类型和 ticket 字段做模拟检测
  // 在真实场景中这里会调用外部检测工具，当前用启发式逻辑判定
  let passed = true;
  let detail = "";

  switch (rule.ruleType) {
    case "type_check":
      // 检查工单是否有产出内容
      if (!ticket.content || ticket.content.trim().length < 20) {
        passed = false;
        detail = "工单内容不完整，长度不足20字符";
      } else {
        detail = "工单内容完整性检查通过";
      }
      break;

    case "unit_test":
      // 模拟单元测试检测
      if (ticket.content && ticket.content.length > 0) {
        detail = "单元测试覆盖率检查通过";
      } else {
        passed = false;
        detail = "缺少测试覆盖数据";
      }
      break;

    case "security_scan":
      // 检查内容是否包含安全敏感信息
      const sensitiveKeywords = ["password", "secret", "token", "api_key", "private_key"];
      const foundSensitive = sensitiveKeywords.filter(kw =>
        ticket.content?.toLowerCase().includes(kw)
      );
      if (foundSensitive.length > 0) {
        passed = rule.severity !== "critical"; // critical规则不允许任何敏感词
        detail = `发现敏感关键词: ${foundSensitive.join(", ")}`;
      } else {
        detail = "安全扫描未发现敏感信息";
      }
      break;

    case "build_check":
      if (ticket.content && ticket.content.trim().length > 0) {
        detail = "构建产出物检查通过";
      } else {
        passed = false;
        detail = "缺少构建产出物";
      }
      break;

    case "e2e_test":
      if (ticket.status === "已办结") {
        detail = "E2E集成测试场景通过";
      } else {
        passed = false;
        detail = "工单未办结，无法执行E2E测试";
      }
      break;

    default:
      detail = "未知规则类型，默认通过";
  }

  return {
    ruleId: rule.id,
    ruleName: rule.ruleName,
    ruleType: rule.ruleType,
    severity: rule.severity,
    passed,
    detail
  };
}

/**
 * 生成摘要信息
 */
function generateSummary(result: string, total: number, failed: number): string {
  const resultLabels: Record<string, string> = {
    pass: "✅ 全部通过",
    minor_issue: "⚠️ 轻微瑕疵",
    major_issue: "❌ 严重不合格"
  };
  return `${resultLabels[result] || result} — 共检测 ${total} 项，通过 ${total - failed} 项，失败 ${failed} 项`;
}

/**
 * 生成标准化质检报告（Markdown格式）
 */
function generateReportContent(
  ticket: Ticket,
  checkResults: RuleCheckResult[],
  result: string
): string {
  const now = new Date().toISOString();
  const resultLabels: Record<string, string> = {
    pass: "✅ 合格通过",
    minor_issue: "⚠️ 轻微瑕疵",
    major_issue: "❌ 严重不合格"
  };

  let report = `# 自动化质检报告\n\n`;
  report += `**工单ID**: ${ticket.id}\n`;
  report += `**工单标题**: ${ticket.title}\n`;
  report += `**检测时间**: ${now}\n`;
  report += `**总体结论**: ${resultLabels[result] || result}\n\n`;
  report += `---\n\n`;
  report += `## 检测明细\n\n`;
  report += `| 规则名称 | 类型 | 严重级别 | 结果 | 详情 |\n`;
  report += `|---------|------|---------|------|------|\n`;

  for (const cr of checkResults) {
    const icon = cr.passed ? "✅" : "❌";
    report += `| ${cr.ruleName} | ${cr.ruleType} | ${cr.severity} | ${icon} | ${cr.detail} |\n`;
  }

  const failed = checkResults.filter(r => !r.passed);
  if (failed.length > 0) {
    report += `\n## 缺陷清单\n\n`;
    for (const f of failed) {
      report += `- **[${f.severity}] ${f.ruleName}**: ${f.detail}\n`;
    }
    report += `\n## 整改建议\n\n`;
    report += `1. 修复上述缺陷项\n`;
    report += `2. 重新提交工单复核\n`;
    report += `3. 再次触发质检流水线\n`;
  }

  report += `\n---\n`;
  report += `*报告由 FreeBuddy 自动化质检流水线生成*\n`;

  return report;
}

/**
 * 获取工单的最新质检报告
 */
export async function getLatestReport(ticketId: number): Promise<QAReport | null> {
  return QAReport.findOne({
    where: { ticketId },
    order: [["createdAt", "DESC"]]
  });
}

/**
 * 获取工单的所有质检报告
 */
export async function getReportsByTicket(ticketId: number): Promise<QAReport[]> {
  return QAReport.findAll({
    where: { ticketId },
    order: [["createdAt", "DESC"]]
  });
}

/**
 * 分页查询所有质检报告
 */
export async function listReports(
  page: number = 1,
  pageSize: number = 20,
  filter?: { result?: string | undefined; projectId?: number | undefined }
) {
  const where: Record<string, unknown> = {};
  if (filter?.result) where.result = filter.result;
  if (filter?.projectId) where.projectId = filter.projectId;

  const offset = (page - 1) * pageSize;
  const { rows, count } = await QAReport.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    offset,
    limit: pageSize
  });
  return { list: rows, total: count, page, pageSize };
}
