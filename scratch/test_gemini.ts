import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { callGeminiRaw } from "../src/lib/ai/gemini.ts";



async function testRealPrompt() {
  const prompt = "I need ergonomic setups for 5 developers under ₹60,000. Delivery within 7 days and negotiate the best possible price.";
  console.log("Calling Gemini with prompt:", prompt);
  try {
    const rawOutput = await callGeminiRaw(prompt);
    console.log("SUCCESS! Gemini Raw Output:\n", rawOutput);
  } catch (err: any) {
    console.error("Gemini Error:", err.message);
  }
}

testRealPrompt();
