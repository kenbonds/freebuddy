import { useEffect, useState } from "react";
import { Button, Table, Modal, Form, Input, Switch, message } from "antd";
import request from "../api/request";
import type { ApiRes, ModelConfItem } from "../types/global";
import { CN_TEXT } from "../constants/cnText";

export default function ModelConfigPage() {
  const [list, setList] = useState<ModelConfItem[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const refresh = async () => {
    const res = await request.get<ApiRes<ModelConfItem[]>>("/model/list");
    setList(res.data.data ?? []);
  };

  useEffect(() => {
    refresh();
  }, []);

  const addModel = async () => {
    const vals = await form.validateFields();
    const res = await request.post("/model/add", vals);
    if (res.data.code === 0) {
      message.success("新增模型配置成功");
      setOpen(false);
      form.resetFields();
      refresh();
    } else message.error(res.data.msg);
  };

  const del = async (id: number) => {
    await request.delete(`/model/${id}`);
    message.success("已删除");
    refresh();
  };

  const columns = [
    { title: CN_TEXT.table.id, dataIndex: "id", key: "id" },
    { title: CN_TEXT.table.modelAlias, dataIndex: "alias", key: "alias" },
    { title: CN_TEXT.table.baseUrl, dataIndex: "baseUrl", key: "baseUrl" },
    { title: CN_TEXT.table.modelName, dataIndex: "modelName", key: "modelName" },
    { title: "本地推理", key: "isLocal", render: (r: ModelConfItem) => r.isLocal ? "是" : "否" },
    {
      title: CN_TEXT.table.operate,
      key: "del",
      render: (r: ModelConfItem) => (
        <Button danger size="small" onClick={() => del(r.id)}>{CN_TEXT.btn.delete}</Button>
      )
    }
  ];

  return (
    <div>
      <Button type="primary" onClick={() => setOpen(true)} style={{ marginBottom: 16 }}>
        {CN_TEXT.btn.create}
      </Button>
      <Table rowKey="id" dataSource={list} columns={columns} />
      <Modal open={open} onCancel={() => setOpen(false)} onOk={addModel} title="新增大模型接入配置">
        <Form form={form} layout="vertical">
          <Form.Item name="alias" label="别名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="baseUrl" label="接口地址" rules={[{ required: true }]}>
            <Input placeholder="如 http://127.0.0.1:11434/v1" />
          </Form.Item>
          <Form.Item name="apiKey" label="接口密钥" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="modelName" label="模型名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="isLocal" label="是否本地推理" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
