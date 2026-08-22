/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParsedCommand } from "../types";

// Levenshtein Distance for fuzzy matching
function getLevenshteinDistance(a: string, b: string): number {
  const tmp = [];
  let i, j;
  for (i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (i = 1; i <= a.length; i++) {
    for (j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

const COMMON_COMMANDS = ["start", "help", "promo", "rules", "ban", "mute", "warn", "unmute", "unban", "kick", "broadcast", "config", "settings"];

export function fuzzyCorrectCommand(name: string): { corrected: string; score: number } | null {
  let bestMatch: string | null = null;
  let lowestScore = 999;

  for (const cmd of COMMON_COMMANDS) {
    const dist = getLevenshteinDistance(name.toLowerCase(), cmd);
    if (dist < lowestScore && dist <= 2) {
      lowestScore = dist;
      bestMatch = cmd;
    }
  }

  if (bestMatch && bestMatch !== name.toLowerCase()) {
    return { corrected: bestMatch, score: lowestScore };
  }
  return null;
}

/**
 * Splits a command line into arguments, respecting single and double quotes.
 * E.g. `/ban @somchai 7d --reason="spammed links"` 
 * -> ['/ban', '@somchai', '7d', '--reason=spammed links']
 */
export function tokenizeCommandLine(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inDoubleQuotes = false;
  let inSingleQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === '"' && !inSingleQuotes) {
      inDoubleQuotes = !inDoubleQuotes;
      // Do not add the quote character itself
      continue;
    }

    if (char === "'" && !inDoubleQuotes) {
      inSingleQuotes = !inSingleQuotes;
      // Do not add the quote character itself
      continue;
    }

    if (char === " " && !inDoubleQuotes && !inSingleQuotes) {
      if (current.trim()) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Parses a command string and extracts structured info.
 */
export function parseBotCommand(inputString: string): ParsedCommand {
  const trimmed = inputString.trim();
  
  if (!trimmed) {
    return {
      isValid: false,
      prefix: "",
      commandName: "",
      originalCommandName: "",
      didFuzzyMatch: false,
      positionalArgs: [],
      namedArgs: {},
      ambiguities: ["ข้อความว่างเปล่า"],
      error: "กรุณาใส่ข้อความคำสั่งบอท"
    };
  }

  const firstChar = trimmed[0];
  const isSlash = firstChar === "/" || firstChar === "!";
  
  if (!isSlash) {
    return {
      isValid: false,
      prefix: "",
      commandName: "",
      originalCommandName: "",
      didFuzzyMatch: false,
      positionalArgs: [],
      namedArgs: {},
      ambiguities: ["ไม่มีเครื่องหมายนำหน้าคำสั่ง (/ หรือ !)"],
      error: "คำสั่ง Telegram Bot ต้องเริ่มต้นด้วยเครื่องหมายสแลช '/' เสมอ (เช่น /help)"
    };
  }

  const tokens = tokenizeCommandLine(trimmed);
  const firstToken = tokens[0];
  const commandPart = firstToken.slice(1); // remove '/' or '!'
  
  // Ambiguity: command contains @botname (e.g., /ban@bot_jimmy)
  let commandName = commandPart;
  let botTargetSuffix = "";
  if (commandPart.includes("@")) {
    const parts = commandPart.split("@");
    commandName = parts[0];
    botTargetSuffix = parts[1];
  }

  // Fuzzy check
  const fuzzy = fuzzyCorrectCommand(commandName);
  const originalCommandName = commandName;
  let didFuzzyMatch = false;
  if (fuzzy) {
    commandName = fuzzy.corrected;
    didFuzzyMatch = true;
  }

  const positionalArgs: string[] = [];
  const namedArgs: Record<string, string | boolean> = {};
  const ambiguities: string[] = [];
  let target: ParsedCommand["target"] = undefined;

  if (botTargetSuffix) {
    ambiguities.push(`ระบุปลายทางเจาะจงบอท: @${botTargetSuffix}`);
  }

  // Parse remaining tokens
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];

    // Check if token is a flag/named argument (e.g. --reason="spam" or -d=7d or --force)
    if (token.startsWith("-")) {
      // It's a flag
      const isDoubleDash = token.startsWith("--");
      const cleanToken = isDoubleDash ? token.slice(2) : token.slice(1);
      
      if (cleanToken.includes("=")) {
        const eqIdx = cleanToken.indexOf("=");
        const key = cleanToken.slice(0, eqIdx);
        const val = cleanToken.slice(eqIdx + 1);
        namedArgs[key] = val;
      } else {
        // Look ahead for value if next token is not a flag and is not a target
        const nextToken = tokens[i + 1];
        if (nextToken && !nextToken.startsWith("-") && !nextToken.startsWith("@") && isNaN(Number(nextToken))) {
          namedArgs[cleanToken] = nextToken;
          i++; // skip next token
        } else {
          // Boolean flag
          namedArgs[cleanToken] = true;
        }
      }
    } else if (token.startsWith("@")) {
      // Username target (e.g. @somchai)
      if (target) {
        ambiguities.push(`พบเป้าหมายซ้ำซ้อน: '${target.value}' และ '${token}' (แนะนำให้ระบุแค่คนเดียว)`);
      }
      target = {
        type: "username",
        value: token
      };
    } else if (/^\d{8,12}$/.test(token)) {
      // User ID target (e.g. 123456789)
      if (target) {
        ambiguities.push(`พบเป้าหมายซ้ำซ้อน: '${target.value}' และ ID '${token}'`);
      }
      target = {
        type: "userid",
        value: token
      };
    } else {
      // Positional argument
      positionalArgs.push(token);
    }
  }

  // Detect potential ambiguities
  // E.g. Ambiguity: Positional argument after flags
  let seenFlag = false;
  let outOfOrderArg = false;
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i].startsWith("-")) {
      seenFlag = true;
    } else if (seenFlag && !tokens[i - 1].startsWith("-") && tokens[i - 1].includes("=") === false) {
      outOfOrderArg = true;
    }
  }
  if (outOfOrderArg) {
    ambiguities.push("อาร์กิวเมนต์แบบลำดับอยู่หลังธงสวิตช์ (Flags) อาจทำให้การวิเคราะห์สับสน");
  }

  // E.g. Ambiguity: Duration vs Reason format
  const durationRegex = /^(\d+)(d|h|m|s)$/i;
  let hasDurationPositional = false;
  for (const arg of positionalArgs) {
    if (durationRegex.test(arg)) {
      hasDurationPositional = true;
      if (!namedArgs["duration"]) {
        namedArgs["duration"] = arg; // Auto-resolve ambiguity to namedArgs
      }
    }
  }
  if (hasDurationPositional && !namedArgs["duration"]) {
    ambiguities.push("พบอาร์กิวเมนต์เวลาแบบลำดับ แนะนำให้ระบุเป็นแอตทริบิวต์เจาะจง เช่น --duration=7d");
  }

  // Suggest actions
  let executionSuggestion = "";
  if (commandName === "ban") {
    const tVal = target ? target.value : "สมาชิก";
    const duration = namedArgs["duration"] || "ถาวร";
    const reason = namedArgs["reason"] || positionalArgs.join(" ") || "ไม่ระบุสาเหตุ";
    executionSuggestion = `ดำเนินการบล็อก ${tVal} เป็นเวลา [${duration}] ข้อหา: "${reason}"`;
  } else if (commandName === "mute") {
    const tVal = target ? target.value : "สมาชิก";
    const duration = namedArgs["duration"] || "24 ชั่วโมง";
    const reason = namedArgs["reason"] || positionalArgs.join(" ") || "ทำผิดกฎ";
    executionSuggestion = `ดำเนินการปิดเสียง ${tVal} เป็นเวลา [${duration}] ข้อหา: "${reason}"`;
  } else if (commandName === "warn") {
    const tVal = target ? target.value : "สมาชิก";
    const reason = namedArgs["reason"] || positionalArgs.join(" ") || "ตักเตือนความประพฤติ";
    executionSuggestion = `เพิ่มคะแนนตักเตือนให้ ${tVal} ข้อหา: "${reason}"`;
  } else if (commandName === "broadcast") {
    const targetAudience = namedArgs["target"] || "ทั้งหมด (All)";
    const text = positionalArgs.join(" ") || "ไม่มีเนื้อหา";
    executionSuggestion = `ส่งข้อความประชาสัมพันธ์หา [กลุ่มเป้าหมาย: ${targetAudience}] เนื้อหา: "${text}"`;
  } else if (commandName === "help") {
    executionSuggestion = `เปิดแสดงคู่มือการใช้งานบอทสำหรับคำสั่ง หรือหัวข้อ: "${positionalArgs[0] || "ทั่วไป"}"`;
  } else {
    executionSuggestion = `เรียกใช้งานคำสั่งคัสตอม /${commandName} พร้อมพารามิเตอร์ ${JSON.stringify(positionalArgs)}`;
  }

  return {
    isValid: true,
    prefix: firstChar,
    commandName,
    originalCommandName,
    didFuzzyMatch,
    target,
    positionalArgs,
    namedArgs,
    ambiguities,
    executionSuggestion
  };
}
