const express = require("express");

const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  const userMessage = req.body.userRequest.utterance;
  const API_KEY = process.env.GEMINI_API_KEY;
  
  // 최신 모델인 Gemini 3.1 Flash Lite 사용
  const MODEL = "gemini-3.1-flash-lite-preview"; 
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: {
          maxOutputTokens: 400, // 답변 길이를 줄여서 카톡 5초 제한 안에 들어오도록 최적화
          temperature: 0.7,
        }
      })
    });

    const data = await response.json();
    
    // 로그 확인용
    console.log("Gemini Raw Data:", JSON.stringify(data));

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const replyText = data.candidates[0].content.parts[0].text;
      res.json({
        version: "2.0",
        template: {
          outputs: [{ simpleText: { text: replyText } }]
        }
      });
    } else {
      // 503 에러나 답변 거부 시 처리
      console.error("Gemini Error or Denied:", data);
      res.json({
        version: "2.0",
        template: {
          outputs: [{ simpleText: { text: "잠시 대화가 어려워요. 조금만 있다가 다시 말을 걸어주세요!" } }]
        }
      });
    }
  } catch (error) {
    console.error("Critical Error:", error);
    res.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "서버가 잠시 아파요. 금방 돌아올게요!" } }]
      }
    });
  }
});

// 기본 경로 및 헬스체크 (Cron-job용)
app.get("/", (req, res) => res.send("카카오 제미나이 봇 작동 중!"));
app.get("/health", (req, res) => res.status(200).send("OK"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`서버가 포트 ${PORT}에서 실행 중!`));
