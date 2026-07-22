import { useEffect, useState, useCallback } from "react";
import { Table, Button, Select, Input, Space, message, Tag, Modal, Typography } from "antd";
import { DownloadOutlined, SafetyCertificateOutlined, ExpandOutlined } from "@ant-design/icons";
import request from "../api/request";
import type { ApiRes } from "../types/global";

const { Paragraph } = Typography;

interface AuditRow {
  id: number;
  logType: string;
  content: string;
  timestamp: string;
  operator: string;
  entityType: string;
  entityId: number | null;
  detail: string;
  prevHash: string;
}

interface AuditPageData {
  list: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AuditLogPage() {
  const [data, setData] = useState<AuditPageData>({ list: [], total: 0, page: 1, pageSize: 20 });
  const [types, setTypes] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string | undefined>();
  const [keyword, setKeyword] = useState("");
  const [verifyModal, setVerifyModal] = useState<{ visible: boolean; result: unknown }>({ visible: false, result: null });

  const refresh = useCallback(async (pageNum?: number) => {
    const params = new URLSearchParams();
    params.set("page", String(pageNum || data.page));
    params.set("pageSize", "20");
    if (filterType) params.set("logType", filterType);
    if (keyword.trim()) params.set("keyword", keyword.trim());
    const res = await request.get<ApiRes<AuditPageData>>(`/audit/list?${params.toString()}`);
    if (res.data) setData(res.data);
  }, [data.page, filterType, keyword]);

  const loadTypes = async () => {
    const res = await request.get<ApiRes<string[]>>("/audit/types");
    setTypes(res.data ?? []);
  };

  useEffect(() => { refresh(1); loadTypes(); }, []);
  useEffect(() => { refresh(1); }, [filterType]);

  // 全量导出
  const doExportAll = async () => {
    const params = new URLSearchParams();
    if (filterType) params.set("logType", filterType);
    if (keyword.trim()) params.set("keyword", keyword.trim());
    const res = await request.get<ApiRes<{ total: number; rows: AuditRow[] }>>(`/audit/exportAll?${params.toString()}`);
    if (!res.data) { message.error("导出失败"); return; }
    const rows = res.data.rows;
    const header = "ID\t类型\t操作人\t时间\t实体类型\t实体ID\t内容\t详情\n";
    const body = rows.map(r =>
      `${r.id}\t${r.logType}\t${r.operator}\t${r.timestamp}\t${r.entityType}\t${r.entityId ?? ""}\t${r.content}\t${r.detail}`
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_log_full_${new Date().toISOString().slice(0, 10)}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
    message.success(`已导出 ${rows.length} 条日志`);
  };

  // 当前页导出
  const doExportPage = () => {
    const rows = data.list.map(r =>
      `${r.id}\t${r.logType}\t${r.operator}\t${r.timestamp}\t${r.entityType}\t${r.entityId ?? ""}\t${r.content}\t${r.detail}`
    ).join("\n");
    const header = "ID\t类型\t操作人\t时间\t实体类型\t实体ID\t内容\t详情\n";
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_log_page_${new Date().toISOString().slice(0, 10)}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
    message.success("已导出当前页");
  };

  // 完整性校验
  const doVerify = async () => {
    const res = await request.get<ApiRes<unknown>>("/audit/verify");
    setVerifyModal({ visible: true, result: res.data });
  };

  const logTypeColors: Record<string, string> = {
    system: "blue", project: "green", ticket: "cyan", qa: "orange",
    archive: "purple", role: "geekblue", ai: "red", websocket: "default",
    ai_gateway_error: "red", agent_prompt: "lime", archive_upload_trigger: "purple"
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    { title: "类型", dataIndex: "logType", key: "logType", width: 130,
      render: (v: string) => <Tag color={logTypeColors[v] || "default"}>{v}</Tag> },
    { title: "操作人", dataIndex: "operator", key: "operator", width: 100 },
    { title: "时间", dataIndex: "timestamp", key: "timestamp", width: 180 },
    { title: "内容", dataIndex: "content", key: "content", ellipsis: true }
  ];

  const verifyResult = verifyModal.result as { allValid?: boolean; files?: Array<{ date: string; valid: boolean; total: number; brokenAt?: number }> } | null;

  return (
    <div>
      <Paragraph>
        <p>🔒 全链路审计日志 — 所有操作均持久化记录，文件日志带 SHA256 链式校验，不可篡改。</p>
      </Paragraph>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="按类型筛选" allowClear style={{ width: 160 }}
          options={types.map(t => ({ label: t, value: t }))}
          onChange={(v) => setFilterType(v || undefined)}
        />
        <Input.Search placeholder="搜索关键词" value={keyword} onChange={e => setKeyword(e.target.value)}
          onSearch={() => refresh(1)} enterButton style={{ width: 260 }} />
        <Button onClick={() => refresh()} icon={<ExpandOutlined />}>刷新</Button>
        <Button onClick={doExportPage} icon={<DownloadOutlined />}>导出当前页</Button>
        <Button onClick={doExportAll} icon={<DownloadOutlined />} type="primary">全量导出</Button>
        <Button onClick={doVerify} icon={<SafetyCertificateOutlined />}>完整性校验</Button>
      </Space>
      <Table
        rowKey="id" dataSource={data.list} columns={columns}
        scroll={{ x: "max-content" }}
        pagination={{
          current: data.page, total: data.total, pageSize: data.pageSize,
          onChange: (p) => refresh(p),
          showTotal: (t) => `共 ${t} 条`
        }}
      />
      <Modal
        title={<span><SafetyCertificateOutlined /> 审计日志完整性校验</span>}
        open={verifyModal.visible}
        onCancel={() => setVerifyModal({ visible: false, result: null })}
        footer={<Button onClick={() => setVerifyModal({ visible: false, result: null })}>关闭</Button>}
      >
        {verifyResult && (
          <div>
            <p>
              状态:{" "}
              {verifyResult.allValid
                ? <Tag color="green">✅ 日志完整，未被篡改</Tag>
                : <Tag color="red">❌ 日志可能被篡改</Tag>}
            </p>
            <p>共校验 {verifyResult.files?.length ?? 0} 个日志文件：</p>
            {verifyResult.files?.map(f => (
              <p key={f.date}>
                📄 {f.date}.log — {f.valid
                  ? <Tag color="green">✓ 完整 ({f.total}条)</Tag>
                  : <Tag color="red">✗ 中断于第{f.brokenAt}行</Tag>}
              </p>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
