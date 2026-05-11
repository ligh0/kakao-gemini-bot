const express = require("express");
const app = express();

app.use(express.json());

// Vercel 배포 주소
const BASE_URL = "https://kakao-gemini-bot-gold.vercel.app";

// Gemini 설정
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash-lite";

/**
 * 1. 카카오 챗봇 Webhook
 * - 즉시 "잠시만 기다려 주세요" 응답
 * - 비동기로 /process 호출
 */
app.post("/webhook", async (req, res) => {
  const userMessage = req.body.userRequest?.utterance || "안녕";
  const userId = req.body.userRequest?.user?.id || "unknown";

  // 카카오톡에 즉시 응답
  res.json({
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: "잠시만 기다려 주세요 😊"
          }
        }
      ]
    }
  });

  // 백그라운드 처리 시작 (응답 기다리지 않음)
  try {
    fetch(`${BASE_URL}/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId,
        userMessage
      })
    }).catch((err) => {
      console.error("Background fetch error:", err);
    });
  } catch (err) {
    console.error("Webhook error:", err);
  }
});

/**
 * 2. 실제 Gemini 처리
 * - 질문을 Gemini에 전달
 * - 결과를 로그에 출력
 * - 향후 카카오 메시지 API로 전송 가능
 */
app.post("/process", async (req, res) => {
  const { userId, userMessage } = req.body;

  const API_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `카톡 봇이야. 10자 내외로 아주 짧게 대답해. 질문: ${userMessage}`
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 40,
          temperature: 0.1
        }
      })
    });

    const data = await response.json();

    const replyText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "잠시 후 다시 말씀해 주세요!";

    // 결과 확인용 로그
    console.log("=================================");
    console.log("사용자 ID:", userId);
    console.log("질문:", userMessage);
    console.log("Gemini 답변:", replyText);
    console.log("=================================");

    // TODO:
    // 여기에 카카오 메시지 API를 호출해서
    // userId에게 replyText를 전송하면 완성됨.
    //
    // await sendKakaoMessage(userId, replyText);

    res.json({
      success: true,
      replyText
    });
  } catch (error) {
    console.error("Process Error:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 3. 상태 확인용
 */
app.get("/", (req, res) => {
  res.send("Kakao Gemini Bot is running!");
});

module.exports = app;
