export type ErrorType =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limit"
  | "offline";

export type Surface =
  | "chat"
  | "auth"
  | "api"
  | "stream"
  | "database"
  | "history"
  | "vote"
  | "document"
  | "suggestions"
  | "activate_gateway";

export type ErrorCode = `${ErrorType}:${Surface}`;

export type ErrorVisibility = "response" | "log" | "none";

export const visibilityBySurface: Record<Surface, ErrorVisibility> = {
  database: "log",
  chat: "response",
  auth: "response",
  stream: "response",
  api: "response",
  history: "response",
  vote: "response",
  document: "response",
  suggestions: "response",
  activate_gateway: "response",
};

export class ChatbotError extends Error {
  type: ErrorType;
  surface: Surface;
  statusCode: number;

  constructor(errorCode: ErrorCode, cause?: string) {
    super();

    const [type, surface] = errorCode.split(":");

    this.type = type as ErrorType;
    this.cause = cause;
    this.surface = surface as Surface;
    this.message = getMessageByErrorCode(errorCode);
    this.statusCode = getStatusCodeByType(this.type);
  }

  toResponse() {
    const code: ErrorCode = `${this.type}:${this.surface}`;
    const visibility = visibilityBySurface[this.surface];

    const { message, cause, statusCode } = this;

    if (visibility === "log") {
      console.error({
        code,
        message,
        cause,
      });

      return Response.json(
        { code: "", message: "出了点问题，请稍后再试。" },
        { status: statusCode }
      );
    }

    return Response.json({ code, message, cause }, { status: statusCode });
  }
}

export function getMessageByErrorCode(errorCode: ErrorCode): string {
  if (errorCode.includes("database")) {
    return "执行数据库查询时出错。";
  }

  switch (errorCode) {
    case "bad_request:api":
      return "请求无法处理，请检查输入后重试。";

    case "bad_request:activate_gateway":
      return "AI 网关需要有效的信用卡才能处理请求。请访问 https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card 添加信用卡并解锁免费额度。";

    case "unauthorized:auth":
      return "请先登录后再继续。";
    case "forbidden:auth":
      return "您的账号无权访问此功能。";

    case "rate_limit:chat":
      return "您已超过当日最大消息数量限制，请稍后再试。";
    case "not_found:chat":
      return "未找到请求的对话，请检查对话 ID 后重试。";
    case "forbidden:chat":
      return "此对话属于其他用户，请检查对话 ID 后重试。";
    case "unauthorized:chat":
      return "请登录以查看此对话，请先登录后重试。";
    case "offline:chat":
      return "发送消息时遇到问题，请检查网络连接后重试。";

    case "not_found:document":
      return "未找到请求的文档，请检查文档 ID 后重试。";
    case "forbidden:document":
      return "此文档属于其他用户，请检查文档 ID 后重试。";
    case "unauthorized:document":
      return "请登录以查看此文档，请先登录后重试。";
    case "bad_request:document":
      return "创建或更新文档的请求无效，请检查输入后重试。";

    default:
      return "出了点问题，请稍后再试。";
  }
}

function getStatusCodeByType(type: ErrorType) {
  switch (type) {
    case "bad_request":
      return 400;
    case "unauthorized":
      return 401;
    case "forbidden":
      return 403;
    case "not_found":
      return 404;
    case "rate_limit":
      return 429;
    case "offline":
      return 503;
    default:
      return 500;
  }
}
