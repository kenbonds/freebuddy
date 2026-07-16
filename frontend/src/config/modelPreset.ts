/**
 * 模型接入预置配置 - 终极纯净无转义版
 * 彻底修复URL解析报错，零换行、零隐形字符、开箱即用
 * 适配本地/远程模型双向切换、严格TS校验、AI网关透传
 */

// 通用基础最优参数模板（全模型通用）
export const MODEL_BASE_PRESET = {
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 4096,
  timeout: 60000,
  enable: true,
};

// 远程OpenAI标准模型模板
export const REMOTE_MODEL_PRESET = {
  ...MODEL_BASE_PRESET,
  modelType: "remote",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  modelName: "gpt-3.5-turbo",
  proxyEnable: false,
  remark: "通用远程大模型，支持标准OpenAI接口格式",
};

// 本地Ollama私有化模型模板
export const LOCAL_MODEL_PRESET = {
  ...MODEL_BASE_PRESET,
  modelType: "local",
  baseUrl: "http://127.0.0.1:11434/v1",
  apiKey: "",
  modelName: "llama3",
  proxyEnable: false,
  remark: "本地私有化部署模型，无外网请求、无额度限制",
};

// 前端快捷模型下拉列表
export const MODEL_QUICK_PRESET_LIST = [
  {
    label: "GPT-3.5 Turbo（远程）",
    value: "gpt-3.5-turbo",
    template: REMOTE_MODEL_PRESET,
  },
  {
    label: "GPT-4（远程）",
    value: "gpt-4",
    template: { ...REMOTE_MODEL_PRESET, modelName: "gpt-4", maxTokens: 8192 },
  },
  {
    label: "Llama3 本地模型",
    value: "llama3",
    template: LOCAL_MODEL_PRESET,
  },
  {
    label: "Qwen 通义千问本地",
    value: "qwen",
    template: { ...LOCAL_MODEL_PRESET, modelName: "qwen" },
  },
  {
    label: "自定义远程模型",
    value: "remote-custom",
    template: REMOTE_MODEL_PRESET,
  },
  {
    label: "自定义本地模型",
    value: "local-custom",
    template: LOCAL_MODEL_PRESET,
  },
];

// 获取模型默认配置
export const getDefaultModelConfig = (type: "local" | "remote") => {
  return type === "remote" ? { ...REMOTE_MODEL_PRESET } : { ...LOCAL_MODEL_PRESET };
};
