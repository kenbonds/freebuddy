// 工单12 API测试 - 轻量化柔性对话模式
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
  console.log("=== 工单12: 轻量化柔性对话模式 测试 ===\n");

  // 1. 创建会话
  console.log("[1] 创建对话会话");
  const s1 = await req("POST", "/api/chat/createSession", {});
  c("创建会话成功", s1.code===0 && s1.data?.id>0);
  c("默认标题为新对话", s1.data?.title==="新对话");
  c("默认场景为general", s1.data?.scene==="general");
  const sid = s1.data.id;

  // 2. 创建带场景的会话
  console.log("[2] 创建带业务场景的会话");
  const s2 = await req("POST", "/api/chat/createSession", { scene: "ticket", projectId: 1 });
  c("业务场景会话创建成功", s2.code===0 && s2.data?.scene==="ticket" && s2.data?.projectId===1);

  // 3. 获取会话列表
  console.log("[3] 获取会话列表");
  const sl = await req("GET", "/api/chat/sessions");
  c("会话列表获取成功", sl.code===0);
  c("至少2个会话", sl.data?.length>=2);

  // 4. 发送消息
  console.log("[4] 发送消息");
  const msg = await req("POST", "/api/chat/send", { sessionId: sid, content: "你好，请介绍一下你自己" });
  c("消息发送成功", msg.code===0);
  c("用户消息已保存", msg.data?.user?.role==="user" && msg.data?.user?.content?.length>0);
  c("AI已回复", msg.data?.assistant?.role==="assistant" && msg.data?.assistant?.content?.length>0);

  // 5. 获取消息历史
  console.log("[5] 获取消息历史");
  const ms = await req("GET", `/api/chat/messages/${sid}`);
  c("消息历史获取成功", ms.code===0);
  c("会话信息完整", ms.data?.session?.id===sid);
  c("至少2条消息", ms.data?.messages?.length>=2);

  // 6. 会话标题自动更新
  console.log("[6] 会话标题自动更新");
  const sl2 = await req("GET", "/api/chat/sessions");
  c("标题已更新为首条消息", sl2.data?.[0]?.title?.includes("你好"));

  // 7. 清空消息
  console.log("[7] 清空消息");
  const cl = await req("POST", `/api/chat/clear/${sid}`, {});
  c("清空消息成功", cl.code===0);
  const ms2 = await req("GET", `/api/chat/messages/${sid}`);
  c("消息已清空", ms2.data?.messages?.length===0);

  // 8. 删除会话
  console.log("[8] 删除会话");
  const dl = await req("DELETE", `/api/chat/session/${sid}`);
  c("删除会话成功", dl.code===0);
  const sl3 = await req("GET", "/api/chat/sessions");
  c("会话已删除", !sl3.data?.some(s=>s.id===sid));

  console.log(`\n=== 测试完成: ${pass} 通过, ${fail} 失败 ===`);
  process.exit(fail>0?1:0);
}
run().catch(e=>{console.error("异常:",e);process.exit(1);});
