const express = require("express");
const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  const userMessage = req.body.userRequest?.utterance || "안녕";
  const API_KEY = process.env.GEMINI_API_KEY;
  const MODEL = "gemini-3.1-flash-lite-preview"; 
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `카톡 챗봇이야. 2문장 내로 짧고 친절하게 대답해. 질문: ${userMessage}` }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.7 }
      })
    });

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "잠시 후 다시 시도해 주세요.";

    res.json({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: replyText } }] }
    });
  } catch (error) {
    res.json({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: "서버가 바빠요! 다시 말씀해 주세요." } }] }
    });
  }
});

// Vercel용 익스포트
module.exports = app;
