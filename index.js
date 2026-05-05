const express = require("express");

const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  const userMessage = req.body.userRequest.utterance;
  
  // Gemini API Key는 Render의 Environment Variables에 GEMINI_API_KEY로 등록해줘!
  const API_KEY = process.env.GEMINI_API_KEY;
  const MODEL = "gemini-1.5-flash"; // 속도가 가장 빠른 플래시 모델 사용
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: userMessage }]
          }
        ],
        generationConfig: {
          maxOutputTokens: 800, // 답변 길이를 적절히 조절해서 5초 제한 방지
          temperature: 0.7,
        }
      })
    });

    const data = await response.json();
    
    // 제미나이 응답 데이터 구조에 맞춰 추출
    const replyText = data.candidates[0].content.parts[0].text;

    res.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: replyText } }],
      }
    });
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "지금은 대화가 어려워요. 잠시 후 다시 말을 걸어주세요!" } }],
      },
    });
  }
});

app.get("/", (req, res) => res.send("카카오 Gemini 챗봇 서버 실행 중!"));

// Render의 헬스체크를 위해 추가 (잠자기 방지용 경로로 사용 가능)
app.get("/health", (req, res) => res.status(200).send("OK"));

const PORT = process.env.PORT || 10000; // 렌더는 보통 10000 포트를 기본으로 사용해
app.listen(PORT, () => console.log(`서버가 포트 ${PORT}에서 실행 중이야!`));
