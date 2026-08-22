import { BrainInput, ReviewerMode, RiskLevel } from "./types";

export interface RecommendationEntry {
  id: string;
  recommendation: string;
  intent: string;
  risk: RiskLevel;
  createdAt: string;
}

export class JimmyReviewer {
  private readonly entries: RecommendationEntry[] = [];

  review(input: BrainInput, reply: string, intent: string, risk: RiskLevel, mode: ReviewerMode) {
    if (mode === "off") return undefined;
    let recommendation: string | undefined;
    if (risk === "high") {
      recommendation = "คำสั่งนี้กระทบระบบ ควรตรวจ environment, downtime และ rollback plan ก่อนทุกครั้ง";
    } else if (risk === "medium") {
      recommendation = "ควรตรวจปลายทางและดูตัวอย่างผลลัพธ์ก่อนยืนยันการเปลี่ยนแปลง";
    } else if (/(โพสต์|content|คอนเทนต์)/i.test(input.text) && (input.text.length > 160 || mode === "strict")) {
      recommendation = "ลองเตรียมเวอร์ชันสั้น 3 บรรทัดสำหรับการอ่านเร็วบน Telegram เพิ่มด้วยครับ";
    } else if (mode === "strict" && reply.length > 900) {
      recommendation = "คำตอบค่อนข้างยาว ควรแยกเป็นหัวข้อสั้น ๆ เพื่ออ่านบนมือถือได้ง่ายขึ้น";
    }
    if (recommendation) {
      this.entries.push({
        id: `${Date.now()}-${this.entries.length}`,
        recommendation,
        intent,
        risk,
        createdAt: new Date().toISOString(),
      });
      if (this.entries.length > 50) this.entries.splice(0, this.entries.length - 50);
    }
    return recommendation;
  }

  getSafeSummary(mode: ReviewerMode) {
    return { mode, recommendations: [...this.entries].reverse() };
  }
}