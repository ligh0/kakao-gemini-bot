const express = require("express");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(express.json());

// 진행 중인 작업 및 완료된 답변 저장소
const taskStatus = new Map(); 
const responseCache = new Map();

// 변수 이름을 GEMINI_API_KEY로 확실히 통일!
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash-lite";

app.post("/webhook", async (req, res) => {
  const userId = req.body.userRequest?.user?.id;
  const userMessage = req.body.userRequest?.utterance || "";
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  const cacheKey = `${userId}_${userMessage}`;

  // 1. 이미 답변이 완성된 경우 -> 즉시 반환
  if (responseCache.has(cacheKey)) {
    const reply = responseCache.get(cacheKey);
    responseCache.delete(cacheKey);
    taskStatus.delete(cacheKey);
    return res.json({ version: "2.0", template: { outputs: [{ simpleText: { text: reply } }] } });
  }

  // 2. 이미 생성이 진행 중인 경우 -> 조금만 더 기다려달라고 함
  if (taskStatus.get(cacheKey) === "PENDING") {
    return res.json({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: `🏃‍♂️ '${userMessage}'에 대해 거의 다 만들었어요! 딱 2초 뒤에 한 번만 더 물어봐 주세요.` } }] }
    });
  }

  // 3. 완전히 새로운 질문인 경우 -> 생성 시작
  taskStatus.set(cacheKey, "PENDING");
  generateGemini(cacheKey, userMessage, API_URL);

  // 첫 질문 시 4초 대기 후 완성되면 바로 응답
  const waitResponse = await Promise.race([
    waitForResult(cacheKey),
    new Promise(resolve => setTimeout(() => resolve("TIMEOUT"), 4000))
  ]);

  if (waitResponse !== "TIMEOUT" && waitResponse !== "ERROR") {
    responseCache.delete(cacheKey);
    taskStatus.delete(cacheKey);
    return res.json({ version: "2.0", template: { outputs: [{ simpleText: { text: waitResponse } }] } });
  } else {
    // 4초 넘어가면 안내 메시지
    return res.json({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: `'${userMessage}'에 대해 생각 중이에요! 3초 뒤에 한 번 더 물어봐 주세요. 😊` } }] }
    });
  }
});

async function waitForResult(key) {
  while (true) {
    if (responseCache.has(key)) return responseCache.get(key);
    if (!taskStatus.has(key)) return "ERROR"; 
    await new Promise(r => setTimeout(r, 500));
  }
}

async function generateGemini(key, message, url) {
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
    
    // 에러 핸들링 보강
    if (data.error) {
      console.error("Gemini API 에러:", data.error.message);
      taskStatus.delete(key);
      return;
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (reply) {
      responseCache.set(key, reply);
      taskStatus.set(key, "COMPLETED");
    }
  } catch (e) {
    taskStatus.delete(key);
    console.error("서버 에러:", e);
  }
}

module.exports = app;
