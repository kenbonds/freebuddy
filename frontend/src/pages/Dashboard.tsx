import { useEffect, useState } from "react";
import { Card, Row, Col, Typography, Button, Space } from "antd";
import { useNavigate } from "react-router-dom";
import request from "../api/request";
import type { ApiRes, ProjectStats } from "../types/global";
import { CN_TEXT } from "../constants/cnText";

const { Title } = Typography;

export default function Dashboard() {
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const res = await request.get<ApiRes<ProjectStats>>("/project/stats");
      setStats(res.data);
    };
    load();
    const timer = setInterval(load, 10000); // 每10秒自动刷新
    return () => clearInterval(timer);
  }, []);

  return (
    <div>
      <Title level={4}>{CN_TEXT.dashboard}</Title>
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={6}>
          <Card title="项目总数">{stats?.total ?? 0}</Card>
        </Col>
        <Col span={6}>
          <Card title="正常项目" style={{ borderLeft: "3px solid #52c41a" }}>{stats?.normal ?? 0}</Card>
        </Col>
        <Col span={6}>
          <Card title="已归档" style={{ borderLeft: "3px solid #1890ff" }}>{stats?.archived ?? 0}</Card>
        </Col>
        <Col span={6}>
          <Card title="异常项目" style={{ borderLeft: "3px solid #ff4d4f" }}>{stats?.abnormal ?? 0}</Card>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={6}>
          <Card title="工单总数量">{stats?.ticketTotal ?? 0}</Card>
        </Col>
        <Col span={6}>
          <Card title="已办结" style={{ borderLeft: "3px solid #52c41a" }}>{stats?.ticketDone ?? 0}</Card>
        </Col>
        <Col span={6}>
          <Card title="待处理工单" style={{ borderLeft: "3px solid #faad14" }}>{stats?.ticketPending ?? 0}</Card>
        </Col>
        <Col span={6}>
          <Card title="工单完成率">{stats?.completionRate ?? 0}%</Card>
        </Col>
      </Row>
      <Row style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card title="快捷操作">
            <Space>
              <Button type="primary" onClick={() => navigate("/project")}>新建项目</Button>
              <Button onClick={() => navigate("/ticket")}>新建工单</Button>
              <Button onClick={() => navigate("/agent")}>查看待办</Button>
              <Button onClick={() => navigate("/pipeline")}>进入质检流水线</Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
