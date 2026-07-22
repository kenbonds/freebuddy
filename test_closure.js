// 工单15-19 综合API测试
const http = require("http");
const BASE = "http://127.0.0.1:3100";
function req(m, p, b) { return new Promise((res, rej) => {
  const u = new URL(p, BASE); const o = { hostname: u.hostname, port: u.port, path: u.pathname+u.search, method: m, timeout: 5000,
    headers: { "Content-Type": "application/json" } };
  const r = http.request(o, (resp) => { let d = ""; resp.on("data",c=>d+=c); resp.on("end",()=>{try{res(JSON.parse(d))}catch(e){res({code:-1,msg:String(e),raw:d})}}); });
  r.on("timeout", () => { r.destroy(); rej(new Error("timeout")); }); r.on("error", rej);
  if (b) { const s = JSON.stringify(b); o.headers["Content-Length"] = Buffer.byteLength(s); r.write(s); } r.end();
}); }

function tidReq(action, ticketId) {
  return req("POST", `/api/ticket/${action}`, { ticketId });
}

async function run() {
  let pass=0,fail=0;
  const c = (n,cond,det) => { if(cond){pass++;console.log(`  ✅ ${n}`)} else {fail++;console.log(`  ❌ ${n}: ${det||"FAIL"}`)} };
  console.log("=== 工单15-19 综合测试 ===\n");

  // 工单15: 模型在线检测
  console.log("[工单15] 多模型配置管理");
  const ml = await req("GET", "/api/model/list");
  c("模型列表查询成功", ml.code===0);
  const mc = await req("GET", "/api/model/checkAll");
  c("批量状态检测成功", mc.code===0);

  // 工单16: 智能调度
  console.log("\n[工单16] 智能工作人员调度");
  const ag = await req("POST", "/api/agent/updatePrompt", { role: "开发执行员", promptText: "你是全栈开发工程师", version: "v1" });
  c("提示词更新成功", ag.code===0);

  // 工单17: 知识-任务自动联动
  console.log("\n[工单17] 知识-任务全自动联动");
  const pj = await req("POST", "/api/project/create", { projectName: "知识联动测试", description: "测试知识自动联动" });
  const pid = pj.data?.id;
  c("测试项目创建成功", !!pid);

  // 创建关联知识
  await req("POST", "/api/knowledge/create", { projectId: pid, title: "JWT认证方案", content: "JSON Web Token认证方案，使用RS256签名算法" });

  // 创建工单并执行全流程
  const tk1 = await req("POST", "/api/ticket/create", { projectId: pid, title: "实现登录模块", content: "JWT登录实现，含注册、登录、token刷新、密码重置" });
  const tid1 = tk1.data?.id;
  c("测试工单创建成功", !!tid1);

  // 指派 → 执行 → 提交复核 → 办结
  await req("POST", "/api/ticket/assign", { ticketId: tid1, targetRole: "开发执行员" });
  const exec = await tidReq("startExecute", tid1);
  c("工单执行成功（自动匹配关联知识）", exec.code===0);

  await tidReq("submitReview", tid1);
  const fin1 = await tidReq("finish", tid1);
  c("工单办结成功（自动触发质检+知识沉淀）", fin1.code===0);

  // 工单18: 执行-质检自动闭环
  console.log("\n[工单18] 执行-质检全自动闭环");
  const tk2 = await req("POST", "/api/ticket/create", { projectId: pid, title: "质检测试", content: "测试质检自动触发，内容足够长以满足检测要求，加上更多文字以确保长度达标" });
  const tid2 = tk2.data?.id;
  c("质检测试工单创建成功", !!tid2);

  await req("POST", "/api/ticket/assign", { ticketId: tid2, targetRole: "开发执行员" });
  await tidReq("startExecute", tid2);
  await tidReq("submitReview", tid2);
  const fin2 = await tidReq("finish", tid2);
  c("办结成功+质检自动执行", fin2.code===0);

  // 检查质检报告
  const qr = await req("GET", `/api/qaPipeline/latest/${tid2}`);
  c("质检报告获取成功", qr.code===0);
  if (qr.code === 0 && qr.data) {
    c("质检结果有效", ["pass","minor_issue","major_issue"].includes(qr.data.result));
  }

  // 工单19: 归档条件检查
  console.log("\n[工单19] 项目全生命周期自动闭环");
  const cond = await req("GET", `/api/archive/check/${pid}`);
  c("归档条件检查成功", cond.code===0);
  c("含canArchive判定", cond.data?.canArchive!==undefined);

  // 再办结第三个工单
  const tk3 = await req("POST", "/api/ticket/create", { projectId: pid, title: "最终测试", content: "最后一个测试工单，确保内容足够长以满足所有检测标准" });
  const tid3 = tk3.data?.id;
  await req("POST", "/api/ticket/assign", { ticketId: tid3, targetRole: "开发执行员" });
  await tidReq("startExecute", tid3);
  await tidReq("submitReview", tid3);
  await tidReq("finish", tid3);

  const cond2 = await req("GET", `/api/archive/check/${pid}`);
  c("归档条件最终判定", cond2.code===0);
  c("归档判定含未办结数", cond2.data?.unfinishedCount!==undefined);
  c("归档判定含质检失败数", cond2.data?.qaFailedCount!==undefined);

  console.log(`\n=== 测试完成: ${pass} 通过, ${fail} 失败 ===`);
  process.exit(fail>0?1:0);
}
run().catch(e=>{console.error("异常:",e);process.exit(1);});
