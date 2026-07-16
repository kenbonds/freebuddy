/**
 * 全球双向多语言翻译核心
 * 核心规则：任何人发任意语种 = 所有用户自动翻译成自己浏览器母语
 * 原文永久留存，UI跟随访客本地语言，双向互通无壁垒
 * URL纯净无转义，彻底根治解析报错
 */
import { ClientLangType } from "@/types/chat";

// 自动识别浏览器客户端母语
export const getClientLang = (): ClientLangType => {
  const lang = navigator.language.toLowerCase();
  if (lang.includes("zh")) return "zh-CN";
  if (lang.includes("ja")) return "ja-JP";
  if (lang.includes("ko")) return "ko-KR";
  if (lang.includes("hi")) return "hi-IN";
  return "en-US";
};

// 5国系统UI原生话术
const langSource = {
  "zh-CN": {
    chatRoomTitle: "用户自由交流中心",
    chatNeedLogin: "请先登录系统后进入交流板块",
    chatEmptyTip: "留言内容不能为空",
    chatSendSuccess: "发送成功",
    chatInputPlaceholder: "支持任意语言自由发言，全球自动翻译互通...",
    chatSendBtn: "发送留言",
    officeZone: "办公交流专区",
    developZone: "开发交流专区",
    postTitle: "帖子标题",
    postContent: "帖子内容",
    publishPost: "发布帖子",
    myFriend: "我的好友",
    privateChat: "私聊对话"
  },
  "en-US": {
    chatRoomTitle: "User Free Chat Center",
    chatNeedLogin: "Please login first",
    chatEmptyTip: "Message cannot be empty",
    chatSendSuccess: "Sent successfully",
    chatInputPlaceholder: "Speak freely in any language, auto-translated globally...",
    chatSendBtn: "Send",
    officeZone: "Office Communication Zone",
    developZone: "Development Communication Zone",
    postTitle: "Post Title",
    postContent: "Post Content",
    publishPost: "Publish Post",
    myFriend: "My Friends",
    privateChat: "Private Chat"
  },
  "ja-JP": {
    chatRoomTitle: "ユーザー自由交流センター",
    chatNeedLogin: "ログインしてください",
    chatEmptyTip: "メッセージを空にすることはできません",
    chatSendSuccess: "送信成功",
    chatInputPlaceholder: "任意の言語で自由に発言でき、自動翻訳されます...",
    chatSendBtn: "送信",
    officeZone: "オフィス交流ゾーン",
    developZone: "開発交流ゾーン",
    postTitle: "投稿タイトル",
    postContent: "投稿内容",
    publishPost: "投稿する",
    myFriend: "友達一覧",
    privateChat: "プライベートチャット"
  },
  "ko-KR": {
    chatRoomTitle: "사용자 자유 교류 센터",
    chatNeedLogin: "먼저 로그인해 주세요",
    chatEmptyTip: "메시지는 비어 있을 수 없습니다",
    chatSendSuccess: "전송 성공",
    chatInputPlaceholder: "어떤 언어로든 자유롭게 의견을 남기세요...",
    chatSendBtn: "전송",
    officeZone: "사무 교류 구역",
    developZone: "개발 교류 구역",
    postTitle: "게시물 제목",
    postContent: "게시물 내용",
    publishPost: "게시",
    myFriend: "친구 목록",
    privateChat: "개인 채팅"
  },
  "hi-IN": {
    chatRoomTitle: "उपयोगकर्ता मुक्त चैट केंद्र",
    chatNeedLogin: "कृपया पहले लॉगिन करें",
    chatEmptyTip: "संदेश खाली नहीं हो सकता",
    chatSendSuccess: "सफलतापूर्वक भेजा गया",
    chatInputPlaceholder: "किसी भी भाषा में स्वतंत्र रूप से बात करें...",
    chatSendBtn: "भेजें",
    officeZone: "कार्यालय संचार क्षेत्र",
    developZone: "विकास संचार क्षेत्र",
    postTitle: "पोस्ट शीर्षक",
    postContent: "पोस्ट सामग्री",
    publishPost: "पोस्ट करें",
    myFriend: "मेरे दोस्त",
    privateChat: "निजी चैट"
  },
};

export const chatLangText = (lang: ClientLangType) => langSource[lang];

// 纯净无脏字符翻译请求核心函数
export const autoTranslateChat = async (content: string, targetLang: ClientLangType): Promise<string> => {
  if (!content) return content;
  // 本地语言匹配直接返回原文，无需翻译
  if (targetLang === "zh-CN" && /^[\u4e00-\u9fa5\s\p{P}]+$/u.test(content)) return content;
  if (targetLang === "en-US" && /^[a-zA-Z0-9\s\p{P}]+$/u.test(content)) return content;

  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3",
        prompt: `Translate the following text strictly to ${targetLang}, only output translation result: ${content}`,
        stream: false
      })
    });
    const data = await res.json();
    return data.response || content;
  } catch (e) {
    return content;
  }
};
