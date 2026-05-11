const express = require("express");
const app = express();

app.use(express.json());

// Gemini 설정
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash-lite";

/**
 * 카카오 챗봇 Webhook
 *
 * 동작 방식:
 * 1. Gemini 호출 시작
 * 2. 최대 4.5초까지 기다림
 * 3. 4.5초 안에 답이 오면 -> 바로 최종 답변 반환
 * 4. 4.5초를 초과하거나 오류 발생 -> "잠시만 기다려 주세요 😊" 반환
 */
app.post("/webhook", async (req, res) => {
  const userMessage = req.body.userRequest?.utterance || "안녕";

  const API_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  // 4.5초 타임아웃용 Promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("TIMEOUT"));
    }, 4500);
  });

  // Gemini 호출 Promise
  const geminiPromise = (async () => {
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
                // 프롬프트 최소화
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

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();

    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "잘 모르겠어요."
    );
  })();

  try {
    // Gemini와 4.5초 타임아웃 중 먼저 끝나는 쪽 선택
    const replyText = await Promise.race([
      geminiPromise,
      timeoutPromise,
    ]);

    // 4.5초 안에 Gemini 응답이 완료된 경우
    res.status(200).json({
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
  }
});

// 상태 확인용
app.get("/", (req, res) => {
  res.status(200).send("Kakao Gemini Bot is running!");
});

module.exports = app;
