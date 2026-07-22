import { useEffect, useState } from "react";
import {
  Button, Table, Tag, message, Space, Input, Select, Tabs, Card, Row, Col,
  Statistic, Modal, Form, Typography, Tooltip, Badge, Collapse
} from "antd";
import {
  BookOutlined, PlusOutlined, SearchOutlined, ImportOutlined,
  ReloadOutlined, TagsOutlined, FileTextOutlined, ExperimentOutlined,
  AimOutlined, LinkOutlined, BarChartOutlined
} from "@ant-design/icons";
import request from "../api/request";
import type { ApiRes } from "../types/global";

const { Paragraph, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface KnowledgeItem {
  id: number;
  projectId: number | null;
  ticketId: number | null;
  knowledgeLevel: string;
  title: string;
  content: string;
  tags: string[];
  sourceType: string;
  reuseCount: number;
  version: string;
  createdAt: string;
  goalScore?: number;
}

interface KnowledgeStats {
  total: number;
  byLevel: Record<string, number>;
  bySource: Record<string, number>;
  totalReuse: number;
  totalIterations: number;
}

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState("public");
  const [list, setList] = useState<KnowledgeItem[]>([]);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");

  // 创建弹窗
  const [createModal, setCreateModal] = useState(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState(false);

  // 批量导入弹窗
  const [importModal, setImportModal] = useState(false);
  const [importForm] = Form.useForm();
  const [importing, setImporting] = useState(false);

  // 迭代弹窗
  const [iterModal, setIterModal] = useState(false);
  const [iterForm] = Form.useForm();
  const [iterTarget, setIterTarget] = useState<KnowledgeItem | null>(null);
  const [iterating, setIterating] = useState(false);

  useEffect(() => {
    loadList();
    loadStats();
  }, [activeTab]);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await request.get<ApiRes<{ list: KnowledgeItem[]; total: number }>>(
        `/knowledge/search?level=${activeTab}${keyword ? `&keyword=${keyword}` : ""}`
      );
      if (res.code === 0 && res.data) setList(res.data.list || []);
    } finally { setLoading(false); }
  };

  const loadStats = async () => {
    const res = await request.get<ApiRes<KnowledgeStats>>("/knowledge/stats");
    if (res.code === 0 && res.data) setStats(res.data);
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setCreating(true);
      const tags = values.tagsStr ? values.tagsStr.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
      const res = await request.post<ApiRes<KnowledgeItem>>("/knowledge/create", {
        title: values.title, content: values.content,
        projectId: values.projectId || null, ticketId: values.ticketId || null,
        tags
      });
      if (res.code === 0) {
        message.success("知识创建成功");
        setCreateModal(false);
        createForm.resetFields();
        loadList(); loadStats();
      } else message.error(res.msg);
    } catch { /* */ } finally { setCreating(false); }
  };

  const handleImport = async () => {
    try {
      const values = await importForm.validateFields();
      setImporting(true);
      const lines = values.rawText.split("\n").filter(Boolean);
      const items = lines.map((line: string) => {
        const sepIdx = line.indexOf("|");
        if (sepIdx > 0) {
          return { title: line.substring(0, sepIdx).trim(), content: line.substring(sepIdx + 1).trim() };
        }
        return { title: "导入知识", content: line.trim() };
      });
      const res = await request.post<ApiRes<KnowledgeItem[]>>("/knowledge/importBatch", { items });
      if (res.code === 0) {
        message.success(res.msg);
        setImportModal(false);
        importForm.resetFields();
        loadList(); loadStats();
      } else message.error(res.msg);
    } catch { /* */ } finally { setImporting(false); }
  };

  const handleIterate = async () => {
    try {
      const values = await iterForm.validateFields();
      setIterating(true);
      const res = await request.post<ApiRes<any>>(`/knowledge/iterate/${iterTarget!.id}`, {
        newContent: values.newContent, changeNote: values.changeNote
      });
      if (res.code === 0) {
        message.success(res.msg);
        setIterModal(false);
        iterForm.resetFields();
        loadList(); loadStats();
      } else message.error(res.msg);
    } catch { /* */ } finally { setIterating(false); }
  };

  const handleReuse = async (id: number) => {
    await request.post(`/knowledge/reuse/${id}`);
    loadList(); loadStats();
  };

  const levelColor: Record<string, string> = { public: "green", project: "blue", ticket: "purple" };
  const levelLabel: Record<string, string> = { public: "公共", project: "项目", ticket: "工单" };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    {
      title: "层级", dataIndex: "knowledgeLevel", key: "level", width: 80,
      render: (v: string) => <Tag color={levelColor[v]}>{levelLabel[v] || v}</Tag>
    },
    { title: "标题", dataIndex: "title", key: "title", ellipsis: true },
    {
      title: "标签", key: "tags", width: 200,
      render: (_: any, r: KnowledgeItem) => (
        <Space size={2} wrap>
          {(r.tags || []).map(t => <Tag key={t} color="cyan" style={{ fontSize: 11 }}>{t}</Tag>)}
        </Space>
      )
    },
    { title: "来源", dataIndex: "sourceType", key: "source", width: 100,
      render: (v: string) => v === "manual_import" ? "手动导入" : v === "auto_extract" ? "自动提取" : "迭代" },
    { title: "复用", dataIndex: "reuseCount", key: "reuse", width: 60 },
    { title: "版本", dataIndex: "version", key: "version", width: 70 },
    {
      title: "操作", key: "op", width: 160,
      render: (_: any, r: KnowledgeItem) => (
        <Space>
          <Tooltip title="标记为复用"><Button size="small" icon={<ExperimentOutlined />} onClick={() => handleReuse(r.id)} /></Tooltip>
          <Button size="small" icon={<FileTextOutlined />} onClick={() => { setIterTarget(r); iterForm.resetFields(); setIterModal(true); }}>
            迭代
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Paragraph>
        <p>📚 <Text strong>结构化全域智能知识库</Text> — 三级分层架构（公共/项目/工单），支持自动打标、目标检索、迭代管理。</p>
      </Paragraph>

      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}><Card size="small"><Statistic title="知识总数" value={stats.total} prefix={<BookOutlined />} /></Card></Col>
          <Col span={4}><Card size="small"><Statistic title="公共知识" value={stats.byLevel.public || 0} valueStyle={{ color: "#52c41a" }} /></Card></Col>
          <Col span={4}><Card size="small"><Statistic title="项目知识" value={stats.byLevel.project || 0} valueStyle={{ color: "#1890ff" }} /></Card></Col>
          <Col span={4}><Card size="small"><Statistic title="工单知识" value={stats.byLevel.ticket || 0} valueStyle={{ color: "#722ed1" }} /></Card></Col>
          <Col span={4}><Card size="small"><Statistic title="总复用次数" value={stats.totalReuse} prefix={<ExperimentOutlined />} /></Card></Col>
          <Col span={4}><Card size="small"><Statistic title="迭代次数" value={stats.totalIterations} prefix={<ReloadOutlined />} /></Card></Col>
        </Row>
      )}

      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>创建知识</Button>
        <Button icon={<ImportOutlined />} onClick={() => setImportModal(true)}>批量导入</Button>
        <Input.Search
          placeholder="搜索知识..."
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onSearch={loadList}
          style={{ width: 300 }}
          prefix={<SearchOutlined />}
        />
      </Space>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        { key: "public", label: <span><BookOutlined /> 公共知识</span> },
        { key: "project", label: <span><AimOutlined /> 项目知识</span> },
        { key: "ticket", label: <span><LinkOutlined /> 工单知识</span> }
      ]} />

      <Table rowKey="id" dataSource={list} columns={columns} loading={loading} size="small" />

      {/* 创建知识 */}
      <Modal open={createModal} onCancel={() => setCreateModal(false)} title="创建知识条目"
        onOk={handleCreate} confirmLoading={creating}>
        <Form form={createForm} layout="vertical">
          <Form.Item name="projectId" label="项目ID（可选）"><Input placeholder="留空=公共知识" type="number" /></Form.Item>
          <Form.Item name="ticketId" label="工单ID（可选）"><Input placeholder="留空=项目/公共" type="number" /></Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true }]}><TextArea rows={4} /></Form.Item>
          <Form.Item name="tagsStr" label="标签（逗号分隔，可选）"><Input placeholder="如：架构,安全,设计" /></Form.Item>
        </Form>
      </Modal>

      {/* 批量导入 */}
      <Modal open={importModal} onCancel={() => setImportModal(false)} title="批量导入知识"
        onOk={handleImport} confirmLoading={importing}>
        <Form form={importForm} layout="vertical">
          <Form.Item name="rawText" label="原始文本（每行一条，标题|内容）" rules={[{ required: true }]}>
            <TextArea rows={6} placeholder={"架构设计规范|系统采用前后端分离架构\n编码规范|统一使用TypeScript严格模式\n部署流程|使用Docker容器化部署"} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 知识迭代 */}
      <Modal open={iterModal} onCancel={() => setIterModal(false)} title={`迭代知识: ${iterTarget?.title || ""} (${iterTarget?.version})`}
        onOk={handleIterate} confirmLoading={iterating}>
        <Form form={iterForm} layout="vertical">
          <Form.Item name="newContent" label="新版本内容" rules={[{ required: true }]}>
            <TextArea rows={5} placeholder={iterTarget?.content} />
          </Form.Item>
          <Form.Item name="changeNote" label="变更说明"><Input placeholder="如：更新部署流程步骤" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
