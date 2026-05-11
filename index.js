const express = require("express");
const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  const userMessage = req.body.userRequest?.utterance || "안녕";
  const API_KEY = process.env.GEMINI_API_KEY;
  // 2026년 기준 가장 빠르고 안정적인 모델
  const MODEL = "gemini-2.5-flash-lite"; 
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `카톡 봇이야. 10자 내외로 아주 짧게 대답해. 질문: ${userMessage}` }] }],
        generationConfig: { 
          maxOutputTokens: 40, 
          temperature: 0.1 // 고민 시간을 최소화해서 속도 극대화
        }
      })
    });

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "잠시 후 다시 말씀해 주세요!";

    res.json({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: replyText } }] }
    });
  } catch (error) {
    console.error("Error:", error);
    res.json({ version: "2.0", template: { outputs: [{ simpleText: { text: "서버가 잠시 바빠요!" } }] } });
  }
});

module.exports = app;
