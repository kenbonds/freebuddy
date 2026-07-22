import Ticket from "../db/models/Ticket";
import { writeAuditLog } from "../utils/auditLogger";

// ========== 执行步骤 ==========
export interface ExecutionStep {
  order: number;
  name: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  result?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

// ========== 执行快照 ==========
export interface ExecutionSnapshot {
  ticketId: number;
  projectId: number;
  title: string;
  steps: ExecutionStep[];
  currentStep: number;
  createdAt: string;
  updatedAt: string;
  progress: number;
}

// ========== 工程任务自动拆解 ==========
export function decomposeTask(title: string, content: string): ExecutionStep[] {
  const steps: ExecutionStep[] = [];
  let order = 0;

  // 基于标题/内容自动拆解步骤
  // 1. 需求分析
  steps.push({
    order: ++order,
    name: "需求分析",
    description: `分析任务「${title}」的需求范围和目标`,
    status: "pending"
  });

  // 2. 方案设计
  steps.push({
    order: ++order,
    name: "方案设计",
    description: "制定实现方案和技术选型",
    status: "pending"
  });

  // 3. 代码实现或内容生成
  steps.push({
    order: ++order,
    name: "执行实施",
    description: `${content || "按照方案执行具体实施"}`,
    status: "pending"
  });

  // 4. 自检验证
  steps.push({
    order: ++order,
    name: "自检验证",
    description: "检查执行结果的完整性和正确性",
    status: "pending"
  });

  // 5. 结果整理
  steps.push({
    order: ++order,
    name: "结果整理",
    description: "整理执行产出物，准备提交复核",
    status: "pending"
  });

  return steps;
}

// ========== 创建执行快照 ==========
const snapshots = new Map<number, ExecutionSnapshot>();

export async function createExecutionSnapshot(ticketId: number): Promise<ExecutionSnapshot> {
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) throw new Error("工单不存在");

  const steps = decomposeTask(ticket.title, ticket.content || "");

  const snapshot: ExecutionSnapshot = {
    ticketId: ticket.id,
    projectId: ticket.projectId,
    title: ticket.title,
    steps,
    currentStep: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progress: 0
  };

  snapshots.set(ticketId, snapshot);
  writeAuditLog(`创建执行快照 工单${ticketId}，共${steps.length}个步骤`, "execution");
  return snapshot;
}

// ========== 获取执行快照 ==========
export function getExecutionSnapshot(ticketId: number): ExecutionSnapshot | null {
  return snapshots.get(ticketId) || null;
}

// ========== 执行下一步 ==========
export async function executeNextStep(ticketId: number): Promise<ExecutionSnapshot> {
  const snapshot = snapshots.get(ticketId);
  if (!snapshot) throw new Error("执行快照不存在，请先创建");

  const stepIndex = snapshot.steps.findIndex(s => s.status === "pending" || s.status === "failed");
  if (stepIndex === -1) {
    snapshot.progress = 100;
    snapshot.updatedAt = new Date().toISOString();
    return snapshot;
  }

  const step = snapshot.steps[stepIndex];
  step.status = "running";
  step.startedAt = new Date().toISOString();
  snapshot.currentStep = stepIndex;
  snapshot.updatedAt = new Date().toISOString();

  // 模拟执行
  try {
    // 记录执行开始
    writeAuditLog(`工单${ticketId} 执行步骤${step.order}: ${step.name}`, "execution");

    // 模拟耗时操作（实际中会调用dispatchAI）
    const simulateResult = `✅ 【${step.name}】执行完成\n- 任务: ${snapshot.title}\n- 步骤描述: ${step.description}\n- 执行时间: ${new Date().toLocaleString()}\n- 结果: 完成`;

    step.result = simulateResult;
    step.status = "completed";
    step.completedAt = new Date().toISOString();
  } catch (e) {
    step.status = "failed";
    step.error = String(e);
  }

  snapshot.updatedAt = new Date().toISOString();
  // 更新进度: 已完成步骤数 / 总步骤
  const completedCount = snapshot.steps.filter(s => s.status === "completed").length;
  snapshot.progress = Math.round((completedCount / snapshot.steps.length) * 100);
  return snapshot;
}

// ========== 重试当前失败步骤 ==========
export async function retryStep(ticketId: number): Promise<ExecutionSnapshot> {
  const snapshot = snapshots.get(ticketId);
  if (!snapshot) throw new Error("执行快照不存在");

  const failedStep = snapshot.steps.find(s => s.status === "failed");
  if (!failedStep) throw new Error("没有失败的步骤需要重试");

  failedStep.status = "pending";
  delete (failedStep as any).error;
  delete (failedStep as any).result;
  snapshot.updatedAt = new Date().toISOString();
  writeAuditLog(`工单${ticketId} 重试步骤 ${failedStep.name}`, "execution");

  return await executeNextStep(ticketId);
}

// ========== 中断执行 ==========
export function interruptExecution(ticketId: number): ExecutionSnapshot | null {
  const snapshot = snapshots.get(ticketId);
  if (!snapshot) return null;

  // 标记所有running/pending的步骤为skipped
  snapshot.steps.forEach(s => {
    if (s.status === "running" || s.status === "pending") {
      s.status = "skipped";
    }
  });
  snapshot.updatedAt = new Date().toISOString();
  writeAuditLog(`工单${ticketId} 执行已中断`, "execution");
  return snapshot;
}
