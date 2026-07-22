// ========== 场景智能识别（轻量化对话 vs 重型工程） ==========

export interface SceneAnalysis {
  mode: "chat" | "engineering";
  confidence: number;
  reason: string;
}

// 重型工程模式触发关键词
const ENGINEERING_KEYWORDS = [
  "项目", "开发", "实现", "部署", "架构", "设计", "系统",
  "模块", "重构", "迁移", "升级", "优化", "框架", "数据库",
  "前端", "后端", "全栈", "工程", "流水线", "CI/CD", "测试",
  "安全", "性能", "监控", "日志", "API", "接口", "服务",
  "docker", "k8s", "集群", "分布式", "微服务"
];

// 轻量化模式触发关键词
const CHAT_KEYWORDS = [
  "你好", "咨询", "问答", "建议", "推荐", "介绍", "解释",
  "说明", "文案", "写作", "创作", "翻译", "总结", "分析",
  "简单", "快速", "临时", "碎片", "即兴"
];

/**
 * 智能场景识别：根据用户输入判断是轻量对话还是重型工程
 */
export function detectScene(input: string, title?: string, contentLength?: number): SceneAnalysis {
  const text = `${title || ""} ${input}`.toLowerCase();
  let engineeringScore = 0;
  let chatScore = 0;

  // 工程模式评分
  for (const kw of ENGINEERING_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) engineeringScore += 2;
  }

  // 对话模式评分
  for (const kw of CHAT_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) chatScore += 2;
  }

  // 内容长度判断：长内容倾向工程模式
  if (contentLength && contentLength > 200) engineeringScore += 3;

  // 标题含项目/工单关键词
  if (title && (title.includes("实现") || title.includes("开发") || title.includes("部署"))) {
    engineeringScore += 3;
  }

  const total = engineeringScore + chatScore;
  if (total === 0) {
    // 默认轻量模式
    return { mode: "chat", confidence: 60, reason: "未检测到明确工程特征，默认使用对话模式" };
  }

  const engineeringConfidence = Math.round((engineeringScore / total) * 100);

  if (engineeringConfidence >= 55) {
    return {
      mode: "engineering",
      confidence: engineeringConfidence,
      reason: `工程特征评分${engineeringConfidence}%（工程关键词${engineeringScore}个，对话关键词${chatScore}个），推荐使用重型工程模式`
    };
  }

  return {
    mode: "chat",
    confidence: 100 - engineeringConfidence,
    reason: `对话特征评分${100 - engineeringConfidence}%，推荐使用轻量对话模式`
  };
}

/**
 * 基于工单内容分析场景
 */
export async function detectTicketScene(ticketId: number): Promise<SceneAnalysis> {
  // 动态import避免循环依赖
  const { default: Ticket } = await import("../db/models/Ticket");
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) return { mode: "chat", confidence: 50, reason: "工单不存在，默认对话模式" };

  return detectScene(
    ticket.content || "",
    ticket.title,
    (ticket.content || "").length
  );
}
