import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ Error: GEMINI_API_KEY is not defined in .env file.");
  process.exit(1);
}

// Bypass SSL for local testing if needed
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

console.log("🔑 API Key detected:", apiKey.substring(0, 10) + "...");
const ai = new GoogleGenAI({ apiKey });

async function runTests() {
  console.log("\n--- Starting Gemini API Capability Tests ---\n");

  // Test 1: Content Generation (gemini-2.5-flash or gemini-1.5-flash or gemini-3.5-flash)
  const textModel = "gemini-2.5-flash"; // let's try 2.5-flash as default, or 3.5-flash used in code
  const codeModel = "gemini-3.5-flash";
  
  console.log(`🤖 Test 1: Testing text generation with model "${codeModel}"...`);
  try {
    const response = await ai.models.generateContent({
      model: codeModel,
      contents: "Hello! Tell me a one-sentence joke about robots.",
    });
    console.log("✅ Text Generation Success!");
    console.log("💬 Response:", response.text);
  } catch (error: any) {
    console.error("❌ Text Generation Failed:", error.message);
  }

  // Test 2: Image Generation (imagen-3.0-generate-002)
  const imageModel = "imagen-3.0-generate-002";
  console.log(`\n🎨 Test 2: Testing image generation with standard model "${imageModel}"...`);
  try {
    const response = await ai.models.generateImages({
      model: imageModel,
      prompt: "A minimalist cute robot avatar, digital art",
      config: {
        numberOfImages: 1,
        outputMimeType: "image/jpeg",
        aspectRatio: "1:1",
      },
    });
    if (response.generatedImages?.[0]?.image?.imageBytes) {
      console.log("✅ Image Generation Success with imagen-3.0-generate-002!");
      console.log("🖼️ Image Bytes received: ", response.generatedImages[0].image.imageBytes.substring(0, 50) + "...");
    } else {
      console.log("❌ No image data returned.");
    }
  } catch (error: any) {
    console.error("❌ Image Generation Failed with imagen-3.0-generate-002:", error.message);
  }

  // Test 3: Image Generation with code's model (gemini-3.1-flash-lite-image)
  const codeImgModel = "gemini-3.1-flash-lite-image";
  console.log(`\n🎨 Test 3: Testing image generation with code's model "${codeImgModel}"...`);
  try {
    const response = await ai.models.generateContent({
      model: codeImgModel,
      contents: {
        parts: [{ text: "A minimalist cute robot avatar" }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      } as any
    });
    console.log("✅ Image Generation Success with gemini-3.1-flash-lite-image!");
    console.log("💬 Response:", response.text ? response.text.substring(0, 100) : "No text, check parts...");
  } catch (error: any) {
    console.error(`❌ Image Generation Failed with ${codeImgModel}:`, error.message);
  }
}

runTests();
