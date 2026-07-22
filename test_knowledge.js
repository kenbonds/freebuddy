// 工单11 API测试 - 结构化知识库
const http = require("http");
const BASE = "http://127.0.0.1:3100";
const ENC = encodeURIComponent("架构规划员");
function req(m, p, b) { return new Promise((res, rej) => {
  const u = new URL(p, BASE); const o = { hostname: u.hostname, port: u.port, path: u.pathname+u.search, method: m, timeout: 5000,
    headers: { "Content-Type": "application/json", "x-role": ENC } };
  const r = http.request(o, (resp) => { let d = ""; resp.on("data",c=>d+=c); resp.on("end",()=>{try{res(JSON.parse(d))}catch(e){res({code:-1,msg:String(e),raw:d})}}); });
  r.on("timeout", () => { r.destroy(); rej(new Error("timeout")); }); r.on("error", rej);
  if (b) { const s = JSON.stringify(b); o.headers["Content-Length"] = Buffer.byteLength(s); r.write(s); } r.end();
}); }

async function run() {
  let pass=0,fail=0;
  const c = (n,cond,det) => { if(cond){pass++;console.log(`  ✅ ${n}`)} else {fail++;console.log(`  ❌ ${n}: ${det||"FAIL"}`)} };
  console.log("=== 工单11: 结构化知识库 测试 ===\n");

  // 1. 创建公共知识
  console.log("[1] 创建公共知识");
  const k1 = await req("POST", "/api/knowledge/create", { title: "架构设计规范", content: "前后端分离架构，后端使用Express+SQLite，前端使用React+Vite+TypeScript" });
  c("公共知识创建成功", k1.code===0 && k1.data?.id>0);
  c("标签自动生成", k1.data?.tags?.length>2, JSON.stringify(k1.data?.tags));

  // 2. 创建项目知识
  console.log("[2] 创建项目知识");
  const pj = await req("POST", "/api/project/create", { projectName: "知识测试项目", description:"test" });
  const pid = pj.data.id;
  const k2 = await req("POST", "/api/knowledge/create", { projectId: pid, title: "项目部署文档", content: "Docker容器化部署流程，使用docker-compose管理多服务" });
  c("项目知识创建成功", k2.code===0);
  c("层级为project", k2.data?.knowledgeLevel==="project");

  // 3. 创建工单知识
  console.log("[3] 创建工单知识");
  const tk = await req("POST", "/api/ticket/create", { projectId: pid, title: "实现登录功能", content: "JWT鉴权实现，含token生成与验证" });
  const tkId = tk.data.id;
  const k3 = await req("POST", "/api/knowledge/create", { ticketId: tkId, title: "JWT实现参考", content: "使用jsonwebtoken库，密钥长度2048位，过期时间24小时" });
  c("工单知识创建成功", k3.code===0);
  c("层级为ticket", k3.data?.knowledgeLevel==="ticket");

  // 4. 批量导入
  console.log("[4] 批量导入");
  const batch = await req("POST", "/api/knowledge/importBatch", { items: [
    { title: "编码规范", content: "使用TypeScript严格模式，eslint检查" },
    { title: "测试规范", content: "单元测试覆盖率不低于80%" }
  ]});
  c("批量导入成功", batch.code===0 && batch.data?.length===2);

  // 5. 按层级搜索
  console.log("[5] 按层级搜索");
  const l1 = await req("GET", "/api/knowledge/list/public");
  c("公共知识列表", l1.code===0 && l1.data?.length>=1);

  // 6. 关键词搜索
  console.log("[6] 关键词搜索");
  const s1 = await req("GET", "/api/knowledge/search?keyword=架构");
  c("关键词搜索成功", s1.code===0);
  c("搜索结果>0", s1.data?.list?.length>0);

  // 7. 目标导向搜索
  console.log("[7] 目标导向搜索");
  const s2 = await req("GET", "/api/knowledge/search?goalKeywords=JWT,鉴权,token");
  c("目标导向搜索成功", s2.code===0);
  c("含目标匹配度评分", s2.data?.list?.[0]?.goalScore!==undefined);

  // 8. 关联查询
  console.log("[8] 关联知识查询");
  const rel = await req("GET", `/api/knowledge/related?projectId=${pid}&ticketId=${tkId}`);
  c("关联查询成功", rel.code===0);
  c("含公共知识", rel.data?.some(k=>k.knowledgeLevel==="public"));

  // 9. 递增复用计数
  console.log("[9] 递增复用计数");
  const ru = await req("POST", `/api/knowledge/reuse/${k1.data.id}`);
  c("复用计数递增", ru.code===0 && ru.data?.reuseCount>=1);

  // 10. 知识迭代
  console.log("[10] 知识迭代");
  const it = await req("POST", `/api/knowledge/iterate/${k1.data.id}`, { newContent: "v2架构: 前后端分离+微服务", changeNote: "升级为微服务架构" });
  c("迭代成功", it.code===0);
  c("新版本号递增", it.data?.new?.version==="v1.1");
  c("来源为iteration", it.data?.new?.sourceType==="iteration");

  // 11. 统计
  console.log("[11] 知识统计");
  const st = await req("GET", "/api/knowledge/stats");
  c("统计成功", st.code===0);
  c("总数量>0", st.data?.total>0);
  c("含层级分布", st.data?.byLevel?.public>0);

  // 12. 自动打标
  console.log("[12] 自动打标");
  const at = await req("POST", "/api/knowledge/autoTag", { title: "React前端开发指南", content: "使用React Hooks和TypeScript开发组件" });
  c("自动打标成功", at.code===0 && at.data?.length>0);

  // 13. 文档解析
  console.log("[13] 文档解析");
  const dp = await req("POST", "/api/knowledge/parseDocument", { text: "# 概述\n这是概述内容\n## 安装\n如何安装系统\n## 配置\n配置参数说明", title: "系统文档" });
  c("文档解析成功", dp.code===0);
  c("至少2个章节", dp.data?.sections?.length>=2);

  console.log(`\n=== 测试完成: ${pass} 通过, ${fail} 失败 ===`);
  process.exit(fail>0?1:0);
}
run().catch(e=>{console.error("异常:",e);process.exit(1);});
