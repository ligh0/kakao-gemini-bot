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
        contents: [{ parts: [{ text: `카톡 챗봇이야. 무조건 1문장으로 핵심만 아주 짧게 말해줘. 질문: ${userMessage}` }] }],
        generationConfig: { 
          maxOutputTokens: 100, // 글자수를 확 줄여서 생성 시간 단축
          temperature: 0,      // 창의성 버리고 '속도'에 올인
          topP: 1,
          topK: 1
        }
      })
    });

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "잠시 후 다시 말씀해 주세요.";

    // 카톡 응답 포맷
    res.json({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: replyText } }] }
    });
  } catch (error) {
    res.json({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: "답변이 늦어 미안해요. 다시 물어봐 주세요!" } }] }
    });
  }
});

module.exports = app;
