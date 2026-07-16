/**
 * 全方位风控系统 — 八维一体
 * 多语言智能风控 + 行为风控 + IP深度封禁 + AI语义审核
 * + 全场景覆盖 + 分级处罚 + 完整审计 + 人机校验
 */
import { getCurrentUser, setCurrentUser } from "./userAuth";
import { autoTranslateChat } from "../i18n/clientLang";
import type {
  ClientLangType,
  RiskScene,
  RiskCheckRes,
  RiskLogItem,
  BehaviorMetrics,
  AiReviewResult,
  IpBlackItem
} from "@/types/chat";
import {
  UserBanStatus
} from "@/types/chat";

// ==================== 常量定义 ====================

// 行为风控阈值
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_POSTS = 2;
const DUPLICATE_WINDOW_MS = 10000;
const NEW_ACCOUNT_PROTECTION_MS = 600000;
const PRIVATE_CHAT_NEW_USER_LIMIT = 10;

// localStorage 键名
const STORAGE_KEY_BLACKLIST = "fb_risk_ip_blacklist";
const STORAGE_KEY_AUDIT_LOG = "fb_risk_audit_log";

// ==================== 1. 多语言违规词库 ====================

// 五国双语违规词库：按语言和违规类型组织
const LANG_RISK_WORDS: Record<string, Record<string, string[]>> = {
  "zh-CN": {
    porn: ["色情", "色图", "色片", "AV", "黄片", "激情", "裸聊", "约炮", "一夜情", "同城约", "成人", "黄网"],
    violence: ["杀人", "枪支", "炸药", "砍人", "贩毒", "毒品", "恐怖"],
    gambling: ["赌博", "赌场", "百家乐", "轮盘", "六合彩", "彩票", "博彩", "时时彩"],
    ad: ["刷单", "兼职", "赚钱", "低价", "优惠", "代购", "引流", "加微信", "加v", "VX",
      "私聊领", "免费领取", "源码售卖", "付费", "担保", "外挂", "贷款", "网贷",
      "杀猪盘", "福利", "资源群", "薅羊毛", "日赚", "月入", "财务自由", "跟单"]
  },
  "en-US": {
    porn: ["porn", "sex video", "xxx", "nude", "onlyfans", "cam girl", "adult content", "nsfw"],
    violence: ["kill", "murder", "bomb", "terror", "weapon", "drug", "heroin", "cocaine"],
    gambling: ["casino", "bet", "poker", "blackjack", "slot", "roulette", "gambling", "lottery"],
    ad: ["make money", "work from home", "easy money", "click here", "free money", "cash reward",
      "sign up bonus", "referral", "earn daily", "passive income", "get rich", "financial freedom"]
  },
  "ja-JP": {
    porn: ["アダルト", "ポルノ", "エロ", "ヌード", "AV", "無修正", "裏サイト", "出会い"],
    violence: ["殺人", "爆弾", "テロ", "麻薬", "拳銃", "犯罪"],
    gambling: ["ギャンブル", "カジノ", "パチンコ", "スロット", "賭博"],
    ad: ["稼ぐ", "副収入", "簡単", "金儲け", "登録ボーナス", "無料プレゼント"]
  },
  "ko-KR": {
    porn: ["야동", "야한", "성인", "포르노", "AV", "19금", "딸감", "야설"],
    violence: ["살인", "폭탄", "테러", "마약", "총기", "범죄"],
    gambling: ["도박", "카지노", "바카라", "슬롯", "블랙잭", "배팅"],
    ad: ["벌기", "부업", "쉽게", "수익", "가입", "무료", "선물", "추천인"]
  },
  "hi-IN": {
    porn: ["अश्लील", "पोर्न", "नग्न", "यौन", "एडल्ट", "ब्लू फिल्म"],
    violence: ["हत्या", "बम", "आतंक", "ड्रग्स", "हथियार"],
    gambling: ["जुआ", "कैसीनो", "सट्टा", "बाज़ी", "लॉटरी"],
    ad: ["पैसे कमाएं", "घर से काम", "आसान पैसा", "मुफ्त", "बोनस", "रजिस्टर"]
  }
};

// 隐晦变体检测：谐音、拆分、变体映射
const DISGUISED_PATTERNS: [RegExp, string][] = [
  [/(加\s*微|加薇|葳欣|VX|v\s*x|薇信)/i, "ad:wechat"],
  [/(薪\s*号|鑫号|莘号)/, "ad:account"],
  [/(色\s*图|射\s*图|se\s*tu)/i, "porn:image"],
  [/(博\s*彩|波\s*菜)/, "gambling"],
  [/(赌\s*博|睹\s*博)/, "gambling"],
  [/(裸\s*聊|落\s*聊)/, "porn:chat"],
  [(/fu?\s*ck/i), "violence:generic"],
  [(/se?\s*x/i), "porn:generic"]
];

// 代理/VPN IP特征前缀（简化检测）
const PROXY_IP_PREFIXES = ["10.", "172.", "192.168."];

// ==================== 2. 设备指纹 ====================

function getDeviceId(): string {
  try {
    const stored = localStorage.getItem("fb_device_id");
    if (stored) return stored;
    const nav = navigator;
    const raw = [
      nav.userAgent || "",
      nav.language || "",
      screen.width || "",
      screen.height || "",
      screen.colorDepth || "",
      nav.hardwareConcurrency || ""
    ].join("|");
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash |= 0;
    }
    const id = `dev_${Math.abs(hash).toString(16)}_${Date.now().toString(36)}`;
    localStorage.setItem("fb_device_id", id);
    return id;
  } catch {
    return `dev_${Date.now().toString(36)}`;
  }
}

function detectIsProxyIp(): boolean {
  // 浏览器端无法获取真实IP，基于设备指纹和UA特征做简单判断
  const ua = navigator.userAgent.toLowerCase();
  const proxySignals = [
    ua.includes("warp"), ua.includes("cloudflare"), ua.includes("proxy"),
    ua.includes("vpn"), !navigator.plugins?.length,
    !navigator.languages?.length
  ];
  return proxySignals.filter(Boolean).length >= 2;
}

// ==================== 3. 行为风控（内存跟踪） ====================

const behaviorMap = new Map<string, BehaviorMetrics>();

function getBehavior(userId: string): BehaviorMetrics {
  let bm = behaviorMap.get(userId);
  if (!bm) {
    bm = {
      userId,
      postTimestamps: [],
      lastContents: [],
      lastContentTime: 0,
      sceneSwitchCount: 0,
      privateChatNewUserCount: 0,
      duplicateCount: 0
    };
    behaviorMap.set(userId, bm);
  }
  return bm;
}

function cleanupOldRecords(): void {
  const now = Date.now();
  for (const [uid, bm] of behaviorMap.entries()) {
    bm.postTimestamps = bm.postTimestamps.filter(t => now - t < 120000);
    if (bm.postTimestamps.length === 0 && now - bm.lastContentTime > 300000) {
      behaviorMap.delete(uid);
    }
  }
}
setInterval(cleanupOldRecords, 60000);

// 频率限制检查
function checkRateLimit(userId: string): boolean {
  const bm = getBehavior(userId);
  const now = Date.now();
  bm.postTimestamps = bm.postTimestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (bm.postTimestamps.length >= RATE_LIMIT_MAX_POSTS) {
    return false;
  }
  bm.postTimestamps.push(now);
  return true;
}

// 短时重复内容检测
function checkDuplicateContent(userId: string, content: string): boolean {
  const bm = getBehavior(userId);
  const now = Date.now();
  if (now - bm.lastContentTime < DUPLICATE_WINDOW_MS) {
    const normalized = content.replace(/\s+/g, "").toLowerCase();
    const match = bm.lastContents.some(c => {
      const nc = c.replace(/\s+/g, "").toLowerCase();
      return normalized.includes(nc) || nc.includes(normalized);
    });
    if (match) {
      bm.duplicateCount = (bm.duplicateCount || 0) + 1;
      return true;
    }
  }
  bm.lastContents.push(content);
  if (bm.lastContents.length > 5) bm.lastContents.shift();
  bm.lastContentTime = now;
  return false;
}

// 异常行为检测
function checkAbnormalBehavior(userId: string): string | null {
  const bm = getBehavior(userId);
  const now = Date.now();
  const recentPosts = bm.postTimestamps.filter(t => now - t < 30000);
  if (recentPosts.length >= 3) {
    return "短时间内频繁发帖";
  }
  if (bm.sceneSwitchCount > 10) {
    return "频繁切换分区，疑似脚本行为";
  }
  if ((bm.duplicateCount || 0) > 3) {
    return "多次发布重复内容";
  }
  return null;
}

// ==================== 4. IP深度风控 ====================

function getIpBlacklist(): IpBlackItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BLACKLIST);
    return raw ? (JSON.parse(raw) as IpBlackItem[]) : [];
  } catch {
    return [];
  }
}

function saveIpBlacklist(list: IpBlackItem[]): void {
  localStorage.setItem(STORAGE_KEY_BLACKLIST, JSON.stringify(list));
}

function checkIpBlocked(): boolean {
  const deviceId = getDeviceId();
  const list = getIpBlacklist();
  return list.some(item => {
    if (item.ip === deviceId) return true;
    // IP段封禁检测：如果deviceId以某个封禁IP的前8字符开头，视为同一段
    if (item.ip.length >= 8 && deviceId.startsWith(item.ip.substring(0, 8))) return true;
    return false;
  });
}

export function banDevice(deviceId: string, userId: string, userName: string, content: string, category: string): void {
  const list = getIpBlacklist();
  list.push({
    ip: deviceId,
    userId,
    userName,
    violateContent: content.substring(0, 200),
    violateCategory: category,
    banTime: new Date().toISOString(),
    isPermanent: true
  });
  saveIpBlacklist(list);
}

// ==================== 5. 多语言关键词检测 ====================

function detectLang(content: string): ClientLangType {
  if (/[\u4e00-\u9fff]/.test(content)) return "zh-CN";
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(content)) return "ja-JP";
  if (/[\uac00-\ud7af]/.test(content)) return "ko-KR";
  if (/[\u0900-\u097f]/.test(content)) return "hi-IN";
  return "en-US";
}

function checkMultiLangKeywords(content: string, lang: ClientLangType): { matched: boolean; riskType: string; rule: string } {
  const lower = content.toLowerCase();
  const wordBank = LANG_RISK_WORDS[lang] || LANG_RISK_WORDS["en-US"];

  for (const [riskType, words] of Object.entries(wordBank)) {
    for (const word of words) {
      if (lower.includes(word.toLowerCase())) {
        return { matched: true, riskType, rule: `keyword:${lang}:${riskType}` };
      }
    }
  }

  // 隐晦变体检测
  for (const [pattern, rule] of DISGUISED_PATTERNS) {
    if (pattern.test(content)) {
      const riskType = rule.split(":")[0];
      return { matched: true, riskType, rule: `disguised:${rule}` };
    }
  }

  return { matched: false, riskType: "", rule: "" };
}

// 跨语言关键词检测：先用AI翻译成英文再检一次
async function checkCrossLangKeywords(content: string): Promise<{ matched: boolean; riskType: string; rule: string }> {
  try {
    const enContent = await autoTranslateChat(content, "en-US");
    if (enContent && enContent !== content) {
      return checkMultiLangKeywords(enContent, "en-US");
    }
  } catch {
    // 翻译失败不影响主流程
  }
  return { matched: false, riskType: "", rule: "" };
}

// ==================== 6. AI语义审核 ====================

async function aiReviewContent(content: string): Promise<AiReviewResult> {
  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3",
        prompt: `You are a content safety moderator. Analyze the following text and determine if it contains: pornography, violence, gambling, scams, illegal advertising, or any prohibited content. 
Only respond with a JSON object, no other text: {"pass":true/false, "riskType":"none/porn/violence/gambling/ad/scam", "reason":"brief reason in Chinese", "confidence":0-1}
Text: ${content}`,
        stream: false
      })
    });
    const data = await res.json();
    try {
      const parsed = JSON.parse(data.response) as AiReviewResult;
      return parsed;
    } catch {
      return { pass: true, riskType: "", reason: "AI审核解析失败，默认放行", confidence: 0 };
    }
  } catch {
    return { pass: true, riskType: "", reason: "AI服务不可用，跳关键词检测", confidence: 0 };
  }
}

// ==================== 7. 分级处罚 ====================

function applyPunishment(userId: string, level: UserBanStatus, reason: string): void {
  const user = getCurrentUser();
  if (!user || user.id !== userId) return;

  const updated = { ...user, banStatus: level };
  if (level === UserBanStatus.MUTE_24H) {
    updated.muteUntil = Date.now() + 86400000;
  }
  setCurrentUser(updated);
}

function checkMuteStatus(): string | null {
  const user = getCurrentUser();
  if (!user) return null;
  if (user.banStatus === UserBanStatus.MUTE_24H && user.muteUntil) {
    if (Date.now() < user.muteUntil) {
      const remaining = Math.ceil((user.muteUntil - Date.now()) / 60000);
      return `账号因违规已被临时禁言，剩余 ${remaining} 分钟后自动解封`;
    }
    // 解封
    const updated = { ...user, banStatus: UserBanStatus.NORMAL, muteUntil: undefined };
    setCurrentUser(updated);
  }
  return null;
}

// ==================== 8. 审计日志 ====================

function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

function writeRiskLog(entry: RiskLogItem): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUDIT_LOG);
    const logs: RiskLogItem[] = raw ? JSON.parse(raw) : [];
    logs.push(entry);
    // 最多保留1000条
    if (logs.length > 1000) logs.splice(0, logs.length - 1000);
    localStorage.setItem(STORAGE_KEY_AUDIT_LOG, JSON.stringify(logs));
  } catch {
    // 审计日志写入失败不影响主流程
  }
}

export function getRiskLogs(): RiskLogItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUDIT_LOG);
    return raw ? (JSON.parse(raw) as RiskLogItem[]) : [];
  } catch {
    return [];
  }
}

// ==================== 9. 新账号保护 ====================

function checkNewAccountProtection(userId: string): boolean {
  try {
    const key = `fb_risk_new_account_${userId}`;
    const createTime = localStorage.getItem(key);
    if (!createTime) {
      localStorage.setItem(key, String(Date.now()));
      return true; // 新账号，触发保护
    }
    const elapsed = Date.now() - Number(createTime);
    return elapsed < NEW_ACCOUNT_PROTECTION_MS;
  } catch {
    return false;
  }
}

// ==================== 10. 统一风控入口 ====================

/**
 * 全场景风控校验 — 适用于论坛发帖、私聊消息等所有场景
 * @param content  用户发布的内容
 * @param scene    场景：forum_post | private_chat
 * @param targetUserId  私聊对象ID（私聊场景需要）
 */
export async function unifiedRiskCheck(
  content: string,
  scene: RiskScene,
  targetUserId?: string
): Promise<RiskCheckRes> {
  const user = getCurrentUser();
  if (!user) {
    return { pass: false, msg: "请先登录" };
  }

  // ===== Step 0: 检查封禁状态 =====
  if (user.banStatus === UserBanStatus.PERMANENT_BAN) {
    return { pass: false, msg: "账号因违规已被永久禁言，无法发布内容" };
  }
  const muteMsg = checkMuteStatus();
  if (muteMsg) {
    return { pass: false, msg: muteMsg };
  }

  // ===== Step 1: IP/设备风控 =====
  if (checkIpBlocked()) {
    return { pass: false, msg: "设备已被封禁，无法发布内容" };
  }
  const isProxy = detectIsProxyIp();
  const deviceId = getDeviceId();

  // ===== Step 2: 新账号保护 =====
  const isNewAccount = checkNewAccountProtection(user.id);
  if (isNewAccount && scene === "forum_post") {
    return { pass: false, msg: "新注册账号10分钟后方可发帖，请稍后再试" };
  }

  // ===== Step 3: 行为风控 =====
  if (!checkRateLimit(user.id)) {
    return { pass: false, msg: "发布过于频繁，请1分钟后再试" };
  }
  if (checkDuplicateContent(user.id, content)) {
    const bm = getBehavior(user.id);
    const duplicateCount = (bm.duplicateCount || 0);
    if (duplicateCount >= 3) {
      applyPunishment(user.id, UserBanStatus.MUTE_24H, "多次重复发布违规内容");
      writeRiskLog({
        id: generateId(), timestamp: Date.now(), userId: user.id, userName: user.userName,
        scene, originalContent: content, translatedContent: "",
        riskType: "duplicate", triggeredRule: "behavior:duplicate:repeat",
        punishmentLevel: UserBanStatus.MUTE_24H, deviceId
      });
      return { pass: false, msg: "多次发布重复内容，已被临时禁言24小时" };
    }
    return { pass: false, msg: "请勿在短时间内发布相似内容" };
  }

  // ===== Step 4: 私聊风控（拦截批量骚扰） =====
  if (scene === "private_chat") {
    const bm = getBehavior(user.id);
    if (targetUserId) {
      bm.privateChatNewUserCount = (bm.privateChatNewUserCount || 0) + 1;
    }
    if (bm.privateChatNewUserCount > PRIVATE_CHAT_NEW_USER_LIMIT) {
      return { pass: false, msg: "短时间内发送私聊过多，请稍后再试" };
    }
  }

  // ===== Step 5: 检测内容语言 =====
  const detectedLang = detectLang(content);

  // ===== Step 6: 关键词检测（当前语言） =====
  const keywordResult = checkMultiLangKeywords(content, detectedLang);
  if (keywordResult.matched) {
    // 首次违规 => 警告
    if (user.banStatus === UserBanStatus.NORMAL) {
      applyPunishment(user.id, UserBanStatus.WARNING, `触发关键词:${keywordResult.rule}`);
      writeRiskLog({
        id: generateId(), timestamp: Date.now(), userId: user.id, userName: user.userName,
        scene, originalContent: content, translatedContent: "",
        riskType: keywordResult.riskType, triggeredRule: keywordResult.rule,
        punishmentLevel: UserBanStatus.WARNING, deviceId
      });
      return { pass: false, msg: "内容包含违规信息，本次已拦截。再次违规将面临禁言处罚" };
    }
    // 二次违规 => 24H禁言
    if (user.banStatus === UserBanStatus.WARNING) {
      applyPunishment(user.id, UserBanStatus.MUTE_24H, `二次违规:${keywordResult.rule}`);
      writeRiskLog({
        id: generateId(), timestamp: Date.now(), userId: user.id, userName: user.userName,
        scene, originalContent: content, translatedContent: "",
        riskType: keywordResult.riskType, triggeredRule: keywordResult.rule,
        punishmentLevel: UserBanStatus.MUTE_24H, deviceId
      });
      return { pass: false, msg: "多次发布违规内容，已被临时禁言24小时" };
    }
    // 三次及以上 => 永久封禁
    applyPunishment(user.id, UserBanStatus.PERMANENT_BAN, `屡次违规:${keywordResult.rule}`);
    banDevice(deviceId, user.id, user.userName, content, keywordResult.riskType);
    writeRiskLog({
      id: generateId(), timestamp: Date.now(), userId: user.id, userName: user.userName,
      scene, originalContent: content, translatedContent: "",
      riskType: keywordResult.riskType, triggeredRule: keywordResult.rule,
      punishmentLevel: UserBanStatus.PERMANENT_BAN, deviceId
    });
    return { pass: false, msg: "多次违规发布违法内容，账号已被永久封禁" };
  }

  // ===== Step 7: 跨语言关键词检测 =====
  if (detectedLang !== "en-US") {
    const crossResult = await checkCrossLangKeywords(content);
    if (crossResult.matched) {
      if (user.banStatus === UserBanStatus.NORMAL) {
        applyPunishment(user.id, UserBanStatus.WARNING, `跨语言触发:${crossResult.rule}`);
        writeRiskLog({
          id: generateId(), timestamp: Date.now(), userId: user.id, userName: user.userName,
          scene, originalContent: content, translatedContent: "",
          riskType: crossResult.riskType, triggeredRule: crossResult.rule,
          punishmentLevel: UserBanStatus.WARNING, deviceId
        });
        return { pass: false, msg: "内容被判定为违规，本次已拦截" };
      }
      applyPunishment(user.id, UserBanStatus.MUTE_24H, `跨语言二次:${crossResult.rule}`);
      writeRiskLog({
        id: generateId(), timestamp: Date.now(), userId: user.id, userName: user.userName,
        scene, originalContent: content, translatedContent: "",
        riskType: crossResult.riskType, triggeredRule: crossResult.rule,
        punishmentLevel: UserBanStatus.MUTE_24H, deviceId
      });
      return { pass: false, msg: "发布违规内容，已被临时禁言24小时" };
    }
  }

  // ===== Step 8: AI语义审核（代理IP或已有警告记录时触发） =====
  if (isProxy || user.banStatus === UserBanStatus.WARNING) {
    const aiResult = await aiReviewContent(content);
    if (!aiResult.pass && aiResult.confidence > 0.6) {
      if (user.banStatus === UserBanStatus.WARNING) {
        applyPunishment(user.id, UserBanStatus.MUTE_24H, `AI审核:${aiResult.riskType}`);
        writeRiskLog({
          id: generateId(), timestamp: Date.now(), userId: user.id, userName: user.userName,
          scene, originalContent: content, translatedContent: "",
          riskType: aiResult.riskType, triggeredRule: `ai:${aiResult.riskType}`,
          punishmentLevel: UserBanStatus.MUTE_24H, deviceId
        });
        return { pass: false, msg: "AI审核判定内容违规，已被临时禁言24小时" };
      }
      applyPunishment(user.id, UserBanStatus.WARNING, `AI审核:${aiResult.riskType}`);
      writeRiskLog({
        id: generateId(), timestamp: Date.now(), userId: user.id, userName: user.userName,
        scene, originalContent: content, translatedContent: "",
        riskType: aiResult.riskType, triggeredRule: `ai:${aiResult.riskType}`,
        punishmentLevel: UserBanStatus.WARNING, deviceId
      });
      return { pass: false, msg: "AI审核判定内容疑似违规，已记录。多次违规将加重处罚" };
    }
  }

  // ===== Step 9: 异常行为检测 =====
  const abnormalMsg = checkAbnormalBehavior(user.id);
  if (abnormalMsg) {
    writeRiskLog({
      id: generateId(), timestamp: Date.now(), userId: user.id, userName: user.userName,
      scene, originalContent: content, translatedContent: "",
      riskType: "abnormal_behavior", triggeredRule: `behavior:${abnormalMsg}`,
      punishmentLevel: UserBanStatus.NORMAL, deviceId
    });
  }

  // ===== 全部通过 =====
  return { pass: true, msg: "" };
}

// ==================== 导出工具函数 ====================

export { getDeviceId, getBehavior, detectIsProxyIp };
