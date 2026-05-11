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
            // 시스템 프롬프트를 사용자 메시지 앞에 살짝 붙여서 짧은 답변 유도
            text: `너는 카카오톡 챗봇이야. 답변은 무조건 3문장 이내로 아주 간결하고 친절하게 대답해줘. 질문: ${userMessage}` 
          }] 
        }],
        generationConfig: {
          maxOutputTokens: 200, // 답변 길이를 제한해서 속도 확보
          temperature: 0.7,
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
    console.error("Critical Error:", error);
  }

  // 실패 시 기본 응답
  res.json({
    version: "2.0",
    template: {
      outputs: [{ simpleText: { text: "지금은 대화가 조금 어렵네요. 짧게 다시 말씀해 주시겠어요?" } }]
    }
  });
});

app.get("/", (req, res) => res.send("카카오 챗봇 서버 작동 중!"));
app.get("/health", (req, res) => res.status(200).send("OK"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`서버 포트 ${PORT} 실행 중`));
