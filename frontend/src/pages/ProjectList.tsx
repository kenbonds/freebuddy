import { useEffect, useState } from "react";
import { Button, Table, Modal, Form, Input, message } from "antd";
import request from "../api/request";
import type { ApiRes, ProjectItem } from "../types/global";
import { CN_TEXT } from "../constants/cnText";

export default function ProjectList() {
  const [list, setList] = useState<ProjectItem[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const refresh = async () => {
    const res = await request.get<ApiRes<ProjectItem[]>>("/project/list");
    setList(res.data.data ?? []);
  };

  useEffect(() => {
    refresh();
  }, []);

  const onCreate = async () => {
    const values = await form.validateFields();
    const res = await request.post<ApiRes<ProjectItem>>("/project/create", values);
    if (res.data.code === 0) {
      message.success("创建成功");
      setOpen(false);
      form.resetFields();
      refresh();
    } else {
      message.error(res.data.msg);
    }
  };

  const columns = [
    { title: CN_TEXT.table.id, dataIndex: "id", key: "id" },
    { title: CN_TEXT.table.name, dataIndex: "projectName", key: "projectName" },
    { title: CN_TEXT.table.desc, dataIndex: "description", key: "description" },
    { title: CN_TEXT.table.status, key: "archived", render: (r: ProjectItem) => r.archived ? "已归档" : "正常" },
    { title: CN_TEXT.table.createTime, dataIndex: "createdAt", key: "createdAt" }
  ];

  return (
    <div>
      <Button type="primary" onClick={() => setOpen(true)} style={{ marginBottom: 16 }}>
        {CN_TEXT.btn.create}
      </Button>
      <Table rowKey="id" dataSource={list} columns={columns} />
      <Modal open={open} onCancel={() => setOpen(false)} onOk={onCreate} title="新建项目">
        <Form form={form} layout="vertical">
          <Form.Item name="projectName" label="项目名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="项目描述" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
