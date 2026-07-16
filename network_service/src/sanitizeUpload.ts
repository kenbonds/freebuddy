import fs from "fs-extra";
import path from "path";
import { writeNetLog } from "./auditNetLog";

const PUBLIC_RULE_ROOT = path.resolve(__dirname, "../../public_rule_library");

// 1.路径白名单校验
function checkPathAllow(filePath: string): boolean {
  const abs = path.resolve(filePath);
  return abs.startsWith(PUBLIC_RULE_ROOT) && abs.endsWith(".json");
}

// 2.敏感信息正则抹除
function regexSanitize(text: string): string {
  let res = text;
  // IP地址
  res = res.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[IP已脱敏]");
  // 域名网址
  res = res.replace(/https?:\/\/[^\s]+/g, "[URL已脱敏]");
  // 端口号
  res = res.replace(/:\d{2,5}/g, "[端口已脱敏]");
  // 密钥/令牌类字符串
  res = res.replace(/sk-[a-zA-Z0-9]{16,}/g, "[密钥已脱敏]");
  // Windows绝对路径
  res = res.replace(/[A-Za-z]:[\\/][^;\n\r]+/g, "[本地路径已脱敏]");
  // 项目名称、数据表名简易屏蔽
  res = res.replace(/project_\d+/g, "[项目标识脱敏]");
  return res;
}

// 3.剥离业务上下文，只保留通用范式
function stripBizContext(obj: Record<string, unknown>): Record<string, unknown> {
  const copy = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
  if (typeof copy.promptContent === "string") {
    copy.promptContent = copy.promptContent
      .replace(/针对本项目|该需求|此工单/g, "")
      .replace(/依据前文需求文档/g, "");
  }
  return copy;
}

// 4.格式结构校验
function validateStructure(data: unknown): boolean {
  if (!data) return false;
  try {
    JSON.stringify(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * 批量处理public_rule_library内所有合规JSON文件，返回脱敏后对象列表
 */
export async function batchSanitizeRuleFiles(): Promise<Array<{ fileName: string; payload: unknown }>> {
  const resultList: Array<{ fileName: string; payload: unknown }> = [];
  const dirs = [
    path.join(PUBLIC_RULE_ROOT, "agent_prompt"),
    path.join(PUBLIC_RULE_ROOT, "pipeline_rule"),
    path.join(PUBLIC_RULE_ROOT, "arch_template"),
    path.join(PUBLIC_RULE_ROOT, "deploy_script")
  ];

  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    const files = await fs.readdir(d);
    for (const f of files) {
      const fullPath = path.join(d, f);
      if (!checkPathAllow(fullPath)) continue;
      try {
        const rawText = await fs.readFile(fullPath, "utf8");
        let jsonData = JSON.parse(rawText) as unknown;
        if (!validateStructure(jsonData)) continue;

        // 四层依次处理
        let str = JSON.stringify(jsonData);
        str = regexSanitize(str);
        let parsed = JSON.parse(str) as Record<string, unknown>;
        parsed = stripBizContext(parsed);

        resultList.push({
          fileName: f,
          payload: parsed
        });
      } catch (e) {
        writeNetLog("sanitize_skip", `跳过文件${f}:${String(e)}`);
      }
    }
  }
  writeNetLog("sanitize", `完成规则库批量脱敏，待上传文件数:${resultList.length}`);
  return resultList;
}
