const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
console.log("GEMINI_API_KEY present:", Boolean(apiKey));

const model = process.env.AI_MODEL || "gemini-3.6-flash";
const prompt = "I need ergonomic setups for 5 developers under ₹60,000. Delivery within 7 days and negotiate the best possible price.";

async function runTest() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: "You are Buyer AI. Return JSON with productIntent, quantity, budget, requestedDiscount, deliveryMaxDays, preferences, negotiableConstraints, confidence." }]
      },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { response_mime_type: "application/json" }
    })
  });

  console.log("Response Status:", response.status);
  const data = await response.json();
  if (response.ok) {
    console.log("GEMINI RESPONSE JSON:\n", data?.candidates?.[0]?.content?.parts?.[0]?.text);
  } else {
    console.log("GEMINI ERROR:", JSON.stringify(data, null, 2));
  }
}

runTest();
