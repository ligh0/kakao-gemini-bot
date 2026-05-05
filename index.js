const express = require("express");

const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  const userMessage = req.body.userRequest.utterance;
  const API_KEY = process.env.GEMINI_API_KEY;
  const MODEL = "gemini-1.5-flash";
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userMessage }] }],
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ]
      })
    });

    const data = await response.json();

    // 로그에서 데이터 확인용 (문제 생기면 이거 보면 됨)
    console.log("Gemini Raw Data:", JSON.stringify(data));

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const replyText = data.candidates[0].content.parts[0].text;
      res.json({
        version: "2.0",
        template: { outputs: [{ simpleText: { text: replyText } }] }
      });
    } else {
      console.error("Gemini Response Error:", data);
      res.json({
        version: "2.0",
        template: { outputs: [{ simpleText: { text: "제미나이가 대답을 거부했어요. 다른 질문을 해주세요!" } }] }
      });
    }
  } catch (error) {
    console.error("Critical Error:", error);
    res.json({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: "서버에서 오류가 발생했습니다." } }] }
    });
  }
});

app.get("/", (req, res) => res.send("카카오 제미나이 챗봇 서버 작동 중!"));
app.get("/health", (req, res) => res.status(200).send("OK"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`서버 실행 포트: ${PORT}`));
