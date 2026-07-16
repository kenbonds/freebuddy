// frontend/src/App.tsx
import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu } from "antd";
import type { MenuProps } from "antd";
import {
  DashboardOutlined,
  FolderOpenOutlined,
  FormOutlined,
  UserOutlined,
  CheckCircleOutlined,
  KeyOutlined,
  FileZipOutlined,
  BookOutlined
} from "@ant-design/icons";
import { CN_TEXT } from "./constants/cnText";

// 页面组件懒引入占位，后续逐页创建
import Dashboard from "./pages/Dashboard";
import ProjectList from "./pages/ProjectList";
import TicketList from "./pages/TicketList";
import AgentCenter from "./pages/AgentCenter";
import PipelinePage from "./pages/PipelinePage";
import ModelConfigPage from "./pages/ModelConfigPage";
import ArchivePage from "./pages/ArchivePage";
import AuditLogPage from "./pages/AuditLogPage";

const { Header, Sider, Content } = Layout;

const menuItems: MenuProps["items"] = [
  {
    key: "dashboard",
    icon: <DashboardOutlined />,
    label: CN_TEXT.dashboard
  },
  {
    key: "project",
    icon: <FolderOpenOutlined />,
    label: CN_TEXT.projectManage
  },
  {
    key: "ticket",
    icon: <FormOutlined />,
    label: CN_TEXT.ticketManage
  },
  {
    key: "agent",
    icon: <UserOutlined />,
    label: CN_TEXT.agentCenter
  },
  {
    key: "pipeline",
    icon: <CheckCircleOutlined />,
    label: CN_TEXT.pipelineCheck
  },
  {
    key: "model",
    icon: <KeyOutlined />,
    label: CN_TEXT.modelConfig
  },
  {
    key: "archive",
    icon: <FileZipOutlined />,
    label: CN_TEXT.archiveManage
  },
  {
    key: "audit",
    icon: <BookOutlined />,
    label: CN_TEXT.auditLog
  }
];

const routeMap: Record<string, string> = {
  dashboard: "/dashboard",
  project: "/project",
  ticket: "/ticket",
  agent: "/agent",
  pipeline: "/pipeline",
  model: "/model",
  archive: "/archive",
  audit: "/audit"
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState("dashboard");

  // 根据当前路由匹配菜单选中项
  useEffect(() => {
    const path = location.pathname.replace("/", "");
    const key = Object.entries(routeMap).find(([, p]) => p.includes(path))?.[0] ?? "dashboard";
    setSelectedKey(key);
  }, [location.pathname]);

  const onMenuClick: MenuProps["onClick"] = ({ key }) => {
    setSelectedKey(key);
    navigate(routeMap[key]);
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ height: 48, lineHeight: "48px", textAlign: "center", color: "#fff", fontWeight: "bold" }}>
          {CN_TEXT.appTitle}
        </div>
        <Menu
          theme="dark"
          mode="vertical"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={onMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ background: "#fff", padding: "0 16px" }} />
        <Content style={{ margin: "16px", padding: "16px", background: "#fff" }}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/project" element={<ProjectList />} />
            <Route path="/ticket" element={<TicketList />} />
            <Route path="/agent" element={<AgentCenter />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/model" element={<ModelConfigPage />} />
            <Route path="/archive" element={<ArchivePage />} />
            <Route path="/audit" element={<AuditLogPage />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
