import axios from "axios";
import ModelConfig from "../db/models/ModelConfig";
import type { DispatchAiInput } from "../types";
import { writeAuditLog } from "../utils/auditLogger";

/**
 * 统一AI调用转发网关，仅透传请求，不缓存不训练不蒸馏模型
 */
export async function dispatchAI(params: DispatchAiInput): Promise<string> {
  const { systemPrompt, userPrompt, modelId, temperature = 0.7 } = params;

  // 查询该条模型配置
  const modelItem = await ModelConfig.findByPk(modelId);
  if (!modelItem) {
    const errMsg = `模型ID ${modelId} 不存在，请先配置大模型接入信息`;
    writeAuditLog(errMsg, "ai_gateway_error");
    throw new Error(errMsg);
  }

  const { baseUrl, apiKey, modelName, alias } = modelItem;

  const reqBody = {
    model: modelName,
    temperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  };

  try {
    const resp = await axios.post(
      `${baseUrl}/v1/chat/completions`,
      reqBody,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 90000
      }
    );

    const content = resp.data.choices?.[0]?.message?.content ?? "";
    writeAuditLog(`网关调用【${alias}】成功，返回文本长度:${content.length}`, "ai_gateway");
    return content;
  } catch (err) {
    const errText = axios.isAxiosError(err)
      ? `接口异常:${err.response?.status} ${JSON.stringify(err.response?.data ?? {})}`
      : String(err);
    const logMsg = `模型【${alias}】调用失败: ${errText}`;
    writeAuditLog(logMsg, "ai_gateway_error");

    // 额度耗尽标准中文提示文案
    if (errText.includes("quota") || errText.includes("额度") || errText.includes("balance")) {
      throw new Error("当前绑定模型调用额度已用尽，可新增其他模型配置或补充账号额度继续使用");
    }
    throw new Error(logMsg);
  }
}
