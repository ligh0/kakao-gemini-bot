const express = require("express");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(express.json());

// 답변 저장소 (사용자ID_질문내용 을 키값으로 사용)
const responseCache = new Map();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash-lite";

app.post("/webhook", async (req, res) => {
  const userId = req.body.userRequest?.user?.id;
  const userMessage = req.body.userRequest?.utterance || "";
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  // 1. [질문 매칭 체크] 사용자가 다시 물었을 때, 캐시에 이 질문에 대한 답이 있는지 확인
  const cacheKey = `${userId}_${userMessage}`; 
  
  if (responseCache.has(cacheKey)) {
    const cachedReply = responseCache.get(cacheKey);
    responseCache.delete(cacheKey); // 답변 발송 후 삭제
    return res.json({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: cachedReply } }] }
    });
  }

  // 2. 새로운 질문이라면 답변 생성 시작 (비동기)
  generateAndStore(cacheKey, userMessage, API_URL);

  // 3. 4초만 기다려보고 안 나오면 지연 안내
  // 여기서 '사용자 질문'을 다시 언급해주면 훨씬 친절해짐
  const waitResponse = await Promise.race([
    checkCache(cacheKey),
    new Promise(resolve => setTimeout(() => resolve("TIMEOUT"), 4000))
  ]);

  if (waitResponse !== "TIMEOUT") {
    return res.json({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: waitResponse } }] }
    });
  } else {
    return res.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: `'${userMessage}'에 대해 정리 중이에요! 3초 뒤에 한 번 더 물어봐 주세요. 😊` } }]
      }
    });
  }
});

// 캐시를 주기적으로 확인하는 함수
async function checkCache(key) {
  while (true) {
    if (responseCache.has(key)) return responseCache.get(key);
    await new Promise(r => setTimeout(r, 500)); // 0.5초 간격 체크
  }
}

async function generateAndStore(key, message, url) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
      })
    });
    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (reply) responseCache.set(key, reply);
  } catch (e) { console.error(e); }
}

module.exports = app;
