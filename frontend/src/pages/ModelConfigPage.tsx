import { useEffect, useState } from "react";
import { Button, Table, Modal, Form, Input, Switch, message, Tag, Space } from "antd";
import { PlusOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import request from "../api/request";
import type { ApiRes, ModelConfItem } from "../types/global";
import { CN_TEXT } from "../constants/cnText";

interface ModelStatus {
  id: number;
  alias: string;
  online: boolean;
}

export default function ModelConfigPage() {
  const [list, setList] = useState<ModelConfItem[]>([]);
  const [statusMap, setStatusMap] = useState<Record<number, boolean>>({});
  const [checking, setChecking] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const refresh = async () => {
    const res = await request.get<ApiRes<ModelConfItem[]>>("/model/list");
    setList(res.data ?? []);
    // 自动检测状态
    checkAllStatus();
  };

  const checkAllStatus = async () => {
    setChecking(true);
    try {
      const res = await request.get<ApiRes<ModelStatus[]>>("/model/checkAll");
      if (res.code === 0 && res.data) {
        const map: Record<number, boolean> = {};
        res.data.forEach(s => { map[s.id] = s.online; });
        setStatusMap(map);
      }
    } catch { /* ignore */ }
    setChecking(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const addModel = async () => {
    const vals = await form.validateFields();
    const res = await request.post<ApiRes<unknown>>("/model/add", vals);
    if (res.code === 0) {
      message.success("新增模型配置成功");
      setOpen(false);
      form.resetFields();
      refresh();
    } else message.error(res.msg);
  };

  const del = async (id: number) => {
    await request.delete(`/model/${id}`);
    message.success("已删除");
    refresh();
  };

  const columns = [
    { title: CN_TEXT.table.id, dataIndex: "id", key: "id", width: 60 },
    { title: CN_TEXT.table.modelAlias, dataIndex: "alias", key: "alias" },
    { title: CN_TEXT.table.baseUrl, dataIndex: "baseUrl", key: "baseUrl", ellipsis: true },
    { title: CN_TEXT.table.modelName, dataIndex: "modelName", key: "modelName" },
    {
      title: "在线状态", key: "status", width: 100,
      render: (r: ModelConfItem) => {
        const online = statusMap[r.id];
        if (online === undefined) return <Tag>检测中...</Tag>;
        return online
          ? <Tag icon={<CheckCircleOutlined />} color="success">在线</Tag>
          : <Tag icon={<CloseCircleOutlined />} color="error">离线</Tag>;
      }
    },
    {
      title: CN_TEXT.table.operate, key: "del", width: 120,
      render: (r: ModelConfItem) => (
        <Button danger size="small" onClick={() => del(r.id)}>{CN_TEXT.btn.delete}</Button>
      )
    }
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          {CN_TEXT.btn.create}
        </Button>
        <Button icon={<ReloadOutlined />} onClick={checkAllStatus} loading={checking}>
          检测在线状态
        </Button>
      </Space>
      <Table rowKey="id" dataSource={list} columns={columns} pagination={false} />
      <Modal open={open} onCancel={() => setOpen(false)} onOk={addModel} title="新增大模型接入配置">
        <Form form={form} layout="vertical">
          <Form.Item name="alias" label="别名" rules={[{ required: true }]}>
            <Input placeholder="如：本地Ollama" />
          </Form.Item>
          <Form.Item name="baseUrl" label="接口地址" rules={[{ required: true }]}>
            <Input placeholder="如 http://127.0.0.1:11434" />
          </Form.Item>
          <Form.Item name="apiKey" label="接口密钥" rules={[{ required: true }]}>
            <Input.Password placeholder="API Key或留空" />
          </Form.Item>
          <Form.Item name="modelName" label="模型名称" rules={[{ required: true }]}>
            <Input placeholder="如 qwen2.5:7b" />
          </Form.Item>
          <Form.Item name="isLocal" label="是否本地推理" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
