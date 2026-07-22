import ChatSession from "../db/models/ChatSession";
import ChatMessage from "../db/models/ChatMessage";
import { dispatchAI } from "../gateway/dispatchAI";
import { writeAuditLog } from "../utils/auditLogger";

// ========== 创建对话会话 ==========
export async function createSession(params: {
  title?: string;
  scene?: string;
  projectId?: number | null;
  ticketId?: number | null;
}) {
  const session = await ChatSession.create({
    title: params.title || "新对话",
    scene: params.scene || "general",
    projectId: params.projectId || null,
    ticketId: params.ticketId || null
  });
  writeAuditLog(`创建对话会话 ID:${session.id} 场景:${session.scene}`, "chat");
  return session;
}

// ========== 发送消息 ==========
export async function sendMessage(params: {
  sessionId: number;
  content: string;
  modelId?: number;
  role?: "user" | "assistant" | "system";
}) {
  // 保存用户消息
  const message = await ChatMessage.create({
    sessionId: params.sessionId,
    role: params.role || "user",
    content: params.content,
    modelId: params.modelId || null
  });

  // 如果是用户消息，自动调用AI回复
  if ((params.role || "user") === "user") {
    // 获取会话历史（最近10轮）
    const history = await ChatMessage.findAll({
      where: { sessionId: params.sessionId },
      order: [["createdAt", "ASC"]],
      limit: 20
    });

    // 构建对话上下文
    const systemPrompt = "你是一个智能办公助手FreeBuddy，支持日常咨询、文案创作、简单分析等轻量化工作。请用中文回复，保持简洁专业。";
    const messages = history.map(m => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content
    }));

    // 调用AI
    const modelId = params.modelId || 1;
    let reply = "";
    try {
      reply = await dispatchAI({
        systemPrompt,
        userPrompt: messages.map(m => `${m.role}: ${m.content}`).join("\n"),
        modelId
      });
    } catch (e) {
      reply = `[AI暂时不可用] ${String(e)}`;
    }

    // 保存AI回复
    const assistantMsg = await ChatMessage.create({
      sessionId: params.sessionId,
      role: "assistant",
      content: reply,
      modelId
    });

    // 自动更新会话标题（基于首条消息）
    const msgCount = await ChatMessage.count({ where: { sessionId: params.sessionId, role: "user" } });
    if (msgCount === 1) {
      const title = params.content.length > 30 ? params.content.substring(0, 30) + "..." : params.content;
      await ChatSession.update({ title }, { where: { id: params.sessionId } });
    }

    return { user: message, assistant: assistantMsg };
  }

  return { user: message };
}

// ========== 获取会话列表 ==========
export async function listSessions(scene?: string) {
  const where: any = {};
  if (scene) where.scene = scene;
  const sessions = await ChatSession.findAll({
    where,
    order: [["updatedAt", "DESC"]]
  });
  // 附带每个会话的消息数
  const result = [];
  for (const s of sessions) {
    const msgCount = await ChatMessage.count({ where: { sessionId: s.id } });
    result.push({ ...s.toJSON(), msgCount });
  }
  return result;
}

// ========== 获取会话消息历史 ==========
export async function getSessionMessages(sessionId: number) {
  const session = await ChatSession.findByPk(sessionId);
  if (!session) throw new Error("对话会话不存在");
  const messages = await ChatMessage.findAll({
    where: { sessionId },
    order: [["createdAt", "ASC"]]
  });
  return { session: session.toJSON(), messages: messages.map(m => m.toJSON()) };
}

// ========== 删除会话 ==========
export async function deleteSession(sessionId: number) {
  const session = await ChatSession.findByPk(sessionId);
  if (!session) throw new Error("对话会话不存在");
  await ChatMessage.destroy({ where: { sessionId } });
  await session.destroy();
  writeAuditLog(`删除对话会话 ID:${sessionId}`, "chat");
  return true;
}

// ========== 清空会话消息 ==========
export async function clearSessionMessages(sessionId: number) {
  const session = await ChatSession.findByPk(sessionId);
  if (!session) throw new Error("对话会话不存在");
  await ChatMessage.destroy({ where: { sessionId } });
  writeAuditLog(`清空对话会话 ID:${sessionId} 消息`, "chat");
  return true;
}
