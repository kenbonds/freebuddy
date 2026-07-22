import { useEffect, useState } from "react";
import {
  Button, Table, Tag, message, Space, Modal, Typography, Tree, Select,
  Card, Statistic, Row, Col, Collapse, Divider, Input, Form, Alert, Tooltip
} from "antd";
import {
  AimOutlined, BranchesOutlined, CheckCircleOutlined,
  WarningOutlined, SyncOutlined, FileTextOutlined,
  LinkOutlined, PlusOutlined, ExperimentOutlined
} from "@ant-design/icons";
import request from "../api/request";
import type { ApiRes } from "../types/global";

const { Paragraph, Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface GoalItem {
  id: number;
  projectId: number;
  ticketId: number | null;
  parentGoalId: number | null;
  title: string;
  description: string;
  status: "active" | "completed" | "deviated";
  matchScore: number;
  deviationReason: string;
  achievedAt: string | null;
  createdAt: string;
  children: GoalItem[];
}

interface GoalMatchResult {
  matched: boolean;
  score: number;
  reason: string;
  details: { aspect: string; matched: boolean; detail: string }[];
  goalStatus: string;
}

interface GoalReport {
  reportContent: string;
  summary: {
    total: number;
    completed: number;
    active: number;
    deviated: number;
    avgScore: number;
    ticketCount: number;
  };
}

interface ProjectItem {
  id: number;
  projectName: string;
}

export default function GoalPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [goalTree, setGoalTree] = useState<GoalItem[]>([]);
  const [allGoals, setAllGoals] = useState<GoalItem[]>([]);
  const [report, setReport] = useState<GoalReport | null>(null);
  const [loading, setLoading] = useState(false);

  // 创建目标弹窗
  const [createModal, setCreateModal] = useState(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState(false);

  // 匹配度校验弹窗
  const [matchModal, setMatchModal] = useState(false);
  const [matchResult, setMatchResult] = useState<GoalMatchResult | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);

  // 报告弹窗
  const [reportModal, setReportModal] = useState(false);

  // 绑定工单弹窗
  const [bindModal, setBindModal] = useState(false);
  const [bindForm] = Form.useForm();
  const [bindLoading, setBindLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const res = await request.get<ApiRes<ProjectItem[]>>("/project/list");
    if (res.code === 0 && res.data) {
      setProjects(res.data);
    }
  };

  const loadGoalData = async (projectId: number) => {
    setLoading(true);
    try {
      const [treeRes, reportRes] = await Promise.all([
        request.get<ApiRes<GoalItem[]>>(`/goal/tree/${projectId}`),
        request.get<ApiRes<GoalReport>>(`/goal/report/${projectId}`)
      ]);
      if (treeRes.code === 0 && treeRes.data) {
        setGoalTree(treeRes.data);
        // 扁平化所有目标
        const flat: GoalItem[] = [];
        const flatten = (items: GoalItem[]) => {
          for (const item of items) {
            flat.push(item);
            flatten(item.children);
          }
        };
        flatten(treeRes.data);
        setAllGoals(flat);
      }
      if (reportRes.code === 0 && reportRes.data) {
        setReport(reportRes.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const onProjectChange = (val: number) => {
    setSelectedProject(val);
    loadGoalData(val);
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setCreating(true);
      const res = await request.post<ApiRes<GoalItem>>("/goal/create", {
        projectId: selectedProject,
        title: values.title,
        description: values.description,
        parentGoalId: values.parentGoalId || null
      });
      if (res.code === 0) {
        message.success("目标创建成功");
        setCreateModal(false);
        createForm.resetFields();
        if (selectedProject) loadGoalData(selectedProject);
      } else {
        message.error(res.msg);
      }
    } catch { /* validation failed */ }
    finally { setCreating(false); }
  };

  const handleDecompose = async (goalId: number) => {
    const res = await request.post<ApiRes<GoalItem[]>>(`/goal/decompose/${goalId}`);
    if (res.code === 0) {
      message.success(res.msg);
      if (selectedProject) loadGoalData(selectedProject);
    } else {
      message.error(res.msg);
    }
  };

  const handleCheckMatch = async (ticketId: number) => {
    setMatchLoading(true);
    setMatchModal(true);
    setMatchResult(null);
    try {
      const res = await request.post<ApiRes<GoalMatchResult>>(`/goal/checkMatch/${ticketId}`);
      if (res.code === 0 && res.data) {
        setMatchResult(res.data);
      } else {
        message.error(res.msg);
        setMatchModal(false);
      }
    } finally {
      setMatchLoading(false);
    }
  };

  const handleBindTicket = async () => {
    try {
      const values = await bindForm.validateFields();
      setBindLoading(true);
      const res = await request.post<ApiRes<unknown>>("/goal/bindTicket", {
        ticketId: values.ticketId,
        goalId: values.goalId
      });
      if (res.code === 0) {
        message.success("工单绑定目标成功");
        setBindModal(false);
        bindForm.resetFields();
        if (selectedProject) loadGoalData(selectedProject);
      } else {
        message.error(res.msg);
      }
    } catch { /* validation failed */ }
    finally { setBindLoading(false); }
  };

  // 将目标树转换为 Ant Design Tree 数据格式
  const treeData = goalTree.map(item => convertToTreeData(item));

  function convertToTreeData(goal: GoalItem): any {
    return {
      title: (
        <span>
          {goal.status === "completed" ? <CheckCircleOutlined style={{ color: "#52c41a" }} /> :
           goal.status === "deviated" ? <WarningOutlined style={{ color: "#ff4d4f" }} /> :
           <SyncOutlined style={{ color: "#1890ff" }} />}
          &nbsp;{goal.title}
          <Tag color={goal.status === "completed" ? "green" : goal.status === "deviated" ? "red" : "blue"}
               style={{ marginLeft: 8 }}>
            {goal.matchScore}%
          </Tag>
          {goal.ticketId && <Tag color="purple" style={{ marginLeft: 4 }}>工单#{goal.ticketId}</Tag>}
        </span>
      ),
      key: goal.id,
      children: goal.children?.map(c => convertToTreeData(c)) || []
    };
  }

  const statusColor: Record<string, string> = {
    active: "blue",
    completed: "green",
    deviated: "red"
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    { title: "目标名称", dataIndex: "title", key: "title", ellipsis: true },
    {
      title: "状态", dataIndex: "status", key: "status", width: 100,
      render: (v: string) => <Tag color={statusColor[v]}>{v === "active" ? "进行中" : v === "completed" ? "已完成" : "偏离"}</Tag>
    },
    { title: "匹配度", dataIndex: "matchScore", key: "matchScore", width: 80, render: (v: number) => `${v}%` },
    {
      title: "操作", key: "op", width: 220,
      render: (_: any, r: GoalItem) => (
        <Space>
          {!r.parentGoalId && (
            <Tooltip title={r.children?.length > 0 ? "已拆解" : "AI自动拆解为目标子目标"}>
              <Button size="small" icon={<BranchesOutlined />}
                disabled={r.children?.length > 0}
                onClick={() => handleDecompose(r.id)}>
                拆解
              </Button>
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <Paragraph>
        <p>🎯 <Text strong>目标驱动智能任务体系</Text> — 所有任务必须绑定明确目标方可执行，系统自动校验目标匹配度并生成分析报告。</p>
      </Paragraph>

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="选择项目"
          style={{ width: 260 }}
          value={selectedProject}
          onChange={onProjectChange}
        >
          {projects.map(p => (
            <Option key={p.id} value={p.id}>{p.projectName}</Option>
          ))}
        </Select>
        {selectedProject && (
          <>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
              创建目标
            </Button>
            <Button icon={<LinkOutlined />} onClick={() => setBindModal(true)}>
              绑定工单
            </Button>
            <Button icon={<FileTextOutlined />} onClick={() => setReportModal(true)}>
              查看报告
            </Button>
          </>
        )}
      </Space>

      {selectedProject && report && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}><Card size="small"><Statistic title="目标总数" value={report.summary.total} prefix={<AimOutlined />} /></Card></Col>
          <Col span={5}><Card size="small"><Statistic title="已完成" value={report.summary.completed} valueStyle={{ color: "#52c41a" }} prefix={<CheckCircleOutlined />} /></Card></Col>
          <Col span={5}><Card size="small"><Statistic title="进行中" value={report.summary.active} valueStyle={{ color: "#1890ff" }} prefix={<SyncOutlined />} /></Card></Col>
          <Col span={5}><Card size="small"><Statistic title="偏离告警" value={report.summary.deviated} valueStyle={{ color: report.summary.deviated > 0 ? "#ff4d4f" : undefined }} prefix={<WarningOutlined />} /></Card></Col>
          <Col span={5}><Card size="small"><Statistic title="平均匹配度" value={`${report.summary.avgScore}%`} prefix={<ExperimentOutlined />} /></Card></Col>
        </Row>
      )}

      {selectedProject && (
        <Collapse
          defaultActiveKey={["tree"]}
          items={[
            {
              key: "tree",
              label: "🎯 目标分解树",
              children: goalTree.length > 0 ? (
                <Tree
                  showLine
                  treeData={treeData}
                  defaultExpandAll
                />
              ) : (
                <Text type="secondary">暂无目标数据，请先创建项目目标</Text>
              )
            },
            {
              key: "list",
              label: "📋 目标列表",
              children: (
                <Table
                  rowKey="id"
                  dataSource={allGoals}
                  columns={columns}
                  pagination={false}
                  size="small"
                />
              )
            }
          ]}
        />
      )}

      {/* 创建目标弹窗 */}
      <Modal
        open={createModal}
        onCancel={() => setCreateModal(false)}
        title="创建新目标"
        onOk={handleCreate}
        confirmLoading={creating}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="title" label="目标名称" rules={[{ required: true, message: "请输入目标名称" }]}>
            <Input placeholder="如：完成用户登录模块开发" />
          </Form.Item>
          <Form.Item name="description" label="目标描述" rules={[{ required: true, message: "请输入目标描述" }]}>
            <TextArea rows={3} placeholder="详细描述目标内容、验收标准等" />
          </Form.Item>
          <Form.Item name="parentGoalId" label="父级目标ID（可选）">
            <Input placeholder="留空则为顶层目标" type="number" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 匹配度校验弹窗 */}
      <Modal
        open={matchModal}
        onCancel={() => setMatchModal(false)}
        title="目标匹配度校验结果"
        footer={null}
      >
        {matchLoading ? (
          <Text>校验中...</Text>
        ) : matchResult ? (
          <div>
            <Alert
              type={matchResult.matched ? "success" : "warning"}
              message={matchResult.matched ? "✅ 目标匹配正常" : "⚠️ 目标匹配度不足"}
              description={`匹配度: ${matchResult.score}% | ${matchResult.reason}`}
              style={{ marginBottom: 16 }}
            />
            <Paragraph><strong>校验详情：</strong></Paragraph>
            {matchResult.details.map((d, i) => (
              <Paragraph key={i}>
                {d.matched ? "✅" : "❌"} <Text strong>{d.aspect}:</Text> {d.detail}
              </Paragraph>
            ))}
            <Paragraph>
              <Text type="secondary">目标状态: {matchResult.goalStatus === "active" ? "进行中" : matchResult.goalStatus === "completed" ? "已完成" : "偏离"}</Text>
            </Paragraph>
          </div>
        ) : null}
      </Modal>

      {/* 报告弹窗 */}
      <Modal
        open={reportModal}
        onCancel={() => setReportModal(false)}
        title="📊 目标达成度分析报告"
        width={700}
        footer={<Button onClick={() => setReportModal(false)}>关闭</Button>}
      >
        {report && (
          <div style={{ whiteSpace: "pre-wrap", background: "#f5f5f5", padding: 16, borderRadius: 4, maxHeight: 500, overflow: "auto" }}>
            {report.reportContent}
          </div>
        )}
      </Modal>

      {/* 绑定工单弹窗 */}
      <Modal
        open={bindModal}
        onCancel={() => setBindModal(false)}
        title="绑定工单到目标"
        onOk={handleBindTicket}
        confirmLoading={bindLoading}
      >
        <Form form={bindForm} layout="vertical">
          <Form.Item name="ticketId" label="工单ID" rules={[{ required: true, message: "请输入工单ID" }]}>
            <Input placeholder="输入工单ID" type="number" />
          </Form.Item>
          <Form.Item name="goalId" label="目标ID" rules={[{ required: true, message: "请输入目标ID" }]}>
            <Input placeholder="输入目标ID" type="number" />
          </Form.Item>
          <Paragraph type="secondary">绑定后，该工单执行完成时将自动校验与目标的匹配度。</Paragraph>
        </Form>
      </Modal>
    </div>
  );
}
