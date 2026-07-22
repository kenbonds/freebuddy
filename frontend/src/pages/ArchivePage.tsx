import { useEffect, useState } from "react";
import { Button, Table, Tag, message, Badge, Space, Modal, Typography, Tooltip } from "antd";
import { DownloadOutlined, HistoryOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import request from "../api/request";
import type { ApiRes, ProjectItem, ArchiveCondition, ProjectExportData } from "../types/global";
import { CN_TEXT } from "../constants/cnText";

const { Paragraph, Title } = Typography;

export default function ArchivePage() {
  const [list, setList] = useState<ProjectItem[]>([]);
  const [conditions, setConditions] = useState<Record<number, ArchiveCondition | null>>({});
  const [exportModal, setExportModal] = useState<{ visible: boolean; data: ProjectExportData | null }>({ visible: false, data: null });

  const load = async () => {
    const res = await request.get<ApiRes<ProjectItem[]>>("/project/list");
    setList(res.data ?? []);
    // 加载每个项目的归档条件
    if (res.data) {
      for (const p of res.data) {
        if (!p.archived) {
          loadCondition(p.id);
        }
      }
    }
  };

  const loadCondition = async (pid: number) => {
    const res = await request.get<ApiRes<ArchiveCondition>>(`/archive/check/${pid}`);
    if (res.code === 0 && res.data) {
      setConditions(prev => ({ ...prev, [pid]: res.data! }));
    }
  };

  useEffect(() => { load(); }, []);

  const doArchive = async (pid: number) => {
    const res = await request.post<ApiRes<string>>("/project/archive", { id: pid });
    if (res.code === 0) {
      message.success(res.msg);
      load();
    } else message.error(res.msg);
  };

  const doUnarchive = async (pid: number) => {
    const res = await request.post<ApiRes<ProjectItem>>("/project/unarchive", { id: pid });
    if (res.code === 0) { message.success(res.msg); load(); }
    else message.error(res.msg);
  };

  const doExport = async (pid: number) => {
    const res = await request.get<ApiRes<ProjectExportData>>(`/archive/export/${pid}`);
    if (res.code === 0 && res.data) {
      setExportModal({ visible: true, data: res.data });
    } else {
      message.error(res.msg || "导出失败");
    }
  };

  const downloadExport = () => {
    if (!exportModal.data) return;
    const blob = new Blob([JSON.stringify(exportModal.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project_${exportModal.data.project?.id}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success("已下载导出文件");
  };

  const renderCondition = (pid: number, archived: boolean) => {
    if (archived) return <Tag color="blue">已归档锁定</Tag>;
    const cond = conditions[pid];
    if (!cond) return <Tag color="default">检查中...</Tag>;
    if (cond.canArchive) return <Tag color="green" icon={<CheckCircleOutlined />}>可归档</Tag>;
    return (
      <Tooltip title={
        <div>
          {!cond.allTicketsDone && <div>⚠️ {cond.unfinishedCount} 个工单未办结</div>}
          {!cond.allQaPassed && <div>❌ {cond.qaFailedCount} 个工单质检不合格</div>}
        </div>
      }>
        <Tag color="orange" icon={<CloseCircleOutlined />}>条件未满足</Tag>
      </Tooltip>
    );
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    { title: "项目名称", dataIndex: "projectName", key: "projectName" },
    { title: "优先级", dataIndex: "priority", key: "priority", width: 80 },
    {
      title: "归档状态", key: "arch", width: 140,
      render: (r: ProjectItem) => renderCondition(r.id, r.archived)
    },
    { title: "归档路径", dataIndex: "archivePath", key: "archivePath", ellipsis: true },
    {
      title: "操作", key: "op", width: 200,
      render: (r: ProjectItem) => (
        <Space>
          {r.archived ? (
            <>
              <Button size="small" icon={<DownloadOutlined />} onClick={() => doExport(r.id)}>导出</Button>
              <Button size="small" onClick={() => doUnarchive(r.id)}>解封</Button>
            </>
          ) : (
            <>
              <Button size="small" icon={<DownloadOutlined />} onClick={() => doExport(r.id)}>导出</Button>
              <Button
                size="small"
                type="primary"
                danger
                disabled={!conditions[r.id]?.canArchive}
                onClick={() => doArchive(r.id)}
              >
                {CN_TEXT.btn.archive}
              </Button>
            </>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <Paragraph>
        <p>📦 项目归档管理 — 归档需满足条件：所有工单已办结 + 所有质检合格通过。</p>
      </Paragraph>
      <Table
        rowKey="id"
        dataSource={list}
        columns={columns}
      />
      <Modal
        open={exportModal.visible}
        onCancel={() => setExportModal({ visible: false, data: null })}
        title={
          <span><HistoryOutlined /> 项目溯源数据</span>
        }
        width={700}
        footer={
          <Space>
            <Button onClick={() => setExportModal({ visible: false, data: null })}>关闭</Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={downloadExport}>下载 JSON</Button>
          </Space>
        }
      >
        {exportModal.data && (
          <div>
            <p><strong>项目：</strong>{exportModal.data.project?.projectName} (ID: {exportModal.data.project?.id})</p>
            <p><strong>导出时间：</strong>{new Date(exportModal.data.exportedAt).toLocaleString()}</p>
            <p><strong>关联工单：</strong>{exportModal.data.tickets.length} 条</p>
            <p><strong>质检报告：</strong>{exportModal.data.qaReports.length} 条</p>
            <p><strong>审计日志：</strong>{exportModal.data.auditLogs.length} 条</p>
            <Paragraph type="secondary">点击「下载 JSON」获取完整导出文件，包含项目全生命周期数据，可用于溯源复盘。</Paragraph>
          </div>
        )}
      </Modal>
    </div>
  );
}
