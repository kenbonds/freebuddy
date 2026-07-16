import axios from "axios";
import fs from "fs-extra";
import path from "path";
import { writeNetLog } from "./auditNetLog";

const CDN_BASE_URL = "https://freebuddy-cdn.example.com/base_rules";
const TARGET_DIR = path.resolve(__dirname, "../../public_rule_library/agent_prompt");

export async function fetchOfficialBaseRule(): Promise<void> {
  try {
    const res = await axios.get(`${CDN_BASE_URL}/base_prompt.json`, { timeout: 15000 });
    fs.ensureDirSync(TARGET_DIR);
    const savePath = path.join(TARGET_DIR, "official_base.json");
    await fs.writeJSON(savePath, res.data, { spaces: 2 });
    writeNetLog("cdn", "CDN官方基线规则拉取完成，用于修复篡改配置");
  } catch (e) {
    writeNetLog("cdn_error", `CDN基线更新失败:${String(e)}`);
  }
}
