const express = require("express");

// node-fetch v3 대응
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();

app.use(express.json());

// Gemini 설정
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash-lite";

/**
 * 카카오 챗봇 Webhook
 *
 * 동작 방식:
 * 1. Gemini API 호출 시작
 * 2. 최대 4.5초까지 기다림
 * 3. 4.5초 안에 답변이 오면 바로 최종 답변 반환
 * 4. 4.5초를 초과하거나 오류가 발생하면 안내 메시지 반환
 */
app.post("/webhook", async (req, res) => {
  const userMessage = req.body.userRequest?.utterance || "안녕";

  // API 키 확인
  if (!GEMINI_API_KEY) {
    return res.status(200).json({
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: "API 키가 설정되지 않았습니다.",
            },
          },
        ],
      },
    });
  }

  const API_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  // 4.5초 타임아웃 Promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("TIMEOUT")), 4500);
  });

  // Gemini 호출 Promise
  const geminiPromise = (async () => {
    console.log("Gemini API 호출 시작");

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
                text: `10자 이내로 답해: ${userMessage}`,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 20,
          temperature: 0,
        },
      }),
    });

    console.log("Gemini API 응답 상태:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API 오류:", errorText);
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();

    const replyText =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "잘 모르겠어요.";

    console.log("Gemini 응답:", replyText);

    return replyText;
  })();

  try {
    // Gemini 응답과 타임아웃 중 먼저 완료되는 것 선택
    const replyText = await Promise.race([
      geminiPromise,
      timeoutPromise,
    ]);

    // 4.5초 안에 완료되면 바로 응답
    return res.status(200).json({
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: replyText,
            },
          },
        ],
      },
    });
  } catch (error) {
    console.error("Gemini Timeout/Error:", error.message);

    // 4.5초 초과 또는 오류 발생
    return res.status(200).json({
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: "잠시 후 다시 말씀해 주세요 😊",
            },
          },
        ],
      },
    });
  }
});

// 상태 확인용
app.get("/", (req, res) => {
  res.status(200).send("Kakao Gemini Bot is running!");
});

module.exports = app;
