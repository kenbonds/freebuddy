import { useEffect, useState } from "react";
import { Card, Row, Col, Typography } from "antd";
import request from "../api/request";
import type { ApiRes, ProjectItem, TicketItem } from "../types/global";
import { CN_TEXT } from "../constants/cnText";

const { Title } = Typography;

export default function Dashboard() {
  const [projectCount, setProjectCount] = useState(0);
  const [ticketTotal, setTicketTotal] = useState(0);
  const [ticketUnfinish, setTicketUnfinish] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const pRes = await request.get<ApiRes<ProjectItem[]>>("/project/list");
      const projects = pRes.data.data ?? [];
      setProjectCount(projects.length);

      let total = 0;
      let unf = 0;
      for (const p of projects) {
        const tRes = await request.get<ApiRes<TicketItem[]>>(`/ticket/list/${p.id}`);
        const tickets = tRes.data.data ?? [];
        total += tickets.length;
        unf += tickets.filter(it => !["已办结", "归档封存"].includes(it.status)).length;
      }
      setTicketTotal(total);
      setTicketUnfinish(unf);
    };
    loadData();
  }, []);

  return (
    <div>
      <Title level={4}>{CN_TEXT.dashboard}</Title>
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={8}>
          <Card title="项目总数">{projectCount}</Card>
        </Col>
        <Col span={8}>
          <Card title="工单总数量">{ticketTotal}</Card>
        </Col>
        <Col span={8}>
          <Card title="待处理工单">{ticketUnfinish}</Card>
        </Col>
      </Row>
    </div>
  );
}
