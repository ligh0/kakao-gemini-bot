const express = require("express");

const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  const userMessage = req.body.userRequest.utterance;
  const API_KEY = process.env.GEMINI_API_KEY;
  
  // 캡처 화면에 있는 가장 최신 모델인 Gemini 3 Flash Preview 사용
  const MODEL = "gemini-3-flash-preview"; 
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userMessage }] }]
      })
    });

    const data = await response.json();
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
      console.error("Gemini Response Error:", data);
      res.json({
        version: "2.0",
        template: {
          outputs: [{ simpleText: { text: "새로운 모델이라 대답을 생성하는 데 문제가 생겼나 봐요. 다시 말씀해 주세요!" } }]
        }
      });
    }
  } catch (error) {
    console.error("Critical Error:", error);
    res.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "서버 연결 오류가 발생했습니다." } }]
      }
    });
  }
});

app.get("/", (req, res) => res.send("카카오 Gemini 3 챗봇 서버 작동 중!"));
app.get("/health", (req, res) => res.status(200).send("OK"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`서버 실행 포트: ${PORT}`));
