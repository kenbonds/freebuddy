import { useEffect, useState } from "react";
import { Button, Table, Modal, Form, Input, Select, message } from "antd";
import request from "../api/request";
import type { ApiRes, ProjectItem, TicketItem } from "../types/global";
import { CN_TEXT } from "../constants/cnText";

const roleOptions = [
  { label: CN_TEXT.agentRole.arch, value: "架构规划员" },
  { label: CN_TEXT.agentRole.dev, value: "开发执行员" },
  { label: CN_TEXT.agentRole.test, value: "测试校验员" },
  { label: CN_TEXT.agentRole.ops, value: "运维部署员" },
  { label: CN_TEXT.agentRole.doc, value: "文档归档员" },
  { label: CN_TEXT.agentRole.claw, value: "工单管控引擎" },
];

export default function TicketList() {
  const [projectList, setProjectList] = useState<ProjectItem[]>([]);
  const [currProjId, setCurrProjId] = useState<number | null>(null);
  const [ticketList, setTicketList] = useState<TicketItem[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();

  const loadProjects = async () => {
    const res = await request.get<ApiRes<ProjectItem[]>>("/project/list");
    setProjectList(res.data.data ?? []);
  };

  const loadTickets = async (pid: number) => {
    setCurrProjId(pid);
    const res = await request.get<ApiRes<TicketItem[]>>(`/ticket/list/${pid}`);
    setTicketList(res.data.data ?? []);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const createTicket = async () => {
    const vals = await form.validateFields();
    const res = await request.post("/ticket/create", { ...vals, projectId: currProjId });
    if (res.data.code === 0) {
      message.success("工单创建完成");
      setCreateOpen(false);
      form.resetFields();
      loadTickets(currProjId!);
    } else message.error(res.data.msg);
  };

  const operate = async (ticketId: number, action: string, payload?: Record<string, unknown>) => {
    const res = await request.post(`/ticket/${action}`, { ticketId, ...payload });
    if (res.data.code === 0) {
      message.success("操作成功");
      loadTickets(currProjId!);
    } else message.error(res.data.msg);
  };

  const columns = [
    { title: CN_TEXT.table.id, dataIndex: "id", key: "id" },
    { title: "标题", dataIndex: "title", key: "title" },
    { title: "状态", dataIndex: "status", key: "status" },
    { title: "指派角色", dataIndex: "assignRole", key: "assignRole" },
    { title: "创建时间", dataIndex: "createdAt", key: "createdAt" },
    {
      title: CN_TEXT.table.operate,
      key: "op",
      render: (row: TicketItem) => {
        if (row.status === "待认领") {
          return (
            <Select
              placeholder="指派角色"
              options={roleOptions}
              onChange={(v) => operate(row.id, "assign", { targetRole: v })}
            />
          );
        }
        if (row.status === "处理中") {
          return (
            <Button size="small" onClick={() => operate(row.id, "submitReview")}>
              {CN_TEXT.btn.submitReview}
            </Button>
          );
        }
        if (row.status === "待复核") {
          return (
            <>
              <Button size="small" danger onClick={() => operate(row.id, "reject", { reason: "复核不通过" })}>
                {CN_TEXT.btn.reject}
              </Button>
              <Button size="small" type="primary" onClick={() => operate(row.id, "finish")}>
                {CN_TEXT.btn.finish}
              </Button>
            </>
          );
        }
        return <span>不可操作</span>;
      }
    }
  ];

  return (
    <div>
      <Select
        placeholder="选择项目查看工单"
        options={projectList.map(p => ({ label: p.projectName, value: p.id }))}
        onChange={(v) => loadTickets(v)}
        style={{ width: 320, marginBottom: 16 }}
      />
      {currProjId && (
        <Button type="primary" onClick={() => setCreateOpen(true)} style={{ marginBottom: 16, marginLeft: 8 }}>
          {CN_TEXT.btn.create}
        </Button>
      )}
      <Table rowKey="id" dataSource={ticketList} columns={columns} />
      <Modal open={createOpen} onCancel={() => setCreateOpen(false)} onOk={createTicket} title="新建工单">
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="工单标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="content" label="详细内容" rules={[{ required: true }]}>
            <Input.TextArea rows={5} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
