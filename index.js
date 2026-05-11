const express = require("express");
const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  const userMessage = req.body.userRequest.utterance;
  const API_KEY = process.env.GEMINI_API_KEY;
  const MODEL = "gemini-3.1-flash-lite-preview"; 
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            // 지시사항을 더 강력하고 짧게 수정
            text: `카톡 챗봇이야. 2문장 내로 핵심만 짧게 대답해. 질문: ${userMessage}` 
          }] 
        }],
        generationConfig: {
          maxOutputTokens: 150, // 길이를 확 줄여서 전송 속도 업그레이드
          temperature: 0.5,     // 낮을수록 답변 속도가 빨라짐
        }
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates[0]) {
      const replyText = data.candidates[0].content.parts[0].text;
      return res.json({
        version: "2.0",
        template: {
          outputs: [{ simpleText: { text: replyText } }]
        }
      });
    }
  } catch (error) {
    console.error("Timeout or Error:", error);
  }

  // 5초 임박 시 카톡 에러 알림 대신 보낼 기본 메시지
  if (!res.headersSent) {
    res.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "방금 답변을 준비했는데 카톡이 끊겼네요! 한 번만 더 말씀해 주시겠어요?" } }]
      }
    });
  }
});

app.get("/health", (req, res) => res.status(200).send("OK"));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`서버 실행 중: ${PORT}`));
