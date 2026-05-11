const express = require("express");
const app = express();

app.use(express.json());

// Vercel 배포 주소
const BASE_URL = "https://kakao-gemini-bot-gold.vercel.app";

// Gemini 설정
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash-lite";

/**
 * 카카오 챗봇 Webhook
 * 1) 먼저 /process를 비동기로 호출
 * 2) 즉시 "잠시만 기다려 주세요" 응답
 */
app.post("/webhook", async (req, res) => {
  const userMessage = req.body.userRequest?.utterance || "안녕";
  const userId = req.body.userRequest?.user?.id || "unknown";

  // 백그라운드 처리 시작 (응답 기다리지 않음)
  fetch(`${BASE_URL}/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      userMessage,
    }),
  }).catch((err) => {
    console.error("Background fetch error:", err);
  });

  // 카카오톡에 즉시 응답
  res.status(200).json({
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: "잠시만 기다려 주세요 😊",
          },
        },
      ],
    },
  });
});

/**
 * 실제 Gemini 처리
 * 현재는 결과를 Vercel 로그에만 출력함.
 * (카카오톡으로 다시 보내려면 sendKakaoMessage() 구현 필요)
 */
app.post("/process", async (req, res) => {
  const { userId, userMessage } = req.body;

  const API_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `카톡 봇이야. 10자 내외로 아주 짧게 대답해. 질문: ${userMessage}`,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 40,
          temperature: 0.1,
        },
      }),
    });

    const data = await response.json();

    const replyText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "잠시 후 다시 말씀해 주세요!";

    // 결과 로그 출력
    console.log("=================================");
    console.log("사용자 ID:", userId);
    console.log("질문:", userMessage);
    console.log("Gemini 답변:", replyText);
    console.log("=================================");

    // TODO:
    // 카카오 메시지 API를 구현하면 아래처럼 사용 가능
    // await sendKakaoMessage(userId, replyText);

    res.status(200).json({
      success: true,
      replyText,
    });
  } catch (error) {
    console.error("Process Error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 상태 확인용
 */
app.get("/", (req, res) => {
  res.status(200).send("Kakao Gemini Bot is running!");
});

module.exports = app;
