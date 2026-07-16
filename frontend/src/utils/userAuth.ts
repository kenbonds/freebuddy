/**
 * 用户认证简易工具
 * 配合论坛/好友/风控模块使用
 */
import type { SimpleUser, UserBanStatus } from "@/types/chat";

const USER_STORAGE_KEY = "freebuddy_current_user";

// 当前内存用户
let currentUser: SimpleUser | null = null;

// 设置当前登录用户
export function setCurrentUser(user: SimpleUser | null): void {
  currentUser = user;
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

// 获取当前用户
export function getCurrentUser(): SimpleUser | null {
  if (currentUser) return currentUser;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    currentUser = raw ? (JSON.parse(raw) as SimpleUser) : null;
    return currentUser;
  } catch {
    return null;
  }
}

// 清除登录状态
export function clearUser(): void {
  currentUser = null;
  localStorage.removeItem(USER_STORAGE_KEY);
}

// 生成临时用户（开发/演示用）
export function createGuestUser(): SimpleUser {
  return {
    id: `guest_${Date.now()}`,
    userName: "访客",
    banStatus: 0 as UserBanStatus
  };
}
