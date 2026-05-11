const express = require("express");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(express.json());

// 전역 변수로 답변 저장소(캐시) 생성
const responseCache = new Map();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash-lite";

app.post("/webhook", async (req, res) => {
  const userId = req.body.userRequest?.user?.id; // 사용자 식별값
  const userMessage = req.body.userRequest?.utterance || "안녕";
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  // 1. 이미 캐시에 저장된 답변이 있는지 확인 (사용자가 다시 말을 걸었을 때)
  if (responseCache.has(userId)) {
    const cachedReply = responseCache.get(userId);
    responseCache.delete(userId); // 사용했으니 삭제
    return res.status(200).json({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: cachedReply } }] }
    });
  }

  // 2. 답변이 없다면 Gemini 호출 시작 (비동기 처리)
  // 이 작업을 '기다리지 않고' 백그라운드에서 실행하게 함
  const geminiTask = (async () => {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userMessage }] }], // 글자수 제한 풀고 싶은 만큼 풀어도 됨!
          generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
        })
      });
      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (reply) {
        responseCache.set(userId, reply); // 답변이 완성되면 캐시에 저장
        // 5분 후 캐시 자동 삭제 (메모리 관리)
        setTimeout(() => responseCache.delete(userId), 300000);
      }
    } catch (e) {
      console.error("Gemini 백그라운드 생성 중 오류:", e);
    }
  })();

  // 3. 딱 4초만 기다려보고 답이 오면 바로 주고, 아니면 안내 멘트 발송
  const waitResponse = await Promise.race([
    geminiTask.then(() => "COMPLETED"), 
    new Promise(resolve => setTimeout(() => resolve("TIMEOUT"), 4000))
  ]);

  if (waitResponse === "COMPLETED" && responseCache.has(userId)) {
    // 4초 안에 기적적으로 답변이 완성된 경우
    const replyText = responseCache.get(userId);
    responseCache.delete(userId);
    return res.json({ version: "2.0", template: { outputs: [{ simpleText: { text: replyText } }] } });
  } else {
    // 4초가 넘어가면 일단 기다려달라고 함
    return res.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "내용이 길어서 정리 중이에요! 3초만 있다가 아무 말이나 한 번 더 해주세요! 😊" } }]
      }
    });
  }
});

app.get("/", (req, res) => res.status(200).send("Vercel 캐시 봇 작동 중!"));

module.exports = app;
