import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateText } from "ai";
import dotenv from "dotenv";

dotenv.config();

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
});

async function main() {
  try {
    const result = await generateText({
      model: deepseek("deepseek-chat"),
      prompt: "Hello",
    });

    console.log("✅ API 密钥有效!");
    console.log("响应:", result.text);
  } catch (error) {
    console.log("❌ API 调用失败:");
    console.error(error);
  }
}

main();
