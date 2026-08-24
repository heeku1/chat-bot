const TELEGRAM_API_BASE = "https://api.telegram.org";
const MAX_MESSAGE_LENGTH = 3800;

export class TelegramApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errorCode?: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "TelegramApiError";
  }
}

export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  username?: string;
  first_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  chat: { id: number; type: string };
  from?: TelegramUser;
  text?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export class TelegramClient {
  constructor(private readonly token: string) {
    if (!token.trim()) throw new Error("Telegram token is required");
  }

  async getMe(signal?: AbortSignal) {
    return this.call<TelegramUser>("getMe", {}, signal);
  }

  async deleteWebhook(signal?: AbortSignal) {
    return this.call<boolean>("deleteWebhook", { drop_pending_updates: false }, signal);
  }

  async getUpdates(offset: number, signal?: AbortSignal) {
    return this.call<TelegramUpdate[]>("getUpdates", {
      offset,
      timeout: 25,
      allowed_updates: ["message", "callback_query"],
    }, signal);
  }

  async sendMessage(chatId: string | number, text: string, replyMarkup?: Record<string, unknown>) {
    const chunks = splitTelegramText(text);
    for (let index = 0; index < chunks.length; index += 1) {
      await this.call("sendMessage", {
        chat_id: chatId,
        text: chunks[index],
        disable_web_page_preview: true,
        ...(index === chunks.length - 1 && replyMarkup ? { reply_markup: replyMarkup } : {}),
      });
    }
  }

  async sendPhoto(chatId: string | number, photoUrl: string, caption?: string, replyMarkup?: Record<string, unknown>) {
    await this.call("sendPhoto", {
      chat_id: chatId,
      photo: photoUrl,
      ...(caption ? { caption: caption.slice(0, 1024) } : {}),
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string) {
    return this.call("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      ...(text ? { text: text.slice(0, 180) } : {}),
    });
  }

  private async call<T>(method: string, payload: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${this.token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
    const data = await response.json().catch(() => ({})) as {
      ok?: boolean;
      result?: T;
      description?: string;
      error_code?: number;
      parameters?: { retry_after?: number };
    };
    if (!response.ok || data.ok === false) {
      throw new TelegramApiError(
        data.description || `Telegram ${method} failed`,
        response.status,
        data.error_code,
        data.parameters?.retry_after,
      );
    }
    return data.result as T;
  }
}

export function inlineKeyboard(rows: Array<Array<{ text: string; callback_data: string }>>) {
  return { inline_keyboard: rows };
}

function splitTelegramText(text: string): string[] {
  const normalized = text.trim() || " ";
  if (normalized.length <= MAX_MESSAGE_LENGTH) return [normalized];
  const chunks: string[] = [];
  let remaining = normalized;
  while (remaining.length > MAX_MESSAGE_LENGTH) {
    let splitAt = remaining.lastIndexOf("\n", MAX_MESSAGE_LENGTH);
    if (splitAt < MAX_MESSAGE_LENGTH / 2) splitAt = remaining.lastIndexOf(" ", MAX_MESSAGE_LENGTH);
    if (splitAt < MAX_MESSAGE_LENGTH / 2) splitAt = MAX_MESSAGE_LENGTH;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}