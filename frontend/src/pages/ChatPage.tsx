import { useState, useEffect, useRef } from "react";
import { Input, Button, List, Typography, Space, Popconfirm, message, Spin, Select } from "antd";
import { SendOutlined, PlusOutlined, DeleteOutlined, ClearOutlined, MessageOutlined } from "@ant-design/icons";
import { CN_TEXT } from "../constants/cnText";

const { TextArea } = Input;
const { Title, Text } = Typography;
const API = "/api";

interface Session {
  id: number;
  title: string;
  scene: string;
  msgCount: number;
  createdAt: string;
}

interface ChatMsg {
  id: number;
  sessionId: number;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  // 加载会话列表
  const loadSessions = async () => {
    try {
      const r = await fetch(`${API}/chat/sessions`);
      const d = await r.json();
      if (d.code === 0) setSessions(d.data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadSessions(); }, []);

  // 滚动到底部
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 加载消息
  const loadMessages = async (sessionId: number) => {
    setLoadingMsgs(true);
    try {
      const r = await fetch(`${API}/chat/messages/${sessionId}`);
      const d = await r.json();
      if (d.code === 0) {
        setMessages(d.data?.messages || []);
        setCurrentSessionId(sessionId);
      }
    } catch { message.error("加载消息失败"); }
    setLoadingMsgs(false);
  };

  // 创建新会话
  const createSession = async () => {
    try {
      const r = await fetch(`${API}/chat/createSession`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const d = await r.json();
      if (d.code === 0) {
        await loadSessions();
        setCurrentSessionId(d.data.id);
        setMessages([]);
      }
    } catch { message.error("创建对话失败"); }
  };

  // 发送消息
  const sendMsg = async () => {
    if (!input.trim() || !currentSessionId) return;
    const content = input.trim();
    setInput("");
    // 立即添加用户消息到界面
    const tempUser: ChatMsg = {
      id: Date.now(),
      sessionId: currentSessionId,
      role: "user",
      content,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUser]);
    setSending(true);

    try {
      const r = await fetch(`${API}/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: currentSessionId, content })
      });
      const d = await r.json();
      if (d.code === 0) {
        if (d.data?.assistant) {
          setMessages(prev => [...prev, d.data.assistant]);
        }
        await loadSessions(); // 更新标题和消息数
      } else {
        message.error(d.msg);
      }
    } catch { message.error("发送失败"); }
    setSending(false);
  };

  // 删除会话
  const delSession = async (id: number) => {
    try {
      const r = await fetch(`${API}/chat/session/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (d.code === 0) {
        if (currentSessionId === id) {
          setCurrentSessionId(null);
          setMessages([]);
        }
        await loadSessions();
      }
    } catch { message.error("删除失败"); }
  };

  // 清空消息
  const clearMsgs = async () => {
    if (!currentSessionId) return;
    try {
      const r = await fetch(`${API}/chat/clear/${currentSessionId}`, { method: "POST" });
      const d = await r.json();
      if (d.code === 0) {
        setMessages([]);
      }
    } catch { message.error("清空失败"); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMsg();
    }
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", gap: 16 }}>
      {/* 左侧会话列表 */}
      <div style={{ width: 260, minWidth: 260, borderRight: "1px solid #f0f0f0", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "8px 0", display: "flex", gap: 8, alignItems: "center" }}>
          <Title level={5} style={{ margin: 0, flex: 1 }}>对话列表</Title>
          <Button type="primary" icon={<PlusOutlined />} size="small" onClick={createSession}>新建</Button>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          <List
            dataSource={sessions}
            renderItem={(item) => (
              <List.Item
                onClick={() => loadMessages(item.id)}
                style={{
                  cursor: "pointer",
                  padding: "8px 12px",
                  background: currentSessionId === item.id ? "#e6f4ff" : undefined,
                  borderRadius: 6,
                  marginBottom: 4
                }}
                actions={[
                  <Popconfirm title="确认删除?" onConfirm={() => delSession(item.id)}>
                    <DeleteOutlined style={{ color: "#999" }} />
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  avatar={<MessageOutlined />}
                  title={<Text ellipsis style={{ maxWidth: 140 }}>{item.title}</Text>}
                  description={<Text type="secondary" style={{ fontSize: 12 }}>{item.msgCount}条消息</Text>}
                />
              </List.Item>
            )}
            locale={{ emptyText: "暂无对话" }}
          />
        </div>
      </div>

      {/* 右侧聊天面板 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {currentSessionId ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: "1px solid #f0f0f0" }}>
              <Text strong>
                {sessions.find(s => s.id === currentSessionId)?.title || "对话"}
              </Text>
              <Button icon={<ClearOutlined />} size="small" onClick={clearMsgs}>清空消息</Button>
            </div>

            <div style={{ flex: 1, overflow: "auto", padding: "12px 0" }}>
              {loadingMsgs ? (
                <div style={{ textAlign: "center", padding: 40 }}><Spin /></div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: "center", color: "#999", padding: 40 }}>开始对话吧</div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} style={{
                    display: "flex",
                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                    marginBottom: 12
                  }}>
                    <div style={{
                      maxWidth: "75%",
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: msg.role === "user" ? "#1677ff" : "#f5f5f5",
                      color: msg.role === "user" ? "#fff" : "#333",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word"
                    }}>
                      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                        {msg.role === "user" ? "我" : "FreeBuddy"}
                      </div>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              <div ref={msgEndRef} />
            </div>

            <div style={{ borderTop: "1px solid #f0f0f0", padding: "12px 0" }}>
              <Space.Compact style={{ width: "100%" }}>
                <TextArea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入消息，Enter发送，Shift+Enter换行"
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  disabled={sending}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={sendMsg}
                  loading={sending}
                  style={{ height: "auto" }}
                >
                  发送
                </Button>
              </Space.Compact>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: 80, color: "#999" }}>
            <MessageOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>请选择或新建一个对话</div>
            <Button type="primary" icon={<PlusOutlined />} onClick={createSession} style={{ marginTop: 16 }}>
              新建对话
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
