const express = require("express");
const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  const userMessage = req.body.userRequest.utterance;
  const API_KEY = process.env.GEMINI_API_KEY;
  const MODEL = "gemini-3.1-flash-lite-preview"; 
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  // 1. 카카오 5초 제한을 지키기 위한 4.7초 타임아웃
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4700);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal, 
      body: JSON.stringify({
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: {
          maxOutputTokens: 1000, // 길이는 유지!
          temperature: 0.7,
        }
      })
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (data.candidates && data.candidates[0]) {
      const replyText = data.candidates[0].content.parts[0].text;
      return res.json({
        version: "2.0",
        template: { outputs: [{ simpleText: { text: replyText } }] }
      });
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log("4.7초 초과! 타임아웃 발생");
      // 2. 시간이 초과되었을 때 '응답 오류' 알림 대신 보낼 최소한의 멘트
      return res.json({
        version: "2.0",
        template: {
          outputs: [{ simpleText: { text: "내용이 길어서 정리 중이에요! 3초만 있다가 다시 한번 '뭐해'라고 물어봐 주시면 바로 보여드릴게요! 🙏" } }]
        }
      });
    }
  }

  // 예외 상황 발생 시
  if (!res.headersSent) {
    res.json({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: "잠시 후 다시 시도해 주세요." } }] }
    });
  }
});

app.get("/health", (req, res) => res.status(200).send("OK"));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`서버 실행 중: ${PORT}`));
