// src/utils/aiMatch.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Initialize the API
// Note: For a real production app, use process.env.REACT_APP_GEMINI_KEY
const API_KEY = "AIzaSyAqXQCMaxgi6aA54Q8uy8bItwarOHt8lQw"; 
const genAI = new GoogleGenerativeAI(API_KEY);

export const checkMatch = async (lostText, foundText) => {
  try {
    // 2. Select the "Flash" model (It is free and fast)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 3. Create the prompt
    const prompt = `
      You are a Lost and Found AI. Compare these two items.
      
      Item A (Lost): "${lostText}"
      Item B (Found): "${foundText}"
      
      Rules:
      1. Analyze synonyms (e.g., "Specs" = "Glasses").
      2. Analyze typos.
      3. Return a JSON object with a single field "score".
      4. "score" must be a number between 0.0 (no match) and 1.0 (perfect match).
      
      Output ONLY the JSON. No markdown.
    `;

    // 4. Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 5. Clean the output (Remove Markdown if AI adds it)
    const jsonString = text.replace(/```json|```/g, '').trim();
    const data = JSON.parse(jsonString);

    return data.score || 0;

  } catch (error) {
    console.error("AI Match Error:", error);
    // If API fails (internet or quota), return 0 to keep app working
    return 0;
  }
};