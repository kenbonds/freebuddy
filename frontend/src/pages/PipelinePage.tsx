import { Typography } from "antd";
const { Paragraph } = Typography;

export default function PipelinePage() {
  return (
    <div>
      <Paragraph>
        <p>1. 基础门禁：tsc --noEmit 严格类型校验 + Vitest 单元测试</p>
        <p>2. 全量门禁 --full-gate：项目构建打包 + 单元测试 + Playwright E2E 自动化页面检测 + 代码安全漏洞扫描</p>
        <p>3. 校验失败将直接阻断归档、部署流程，工单自动退回测试驳回状态</p>
        <p>4. 流水线脚本内置在后端工程目录，由归档与任务流程自动调用执行</p>
      </Paragraph>
    </div>
  );
}
