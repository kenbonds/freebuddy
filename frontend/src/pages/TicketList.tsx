import { useEffect, useState } from "react";
import { Button, Table, Modal, Form, Input, Select, message, Tag } from "antd";
import request from "../api/request";
import type { ApiRes, ProjectItem, TicketItem } from "../types/global";
import { CN_TEXT } from "../constants/cnText";

const statusColor: Record<string, string> = {
  "待认领": "default", "待执行": "orange", "处理中": "processing",
  "待复核": "blue", "测试驳回": "red", "已办结": "green", "归档封存": "purple"
};

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
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<TicketItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<TicketItem | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const loadProjects = async () => {
    const res = await request.get<ApiRes<ProjectItem[]>>("/project/list");
    setProjectList(res.data ?? []);
  };

  const loadTickets = async (pid: number) => {
    setCurrProjId(pid);
    const res = await request.get<ApiRes<TicketItem[]>>(`/ticket/list/${pid}`);
    setTicketList(res.data ?? []);
  };

  useEffect(() => { loadProjects(); }, []);

  const createTicket = async () => {
    const vals = await form.validateFields();
    const res = await request.post<ApiRes<TicketItem>>("/ticket/create", { ...vals, projectId: currProjId });
    if (res.code === 0) {
      message.success("工单创建完成");
      setCreateOpen(false);
      form.resetFields();
      loadTickets(currProjId!);
    } else message.error(res.msg);
  };

  const operate = async (ticketId: number, action: string, payload?: Record<string, unknown>) => {
    const res = await request.post<ApiRes<null>>(`/ticket/${action}`, { ticketId, ...payload });
    if (res.code === 0) {
      message.success("操作成功");
      loadTickets(currProjId!);
    } else message.error(res.msg);
  };

  const onEdit = async () => {
    const vals = await editForm.validateFields();
    const res = await request.post<ApiRes<TicketItem>>("/ticket/edit", { ticketId: editItem!.id, ...vals });
    if (res.code === 0) {
      message.success("工单已更新");
      setEditOpen(false);
      setEditItem(null);
      loadTickets(currProjId!);
    } else message.error(res.msg);
  };

  const openDetail = async (item: TicketItem) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  const columns = [
    { title: "#", dataIndex: "id", key: "id", width: 50 },
    { title: "标题", dataIndex: "title", key: "title" },
    { title: "优先级", dataIndex: "priority", key: "priority", width: 80,
      render: (p: string) => <Tag color={({P0:"red",P1:"orange",P2:"blue",P3:"default"})[p]||"default"}>{p}</Tag>
    },
    { title: "状态", dataIndex: "status", key: "status", width: 100,
      render: (s: string) => <Tag color={statusColor[s] || "default"}>{s}</Tag>
    },
    { title: "指派角色", dataIndex: "assignRole", key: "assignRole", width: 120 },
    { title: "创建时间", dataIndex: "createdAt", key: "createdAt", width: 160 },
    {
      title: "操作", key: "op", width: 300,
      render: (row: TicketItem) => {
        const btns: JSX.Element[] = [];
        btns.push(<Button key="detail" size="small" onClick={() => openDetail(row)} style={{marginRight:4}}>详情</Button>);
        if (row.status === "待认领") {
          btns.push(
            <Select key="assign" size="small" placeholder="指派角色" options={roleOptions}
              onChange={(v) => operate(row.id, "assign", { targetRole: v })} style={{ width: 120 }} />
          );
        }
        if (row.status === "待执行") {
          btns.push(<Button key="start" size="small" type="primary" onClick={() => operate(row.id, "startExecute")} style={{marginRight:4}}>开始执行</Button>);
        }
        if (row.status === "处理中") {
          btns.push(<Button key="review" size="small" onClick={() => operate(row.id, "submitReview")} style={{marginRight:4}}>{CN_TEXT.btn.submitReview}</Button>);
        }
        if (row.status === "待复核") {
          btns.push(
            <Button key="reject" size="small" danger onClick={() => operate(row.id, "reject", { reason: "复核不通过" })} style={{marginRight:4}}>{CN_TEXT.btn.reject}</Button>,
            <Button key="finish" size="small" type="primary" onClick={() => operate(row.id, "finish")} style={{marginRight:4}}>{CN_TEXT.btn.finish}</Button>
          );
        }
        if (row.status === "测试驳回") {
          btns.push(<Button key="resubmit" size="small" onClick={() => operate(row.id, "resubmit")} style={{marginRight:4}}>重新提交</Button>);
        }
        if (!["已办结", "归档封存"].includes(row.status)) {
          btns.push(
            <Button key="edit" size="small" onClick={() => { setEditItem(row); editForm.setFieldsValue({title:row.title,content:row.content,priority:row.priority}); setEditOpen(true); }} style={{marginRight:4}}>编辑</Button>,
            <Button key="del" size="small" danger onClick={() => operate(row.id, "delete")}>删除</Button>
          );
        }
        return <>{btns}</>;
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
      {/* 创建弹窗 */}
      <Modal open={createOpen} onCancel={() => setCreateOpen(false)} onOk={createTicket} title="新建工单">
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="工单标题" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="content" label="详细内容" rules={[{ required: true }]}><Input.TextArea rows={5} /></Form.Item>
          <Form.Item name="priority" label="优先级">
            <Select options={[{value:"P0",label:"P0 紧急"},{value:"P1",label:"P1 高"},{value:"P2",label:"P2 中"},{value:"P3",label:"P3 低"}]} />
          </Form.Item>
        </Form>
      </Modal>
      {/* 编辑弹窗 */}
      <Modal open={editOpen} onCancel={() => { setEditOpen(false); setEditItem(null); }} onOk={onEdit} title="编辑工单">
        <Form form={editForm} layout="vertical">
          <Form.Item name="title" label="工单标题" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="content" label="详细内容" rules={[{ required: true }]}><Input.TextArea rows={5} /></Form.Item>
          <Form.Item name="priority" label="优先级">
            <Select options={[{value:"P0",label:"P0 紧急"},{value:"P1",label:"P1 高"},{value:"P2",label:"P2 中"},{value:"P3",label:"P3 低"}]} />
          </Form.Item>
        </Form>
      </Modal>
      {/* 详情弹窗 */}
      <Modal open={detailOpen} onCancel={() => { setDetailOpen(false); setDetailItem(null); }} footer={null} title={`工单 #${detailItem?.id} ${detailItem?.title}`} width={640}>
        {detailItem && (
          <div>
            <p><b>状态：</b><Tag color={statusColor[detailItem.status]}>{detailItem.status}</Tag></p>
            <p><b>优先级：</b><Tag color={({P0:"red",P1:"orange",P2:"blue",P3:"default"})[detailItem.priority]}>{detailItem.priority}</Tag></p>
            <p><b>指派角色：</b>{detailItem.assignRole || "未指派"}</p>
            <p><b>创建时间：</b>{detailItem.createdAt}</p>
            <p><b>完成时间：</b>{detailItem.finishedAt || "未完成"}</p>
            <p><b>内容：</b></p>
            <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, whiteSpace: "pre-wrap" }}>{detailItem.content}</pre>
            <p><b>操作时间线：</b></p>
            <ul>
              {(JSON.parse(detailItem.timeline || "[]") as {time:string;event:string}[]).map((t, i) => (
                <li key={i}><code>{t.time}</code> — {t.event}</li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </div>
  );
}
