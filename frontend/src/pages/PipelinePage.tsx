import { useEffect, useState } from "react";
import {
  Button, Table, Modal, Form, Input, Select, Switch, Tag, message,
  Typography, Tabs, Badge, Space
} from "antd";
import request from "../api/request";
import type { ApiRes, QAReportItem } from "../types/global";

const { Paragraph, Title } = Typography;

// ============ 质检规则接口 ============
interface QARuleItem {
  id: number;
  ruleName: string;
  ruleType: string;
  severity: string;
  enabled: boolean;
  configJson: string;
  description: string;
}

const ruleTypeOpts = [
  { value: "type_check", label: "类型检查" },
  { value: "unit_test", label: "单元测试" },
  { value: "security_scan", label: "安全扫描" },
  { value: "e2e_test", label: "E2E测试" },
  { value: "build_check", label: "构建检查" },
];
const severityColor: Record<string, string> = { critical: "red", major: "orange", minor: "blue" };

// ============ 质检报告颜色 ============
const resultColor: Record<string, string> = {
  pass: "green",
  minor_issue: "gold",
  major_issue: "red"
};
const resultLabel: Record<string, string> = {
  pass: "✅ 合格通过",
  minor_issue: "⚠️ 轻微瑕疵",
  major_issue: "❌ 严重不合格"
};

// ============ 组件 ============
export default function PipelinePage() {
  const [activeTab, setActiveTab] = useState("rules");

  return (
    <div>
      <Paragraph>
        <p>📋 质检流水线 — 工单执行完成后自动触发门禁校验，支持自定义规则配置与报告查看。</p>
      </Paragraph>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        { key: "rules", label: "质检规则管理", children: <RulesTab /> },
        { key: "reports", label: "质检报告", children: <ReportsTab /> },
      ]} />
    </div>
  );
}

// ============ 质检规则管理 Tab ============
function RulesTab() {
  const [list, setList] = useState<QARuleItem[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    const res = await request.get<ApiRes<QARuleItem[]>>("/qa/list");
    setList(res.data ?? []);
  };

  useEffect(() => { load(); }, []);

  const addRule = async () => {
    const vals = await form.validateFields();
    vals.configJson = "{}";
    const res = await request.post<ApiRes<QARuleItem>>("/qa/add", vals);
    if (res.code === 0) { message.success("规则创建成功"); setOpen(false); form.resetFields(); load(); }
    else message.error(res.msg);
  };

  const toggleRule = async (id: number) => {
    const res = await request.post<ApiRes<QARuleItem>>("/qa/toggle", { id });
    if (res.code === 0) { message.success(res.msg); load(); }
    else message.error(res.msg);
  };

  const delRule = async (id: number) => {
    await request.delete(`/qa/${id}`);
    message.success("已删除");
    load();
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    { title: "规则名称", dataIndex: "ruleName", key: "ruleName" },
    { title: "类型", dataIndex: "ruleType", key: "ruleType" },
    { title: "严重级别", dataIndex: "severity", key: "severity", render: (s: string) => <Tag color={severityColor[s]}>{s}</Tag> },
    { title: "状态", key: "enabled", render: (r: QARuleItem) => <Switch checked={r.enabled} onClick={() => toggleRule(r.id)} /> },
    { title: "描述", dataIndex: "description", key: "description", ellipsis: true },
    { title: "操作", key: "op", render: (r: QARuleItem) => <Button danger size="small" onClick={() => delRule(r.id)}>删除</Button> }
  ];

  return (
    <div>
      <Button type="primary" onClick={() => setOpen(true)} style={{ marginBottom: 16 }}>新增规则</Button>
      <Table rowKey="id" dataSource={list} columns={columns} />
      <Modal open={open} onCancel={() => setOpen(false)} onOk={addRule} title="新增质检规则">
        <Form form={form} layout="vertical">
          <Form.Item name="ruleName" label="规则名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="ruleType" label="规则类型" rules={[{ required: true }]}>
            <Select options={ruleTypeOpts} />
          </Form.Item>
          <Form.Item name="severity" label="严重级别" rules={[{ required: true }]}>
            <Select options={[{value:"critical",label:"严重"},{value:"major",label:"主要"},{value:"minor",label:"轻微"}]} />
          </Form.Item>
          <Form.Item name="description" label="规则描述" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ============ 质检报告 Tab ============
function ReportsTab() {
  const [list, setList] = useState<QAReportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [resultFilter, setResultFilter] = useState<string | undefined>(undefined);
  const [detailReport, setDetailReport] = useState<QAReportItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const pageSize = 20;

  const load = async (p: number, rf?: string) => {
    let url = `/qaPipeline/list?page=${p}&pageSize=${pageSize}`;
    if (rf) url += `&result=${rf}`;
    const res = await request.get<ApiRes<{ list: QAReportItem[]; total: number }>>(url);
    if (res.code === 0 && res.data) {
      setList(res.data.list);
      setTotal(res.data.total);
    }
  };

  useEffect(() => { load(page, resultFilter); }, [page, resultFilter]);

  const viewDetail = async (report: QAReportItem) => {
    setDetailReport(report);
    setDetailOpen(true);
  };

  const handleManualRun = async () => {
    const ticketId = prompt("请输入要触发的工单ID：");
    if (!ticketId) return;
    const res = await request.post<ApiRes<unknown>>(`/qaPipeline/run/${ticketId}`);
    if (res.code === 0) {
      message.success("质检流水线执行完成");
      load(page, resultFilter);
    } else {
      message.error(res.msg);
    }
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    { title: "工单ID", dataIndex: "ticketId", key: "ticketId", width: 80 },
    { title: "结果", dataIndex: "result", key: "result", width: 120,
      render: (r: string) => <Badge color={resultColor[r]} text={resultLabel[r] || r} />
    },
    { title: "摘要", dataIndex: "summary", key: "summary", ellipsis: true },
    { title: "触发方式", dataIndex: "triggeredBy", key: "triggeredBy", width: 100,
      render: (t: string) => t === "auto" ? <Tag color="blue">自动</Tag> : <Tag color="orange">手动</Tag>
    },
    { title: "时间", dataIndex: "createdAt", key: "createdAt", width: 180, render: (t: string) => new Date(t).toLocaleString() },
    { title: "操作", key: "op", width: 100,
      render: (r: QAReportItem) => <Button size="small" onClick={() => viewDetail(r)}>查看报告</Button>
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          allowClear placeholder="筛选结果"
          style={{ width: 150 }}
          value={resultFilter}
          onChange={(v) => { setResultFilter(v); setPage(1); }}
          options={[
            { value: "pass", label: "✅ 合格通过" },
            { value: "minor_issue", label: "⚠️ 轻微瑕疵" },
            { value: "major_issue", label: "❌ 严重不合格" },
          ]}
        />
        <Button onClick={handleManualRun}>手动触发质检</Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={list}
        columns={columns}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: setPage,
          showTotal: (t) => `共 ${t} 条`
        }}
      />
      <Modal
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        title="质检报告详情"
        width={800}
        footer={<Button onClick={() => setDetailOpen(false)}>关闭</Button>}
      >
        {detailReport && (
          <div>
            <p><strong>工单ID：</strong>{detailReport.ticketId}</p>
            <p><strong>结果：</strong>
              <Badge color={resultColor[detailReport.result]} text={resultLabel[detailReport.result]} />
            </p>
            <p><strong>摘要：</strong>{detailReport.summary}</p>
            <p><strong>触发方式：</strong>{detailReport.triggeredBy === "auto" ? "自动触发" : "手动触发"}</p>
            <p><strong>检测时间：</strong>{new Date(detailReport.createdAt).toLocaleString()}</p>
            <hr />
            <div style={{
              background: "#f5f5f5",
              padding: 16,
              borderRadius: 6,
              whiteSpace: "pre-wrap",
              fontFamily: "monospace",
              fontSize: 13,
              maxHeight: 400,
              overflow: "auto"
            }}>
              {detailReport.reportContent}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
