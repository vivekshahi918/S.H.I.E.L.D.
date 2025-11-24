// Run this file with: node check-models.js
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  console.log("Checking API Key...");
  try {
    // This is a test prompt to see if the model responds
    const result = await model.generateContent("Hello, are you there?");
    const response = await result.response;
    console.log("✅ SUCCESS! 'gemini-latest' is working.");
    console.log("Response:", response.text());
  } catch (error) {
    console.log("❌ ERROR: Could not connect to model.");
    console.log(error.message);
  }
}

listModels();