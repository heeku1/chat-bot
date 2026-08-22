import assert from "node:assert/strict";
import test from "node:test";
import { classifyIntent } from "../server/ai/safety";
import { ALL_TOOLS, findToolByName } from "../server/ai/types";

test("natural Thai commands route to the vision-doc capabilities", () => {
  // ตัวอย่างจาก docs/vision-jimmy-brain.md
  assert.equal(classifyIntent("สร้างภาพโปรโมตให้หน่อย").intent, "generate_image");
  assert.equal(classifyIntent("เขียนโพสต์จากภาพนี้").intent, "draft_content");
  assert.equal(classifyIntent("โค้ดชุดนี้ error ตรงไหน").intent, "explain_code");
  assert.equal(classifyIntent("เช็กสมาชิกกิจกรรมวันนี้").intent, "member_check");
  assert.equal(classifyIntent("เช็กกิจกรรมวันนี้บ้าง").intent, "activity_check");
});

test("image intent does not swallow content drafting", () => {
  assert.notEqual(classifyIntent("เขียนคอนเทนต์แนะนำร้านกาแฟ").intent, "generate_image");
  assert.equal(classifyIntent("draw an image of a coffee shop").intent, "generate_image");
});

test("high-risk commands still require approval regardless of capability words", () => {
  const result = classifyIntent("deploy production แล้ว restart server");
  assert.equal(result.intent, "system_action");
  assert.equal(result.risk, "high");
});

test("tool registry covers the vision-doc capabilities", () => {
  for (const name of ["generate_image", "draft_content", "explain_code", "summarize_text", "check_members", "check_activity"]) {
    const tool = findToolByName(name);
    assert.ok(tool, `missing tool: ${name}`);
    assert.equal(tool.risk, "low");
    assert.equal(tool.requiresApproval, false);
  }
  // restricted tools stay approval-gated
  assert.equal(findToolByName("send_broadcast")?.requiresApproval, true);
  assert.ok(ALL_TOOLS.length >= 12);
});
