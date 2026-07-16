/**
 * 论坛社区、好友私聊、风控封禁 全局类型定义
 * 零Any、严格校验、适配全部业务场景
 */

// 互联网论坛分区枚举
export enum ForumCategory {
  OFFICE = "office",
  DEVELOP = "develop"
}

// 论坛帖子结构
export interface ForumPostItem {
  id: string;
  userId: string;
  userName: string;
  category: ForumCategory;
  title: string;
  content: string;
  createTime: string;
}

// 论坛全局状态
export interface ForumState {
  activeCategory: ForumCategory;
  postList: ForumPostItem[];
  loading: boolean;
}

// 系统内置5种UI母语
export type ClientLangType = "zh-CN" | "en-US" | "ja-JP" | "ko-KR" | "hi-IN";

// 风控场景
export type RiskScene = "forum_post" | "private_chat";

// 用户账号处罚级别（兼容旧版存储：0=正常 1=永久封禁 2=警告 3=临时禁言24H）
export enum UserBanStatus {
  NORMAL = 0,
  PERMANENT_BAN = 1,
  WARNING = 2,
  MUTE_24H = 3
}

// 用户基础信息（简化版）
export interface SimpleUser {
  id: string;
  userName: string;
  banStatus: UserBanStatus;
  muteUntil?: number;
}

// IP永久黑名单结构
export interface IpBlackItem {
  ip: string;
  userId: string;
  userName: string;
  violateContent: string;
  violateCategory: string;
  banTime: string;
  isPermanent: boolean;
}

// 风控校验返回结构
export interface RiskCheckRes {
  pass: boolean;
  msg: string;
}

// 风控审计日志条目
export interface RiskLogItem {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  scene: RiskScene;
  originalContent: string;
  translatedContent: string;
  riskType: string;
  triggeredRule: string;
  punishmentLevel: UserBanStatus;
  deviceId: string;
}

// 用户行为指标
export interface BehaviorMetrics {
  userId: string;
  postTimestamps: number[];
  lastContents: string[];
  lastContentTime: number;
  sceneSwitchCount: number;
  privateChatNewUserCount: number;
  duplicateCount: number;
}

// AI语义审核结果
export interface AiReviewResult {
  pass: boolean;
  riskType: string;
  reason: string;
  confidence: number;
}

// 好友关系结构
export interface UserFriendItem {
  id: string;
  userId: string;
  friendId: string;
  friendName: string;
  createTime: string;
}

// 一对一私聊消息结构
export interface PrivateChatItem {
  id: string;
  sendUserId: string;
  receiveUserId: string;
  content: string;
  createTime: string;
}
