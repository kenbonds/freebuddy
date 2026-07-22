import { useState, useEffect } from "react";
import { Button, Card, Steps, List, Tag, Space, message, Spin, Select, Popconfirm, Typography, Alert, Statistic, Row, Col } from "antd";
import {
  PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined,
  FileAddOutlined, CheckCircleOutlined, CloseCircleOutlined,
  MinusCircleOutlined
} from "@ant-design/icons";
import { CN_TEXT } from "../constants/cnText";

const { Title, Text, Paragraph } = Typography;
const API = "/api";

interface ExecStep {
  order: number;
  name: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  result?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

interface ExecSnapshot {
  ticketId: number;
  projectId: number;
  title: string;
  steps: ExecStep[];
  currentStep: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

interface Ticket {
  id: number;
  title: string;
  status: string;
}

export default function EngineeringPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState<ExecSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);

  // 加载工单列表
  useEffect(() => {
    fetch(`${API}/ticket/list`)
      .then(r => r.json())
      .then(d => { if (d.code === 0) setTickets(d.data || []); })
      .catch(() => {});
  }, []);

  // 获取执行快照
  const loadSnapshot = async (ticketId: number) => {
    setLoading(true);
    setSelectedTicketId(ticketId);
    try {
      const r = await fetch(`${API}/execution/snapshot/${ticketId}`);
      const d = await r.json();
      if (d.code === 0) setSnapshot(d.data);
      else setSnapshot(null);
    } catch { setSnapshot(null); }
    setLoading(false);
  };

  // 创建快照
  const createSnapshot = async () => {
    if (!selectedTicketId) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/execution/createSnapshot/${selectedTicketId}`, { method: "POST" });
      const d = await r.json();
      if (d.code === 0) setSnapshot(d.data);
      else message.error(d.msg);
    } catch { message.error("创建快照失败"); }
    setLoading(false);
  };

  // 执行下一步
  const runNextStep = async () => {
    if (!selectedTicketId) return;
    setExecuting(true);
    try {
      const r = await fetch(`${API}/execution/nextStep/${selectedTicketId}`, { method: "POST" });
      const d = await r.json();
      if (d.code === 0) setSnapshot(d.data);
      else message.error(d.msg);
    } catch { message.error("执行失败"); }
    setExecuting(false);
  };

  // 重试
  const retry = async () => {
    if (!selectedTicketId) return;
    setExecuting(true);
    try {
      const r = await fetch(`${API}/execution/retry/${selectedTicketId}`, { method: "POST" });
      const d = await r.json();
      if (d.code === 0) setSnapshot(d.data);
      else message.error(d.msg);
    } catch { message.error("重试失败"); }
    setExecuting(false);
  };

  // 中断
  const interrupt = async () => {
    if (!selectedTicketId) return;
    try {
      const r = await fetch(`${API}/execution/interrupt/${selectedTicketId}`, { method: "POST" });
      const d = await r.json();
      if (d.code === 0) setSnapshot(d.data);
    } catch { message.error("中断失败"); }
  };

  const stepStatusMap: Record<string, "process" | "finish" | "wait" | "error"> = {
    completed: "finish",
    running: "process",
    failed: "error",
    pending: "wait",
    skipped: "wait"
  };

  const completedCount = snapshot?.steps.filter(s => s.status === "completed").length || 0;
  const failedCount = snapshot?.steps.filter(s => s.status === "failed").length || 0;

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>重型工程执行模式</Title>

      {/* 工单选择器 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Select
            style={{ width: 300 }}
            placeholder="选择工单执行任务"
            value={selectedTicketId}
            onChange={loadSnapshot}
            options={tickets.map(t => ({ label: `#${t.id} ${t.title}`, value: t.id }))}
            showSearch
            filterOption={(input, option) => (option?.label as string)?.includes(input)}
          />
          <Button icon={<FileAddOutlined />} onClick={createSnapshot} disabled={!selectedTicketId}>
            创建执行快照
          </Button>
        </Space>
      </Card>

      {loading && <Spin style={{ display: "block", margin: "40px auto" }} />}

      {snapshot && !loading && (
        <>
          {/* 统计卡片 */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic title="总步骤" value={snapshot.steps.length} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="已完成" value={completedCount} suffix={`/ ${snapshot.steps.length}`} valueStyle={{ color: "#52c41a" }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="执行进度" value={snapshot.progress} suffix="%" valueStyle={{ color: "#1677ff" }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="失败" value={failedCount} valueStyle={{ color: failedCount > 0 ? "#ff4d4f" : undefined }} />
              </Card>
            </Col>
          </Row>

          {/* 控制按钮 */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={runNextStep}
                loading={executing}
                disabled={snapshot.progress >= 100}
              >
                执行下一步
              </Button>
              <Button icon={<ReloadOutlined />} onClick={retry} loading={executing} disabled={failedCount === 0}>
                重试失败步骤
              </Button>
              <Popconfirm title="确认中断执行?" onConfirm={interrupt}>
                <Button icon={<PauseCircleOutlined />} danger disabled={snapshot.progress >= 100}>
                  中断执行
                </Button>
              </Popconfirm>
            </Space>
          </Card>

          {/* 步骤进度 */}
          <Card title="执行步骤" size="small" style={{ marginBottom: 16 }}>
            <Steps
              direction="vertical"
              current={snapshot.currentStep}
              size="small"
              items={snapshot.steps.map((step, idx) => ({
                title: (
                  <Space>
                    <Text strong>{step.name}</Text>
                    {step.status === "running" && <Spin size="small" />}
                    {step.status === "completed" && <CheckCircleOutlined style={{ color: "#52c41a" }} />}
                    {step.status === "failed" && <CloseCircleOutlined style={{ color: "#ff4d4f" }} />}
                    {step.status === "skipped" && <MinusCircleOutlined style={{ color: "#999" }} />}
                    <Tag color={
                      step.status === "completed" ? "success" :
                      step.status === "running" ? "processing" :
                      step.status === "failed" ? "error" :
                      step.status === "skipped" ? "default" : "default"
                    }>
                      {step.status === "pending" ? "待执行" :
                       step.status === "running" ? "执行中" :
                       step.status === "completed" ? "已完成" :
                       step.status === "failed" ? "失败" : "已跳过"}
                    </Tag>
                  </Space>
                ),
                description: (
                  <div>
                    <Text type="secondary">{step.description}</Text>
                    {step.result && (
                      <Alert
                        type="success"
                        message="执行结果"
                        description={<pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12 }}>{step.result}</pre>}
                        style={{ marginTop: 8 }}
                      />
                    )}
                    {step.error && (
                      <Alert
                        type="error"
                        message="执行错误"
                        description={step.error}
                        style={{ marginTop: 8 }}
                      />
                    )}
                  </div>
                )
              }))}
            />
          </Card>

          {/* 进度条 */}
          {snapshot.progress > 0 && (
            <Alert
              type={snapshot.progress >= 100 ? "success" : "info"}
              message={snapshot.progress >= 100 ? "🎉 全部步骤执行完成！" : `执行进度 ${snapshot.progress}%`}
              style={{ marginBottom: 16 }}
            />
          )}
        </>
      )}

      {!snapshot && !loading && selectedTicketId && (
        <Alert message="请点击「创建执行快照」开始工程执行" type="info" />
      )}
    </div>
  );
}
