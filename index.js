const express = require("express");
const app = express();

app.use(express.json());

// Gemini 설정
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash-lite";

app.post("/webhook", async (req, res) => {
  const userMessage = req.body.userRequest?.utterance || "안녕";

  const API_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  // 4.5초 안에 응답이 없으면 중단
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                // 프롬프트 최소화
                text: `10자 이내로 답해: ${userMessage}`
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 20, // 출력 최소화
          temperature: 0       // 추론 변동 최소화
        }
      })
    });

    clearTimeout(timeout);

    const data = await response.json();

    const replyText =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "잘 모르겠어요.";

    res.status(200).json({
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: replyText
            }
          }
        ]
      }
    });
  } catch (error) {
    clearTimeout(timeout);

    // 4.5초를 넘기거나 오류 발생 시
    console.error("Gemini Error:", error.message);

    res.status(200).json({
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: "잠시 후 다시 말씀해 주세요 😊"
            }
          }
        ]
      }
    });
  }
});

// 상태 확인용
app.get("/", (req, res) => {
  res.status(200).send("Kakao Gemini Bot is running!");
});

module.exports = app;
