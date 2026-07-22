import { useEffect, useState } from "react";
import { Button, Table, Modal, Form, Input, Select, message, Tag } from "antd";
import request from "../api/request";
import type { ApiRes, ProjectItem } from "../types/global";
import { CN_TEXT } from "../constants/cnText";

export default function ProjectList() {
  const [list, setList] = useState<ProjectItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<ProjectItem | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const refresh = async () => {
    const res = await request.get<ApiRes<ProjectItem[]>>("/project/list");
    setList(res.data ?? []);
  };

  useEffect(() => { refresh(); }, []);

  const onCreate = async () => {
    const values = await form.validateFields();
    const res = await request.post<ApiRes<ProjectItem>>("/project/create", values);
    if (res.code === 0) {
      message.success("创建成功");
      setOpen(false);
      form.resetFields();
      refresh();
    } else message.error(res.msg);
  };

  const onEdit = async () => {
    const values = await editForm.validateFields();
    const res = await request.post<ApiRes<ProjectItem>>("/project/edit", { id: editItem!.id, ...values });
    if (res.code === 0) {
      message.success("更新成功");
      setEditOpen(false);
      setEditItem(null);
      refresh();
    } else message.error(res.msg);
  };

  const doArchive = async (id: number) => {
    const res = await request.post<ApiRes<string>>("/project/archive", { id });
    if (res.code === 0) {
      message.success(res.msg);
      refresh();
    } else message.error(res.msg);
  };

  const doUnarchive = async (id: number) => {
    const res = await request.post<ApiRes<ProjectItem>>("/project/unarchive", { id });
    if (res.code === 0) { message.success(res.msg); refresh(); }
    else message.error(res.msg);
  };

  const openEdit = (item: ProjectItem) => {
    setEditItem(item);
    editForm.setFieldsValue({ projectName: item.projectName, description: item.description, priority: item.priority });
    setEditOpen(true);
  };

  const priColor: Record<string, string> = { P0: "red", P1: "orange", P2: "blue", P3: "default" };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    { title: "项目名称", dataIndex: "projectName", key: "projectName" },
    { title: "描述", dataIndex: "description", key: "description", ellipsis: true },
    { title: "优先级", dataIndex: "priority", key: "priority", render: (p: string) => <Tag color={priColor[p] || "default"}>{p}</Tag> },
    { title: "状态", key: "status", render: (r: ProjectItem) => r.archived ? <Tag color="blue">已归档</Tag> : r.abnormal ? <Tag color="red">异常</Tag> : <Tag color="green">正常</Tag> },
    { title: "创建时间", dataIndex: "createdAt", key: "createdAt" },
    {
      title: "操作", key: "op", width: 200,
      render: (r: ProjectItem) => (
        <>
          <Button size="small" disabled={r.archived} onClick={() => openEdit(r)} style={{ marginRight: 4 }}>编辑</Button>
          {r.archived
            ? <Button size="small" onClick={() => doUnarchive(r.id)}>解封</Button>
            : <Button size="small" danger onClick={() => doArchive(r.id)}>归档</Button>
          }
        </>
      )
    }
  ];

  return (
    <div>
      <Button type="primary" onClick={() => setOpen(true)} style={{ marginBottom: 16 }}>
        {CN_TEXT.btn.create}
      </Button>
      <Table rowKey="id" dataSource={list} columns={columns} />
      <Modal open={open} onCancel={() => setOpen(false)} onOk={onCreate} title="新建项目">
        <Form form={form} layout="vertical">
          <Form.Item name="projectName" label="项目名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="项目描述" rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item>
          <Form.Item name="priority" label="优先级">
            <Select options={[{ value: "P0", label: "P0 紧急" }, { value: "P1", label: "P1 高" }, { value: "P2", label: "P2 中" }, { value: "P3", label: "P3 低" }]} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal open={editOpen} onCancel={() => { setEditOpen(false); setEditItem(null); }} onOk={onEdit} title="编辑项目">
        <Form form={editForm} layout="vertical">
          <Form.Item name="projectName" label="项目名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="项目描述" rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item>
          <Form.Item name="priority" label="优先级">
            <Select options={[{ value: "P0", label: "P0 紧急" }, { value: "P1", label: "P1 高" }, { value: "P2", label: "P2 中" }, { value: "P3", label: "P3 低" }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
