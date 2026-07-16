import { useEffect, useState } from "react";
import { Button, Table, message } from "antd";
import request from "../api/request";
import type { ApiRes, ProjectItem } from "../types/global";
import { CN_TEXT } from "../constants/cnText";

export default function ArchivePage() {
  const [list, setList] = useState<ProjectItem[]>([]);

  const load = async () => {
    const res = await request.get<ApiRes<ProjectItem[]>>("/project/list");
    setList(res.data.data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const doArchive = async (pid: number) => {
    const res = await request.post<ApiRes<string>>("/archive/doArchive", { projectId: pid });
    if (res.data.code === 0) {
      message.success("归档完成并设置目录只读锁定，自动触发规则脱敏上传");
      load();
    } else {
      message.error(res.data.msg);
    }
  };

  const columns = [
    { title: CN_TEXT.table.id, dataIndex: "id", key: "id" },
    { title: CN_TEXT.table.name, dataIndex: "projectName", key: "projectName" },
    { title: "归档状态", key: "arch", render: (r: ProjectItem) => r.archived ? "已归档锁定" : "未归档" },
    { title: "归档文件路径", dataIndex: "archivePath", key: "archivePath" },
    {
      title: CN_TEXT.table.operate,
      key: "arc",
      render: (r: ProjectItem) => !r.archived && (
        <Button type="primary" danger onClick={() => doArchive(r.id)}>
          {CN_TEXT.btn.archive}
        </Button>
      )
    }
  ];

  return <Table rowKey="id" dataSource={list} columns={columns} />;
}
