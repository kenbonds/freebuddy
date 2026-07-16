# 开源合规与专利规避声明

> 文件编号：FB-COMPLIANCE-2026-001  
> 更新日期：2026-07-16  
> 适用范围：FreeBuddy 自由搭档 1.0.0

---

## 一、知识产权归属声明

FreeBuddy（下称"本软件"）为 **MIT 协议** 完全开源项目，著作权归属于 FreeBuddy 贡献者社区。

本软件全部源代码（后端、前端、网络子服务）均**从零编写**，未复制、抄袭或以任何形式使用第三方的受版权保护的代码。

---

## 二、与 WorkBuddy 的关系声明

| 项目 | FreeBuddy | WorkBuddy |
|------|-----------|-----------|
| 开发方式 | 独立研发，从零编写 | 腾讯内部项目 |
| 开源协议 | MIT 开源 | 闭源 |
| 源代码 | GitHub 公开 | 无公开代码 |
| 内部通信格式 | 自研 JSON 格式 | MCP 私有协议 |
| API 兼容 | 仅兼容 OpenAI 标准接口 | 私有协议 |

**本软件与 WorkBuddy 不存在以下关联**：
- ❌ 不包含 WorkBuddy 任何源代码或目标代码
- ❌ 不兼容 MCP（Model Context Protocol）私有协议
- ❌ 未逆向工程 WorkBuddy 二进制文件或网络协议
- ❌ 未参考 WorkBuddy 内部实现细节

**二者仅存在以下客观相似性**：
- ✅ 功能概念上的对标（多智能体工程协作）
- ✅ 行业通用术语的使用（"工单"、"流水线"、"智能体"等）

---

## 三、专利侵权风险评估

### 3.1 已知相关专利

WorkBuddy 相关专利多数于 2023-2024 年期间提前申请，目前状态多为 **公开未授权** 或 **实质审查阶段**。

### 3.2 规避分析

本软件已采取以下措施确保合规：

1. **自研通信协议**：不使用 MCP 协议，采用自定义 JSON over WebSocket 格式
2. **独立 API 设计**：路由结构、参数命名、响应格式均为自主设计
3. **通用实现方案**：工单六态流转、Agent 角色划分等均为行业通用概念，不构成专利侵权
4. **MIT 开源声明**：附加禁止闭源商业化条款，降低商业诉讼风险
5. **功能对标 ≠ 技术抄袭**：功能层面的相似不构成专利侵权

### 3.3 免责声明

本软件作者**不提供法律建议**。如用户将本软件用于商业环境，建议：

- 📋 咨询专业知识产权律师进行专利 FTO（自由实施）分析
- 🔍 定期跟踪 WorkBuddy 相关专利的授权状态
- ⚠️ 如相关专利最终获得授权且覆盖范围与本软件实现方案重叠，应及时进行规避设计

---

## 四、AI 模型合规声明

1. **不训练模型**：本软件不训练、不微调、不蒸馏任何大语言模型
2. **仅做代理转发**：将用户请求转发至用户自行配置的模型 API，返回模型响应
3. **不缓存训练数据**：不收集用户输入用于模型训练
4. **密钥本地存储**：模型 API 密钥仅存储在用户本地 SQLite 数据库
5. **脱敏上传**：P2P 同步数据经过四层脱敏（IP/URL/端口/密钥/路径全部抹除）

---

## 五、联网合规声明

1. **匿名节点**：每次启动生成随机 UUID 作为节点标识，不可溯源设备
2. **仅上传公共规则**：脱敏后仅上传 `public_rule_library/` 内容，`private_workspace/` 绝不对外传输
3. **本地监听限制**：触发 HTTP 服务仅监听 `127.0.0.1`，外网不可达
4. **审计留痕**：所有网络请求记录到审计日志，不可篡改、不可删除
5. **用户可离网运行**：物理断外网或删除 `network_service/` 目录后，本地后端+前端可独立运行

---

## 六、开源协议文本

本软件采用 **MIT License**，附加以下约束：

```
MIT License

Copyright (c) 2026 FreeBuddy 自由搭档

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Additional Constraint: It is forbidden to repackage, rename, close-source and
sell this project as commercial SaaS products or paid authorization services.
```

---

## 七、最终声明

本软件仅供**学习参考**，用户在遵守 MIT 协议的前提下，可以自由使用、修改、分发。

**禁止行为**：
- ❌ 重新打包、改名后作为商业 SaaS 产品或付费授权服务销售
- ❌ 删除或隐藏本声明及 MIT 协议文本
- ❌ 将本软件用于违反中华人民共和国法律法规的用途

**建议行为**：
- ✅ 在衍生作品中保留原始版权声明
- ✅ 如用于商业环境，咨询专业律师获取合规意见
- ✅ 贡献代码改进时遵循开源协作精神

---

*本声明文件与 LICENSE 文件共同构成 FreeBuddy 项目的法律合规框架。*
