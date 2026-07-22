import { useEffect, useState } from "react";
import { Select, Button, Input, message } from "antd";
import request from "../api/request";
import type { ApiRes, ModelConfItem, TicketItem } from "../types/global";
import { CN_TEXT } from "../constants/cnText";

const { TextArea } = Input;

export default function AgentCenter() {
  const [modelList, setModelList] = useState<ModelConfItem[]>([]);
  const [ticketList, setTicketList] = useState<TicketItem[]>([]);
  const [selectedModel, setSelectedModel] = useState<number | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");

  const loadModels = async () => {
    const res = await request.get<ApiRes<ModelConfItem[]>>("/model/list");
    setModelList(res.data ?? []);
  };

  const loadTickets = async () => {
    const pRes = await request.get<ApiRes<{id:number}[]>>("/project/list");
    const allTickets: TicketItem[] = [];
    for (const p of pRes.data ?? []) {
      const tRes = await request.get<ApiRes<TicketItem[]>>(`/ticket/list/${p.id}`);
      allTickets.push(...(tRes.data ?? []));
    }
    setTicketList(allTickets.filter(t => t.assignRole && !["归档封存"].includes(t.status)));
  };

  useEffect(() => {
    loadModels();
    loadTickets();
  }, []);

  const runTask = async () => {
    if (!selectedModel || !selectedTicket || !inputText) {
      message.warning("请选择模型、工单并输入指令");
      return;
    }
    const res = await request.post<ApiRes<string>>("/agent/runTask", {
      ticketId: selectedTicket,
      modelId: selectedModel,
      userInput: inputText
    });
    if (res.code === 0) {
      setOutputText(res.data ?? "");
    } else {
      message.error(res.msg);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <Select
          placeholder="选择大模型"
          options={modelList.map(m => ({ label: m.alias, value: m.id }))}
          onChange={setSelectedModel}
          style={{ width: 240 }}
        />
        <Select
          placeholder="选择已指派工单"
          options={ticketList.map(t => ({ label: `#${t.id} ${t.title} [${t.assignRole}]`, value: t.id }))}
          onChange={setSelectedTicket}
          style={{ flex: 1 }}
        />
        <Button type="primary" onClick={runTask}>执行智能任务</Button>
      </div>
      <TextArea
        value={inputText}
        onChange={e => setInputText(e.target.value)}
        placeholder="输入本轮需要该智能体执行的具体指令"
        rows={4}
      />
      <div>输出结果：</div>
      <TextArea value={outputText} readOnly rows={12} />
    </div>
  );
}
