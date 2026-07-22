/**
 * 全前端页面文案统一管理，杜绝页面内硬编码中英文混杂
 */
export const CN_TEXT = {
  appTitle: "自由搭档 FreeBuddy",
  dashboard: "项目总控制台",
  projectManage: "项目管理",
  ticketManage: "工单管理",
  agentCenter: "智能工作人员",
  pipelineCheck: "自动化质检流水线",
  modelConfig: "大模型配置",
  archiveManage: "归档封存",
  auditLog: "审计日志",
  goalManage: "目标驱动",
  knowledgeManage: "知识库",
  chatMode: "对话模式",
  engineeringMode: "工程模式",
  systemSettings: "系统设置",

  // 工单六态
  ticketStatus: {
    waitAssign: "待认领",
    processing: "处理中",
    pendingReview: "待复核",
    rejected: "测试驳回",
    finished: "已办结",
    archived: "归档封存"
  },

  // 六大角色
  agentRole: {
    arch: "架构规划员",
    dev: "开发执行员",
    test: "测试校验员",
    ops: "运维部署员",
    doc: "文档归档员",
    claw: "工单管控引擎"
  },

  btn: {
    create: "新建",
    confirm: "确认",
    cancel: "取消",
    assign: "指派",
    submitReview: "提交复核",
    reject: "驳回",
    finish: "标记办结",
    archive: "项目归档并锁定只读",
    delete: "删除",
    refresh: "刷新",
    export: "导出日志"
  },

  tip: {
    quotaExhaust: "当前绑定模型调用额度已用尽，可新增其他模型配置或补充账号额度继续使用",
    archiveRepeat: "该项目已归档，不可重复操作",
    noTicketAssign: "工单未指派角色，无法执行任务",
    wsConnectSuccess: "实时日志通道已连接",
    wsConnectFail: "实时日志连接断开"
  },

  table: {
    id: "编号",
    name: "名称",
    desc: "描述",
    status: "状态",
    createTime: "创建时间",
    operate: "操作",
    content: "内容",
    modelAlias: "别名",
    baseUrl: "接口地址",
    apiKey: "密钥",
    modelName: "模型名称",
    logType: "日志类型",
    logContent: "日志详情",
    time: "记录时间"
  }
};
