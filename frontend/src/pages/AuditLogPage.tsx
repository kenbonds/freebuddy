import { useEffect, useState } from "react";
import { Table, Button } from "antd";
import request from "../api/request";
import type { ApiRes } from "../types/global";
import { CN_TEXT } from "../constants/cnText";

interface AuditRow {
  id: number;
  logType: string;
  content: string;
  timestamp: string;
}

export default function AuditLogPage() {
  const [data, setData] = useState<AuditRow[]>([]);

  const refresh = async () => {
    const res = await request.get<ApiRes<AuditRow[]>>("/audit/list");
    setData(res.data.data ?? []);
  };

  useEffect(() => {
    refresh();
  }, []);

  const columns = [
    { title: CN_TEXT.table.id, dataIndex: "id", key: "id" },
    { title: CN_TEXT.table.logType, dataIndex: "logType", key: "logType" },
    { title: CN_TEXT.table.logContent, dataIndex: "content", key: "content" },
    { title: CN_TEXT.table.time, dataIndex: "timestamp", key: "timestamp" }
  ];

  return (
    <>
      <Button onClick={refresh} style={{ marginBottom: 16 }}>{CN_TEXT.btn.refresh}</Button>
      <Table rowKey="id" dataSource={data} columns={columns} scroll={{ x: "max-content" }} />
    </>
  );
}
