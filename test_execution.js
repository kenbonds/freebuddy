// 工单13+14 API测试 - 重型工程模式 + 双模式自适应切换
const http = require("http");
const BASE = "http://127.0.0.1:3100";
function req(m, p, b) { return new Promise((res, rej) => {
  const u = new URL(p, BASE); const o = { hostname: u.hostname, port: u.port, path: u.pathname+u.search, method: m, timeout: 5000,
    headers: { "Content-Type": "application/json" } };
  const r = http.request(o, (resp) => { let d = ""; resp.on("data",c=>d+=c); resp.on("end",()=>{try{res(JSON.parse(d))}catch(e){res({code:-1,msg:String(e),raw:d})}}); });
  r.on("timeout", () => { r.destroy(); rej(new Error("timeout")); }); r.on("error", rej);
  if (b) { const s = JSON.stringify(b); o.headers["Content-Length"] = Buffer.byteLength(s); r.write(s); } r.end();
}); }

async function run() {
  let pass=0,fail=0;
  const c = (n,cond,det) => { if(cond){pass++;console.log(`  ✅ ${n}`)} else {fail++;console.log(`  ❌ ${n}: ${det||"FAIL"}`)} };
  console.log("=== 工单13+14: 重型工程模式 + 双模式切换 测试 ===\n");

  // 创建测试工单
  console.log("[准备] 创建测试项目+工单");
  const pj = await req("POST", "/api/project/create", { projectName: "工程测试项目", description: "测试重型工程模式" });
  const pid = pj.data?.id;
  const tk = await req("POST", "/api/ticket/create", {
    projectId: pid, title: "实现用户登录模块", content: "开发JWT用户登录功能，含注册、登录、token刷新、密码重置四个子功能",
    assignRole: "开发执行员"
  });
  const tid = tk.data?.id;
  c("测试工单创建成功", !!tid);

  // ========== 工单13：重型工程执行模式 ==========
  console.log("\n[工单13] 重型工程闭环执行模式");

  // 1. 创建执行快照
  const s1 = await req("POST", `/api/execution/createSnapshot/${tid}`);
  c("创建执行快照成功", s1.code===0 && s1.data?.steps?.length===5);
  c("包含5个标准步骤", s1.data?.steps?.length===5);
  c("步骤1为需求分析", s1.data?.steps?.[0]?.name==="需求分析");

  // 2. 获取快照
  const s2 = await req("GET", `/api/execution/snapshot/${tid}`);
  c("获取快照成功", s2.code===0 && s2.data?.ticketId===tid);

  // 3. 执行步骤1
  const s3 = await req("POST", `/api/execution/nextStep/${tid}`);
  c("步骤1执行完成", s3.code===0);
  c("步骤1状态为completed", s3.data?.steps?.[0]?.status==="completed");
  c("进度更新", s3.data?.progress>0);

  // 4. 执行步骤2
  const s4 = await req("POST", `/api/execution/nextStep/${tid}`);
  c("步骤2执行完成", s4.code===0);
  c("步骤2状态为completed", s4.data?.steps?.[1]?.status==="completed");

  // 5. 执行全部剩余步骤
  const s5 = await req("POST", `/api/execution/nextStep/${tid}`);
  const s6 = await req("POST", `/api/execution/nextStep/${tid}`);
  const s7 = await req("POST", `/api/execution/nextStep/${tid}`);
  c("全部步骤执行完成", s7.data?.progress===100);
  c("所有步骤均为completed", s7.data?.steps?.every(s=>s.status==="completed"));

  // 6. 快照持久化（内存中保存）
  const s8 = await req("GET", `/api/execution/snapshot/${tid}`);
  c("快照持久化正常", s8.code===0 && s8.data?.progress===100);

  // 7. 中断测试（创建新快照后中断）
  const tk2 = await req("POST", "/api/ticket/create", { projectId: pid, title: "测试任务", content: "测试中断功能" });
  const tid2 = tk2.data.id;
  await req("POST", `/api/execution/createSnapshot/${tid2}`);
  await req("POST", `/api/execution/nextStep/${tid2}`);
  const int = await req("POST", `/api/execution/interrupt/${tid2}`);
  c("中断执行成功", int.code===0);
  c("剩余步骤标记为skipped", int.data?.steps?.slice(1).every(s=>s.status==="skipped"));

  // ========== 工单14：双模式场景识别 ==========
  console.log("\n[工单14] 双模式智能自适应切换");

  // 8. 轻量场景识别
  const d1 = await req("POST", "/api/execution/detectScene", { input: "你好，请问今天天气怎么样？" });
  c("轻量场景识别为chat", d1.data?.mode==="chat");
  c("置信度>50", d1.data?.confidence>=50);

  // 9. 工程场景识别
  const d2 = await req("POST", "/api/execution/detectScene", { input: "需要开发一个用户登录系统，包含注册登录和token刷新功能" });
  c("工程场景识别为engineering", d2.data?.mode==="engineering");
  c("工程置信度>50", d2.data?.confidence>=50);

  // 10. 工单场景识别
  const d3 = await req("GET", `/api/execution/detectTicketScene/${tid}`);
  c("工单场景识别成功", d3.code===0);
  c("模式为engineering", d3.data?.mode==="engineering");

  // 11. 默认场景识别（无关键词）
  const d4 = await req("POST", "/api/execution/detectScene", { input: "随便写点什么" });
  c("默认场景为chat", d4.data?.mode==="chat");

  console.log(`\n=== 测试完成: ${pass} 通过, ${fail} 失败 ===`);
  process.exit(fail>0?1:0);
}
run().catch(e=>{console.error("异常:",e);process.exit(1);});
