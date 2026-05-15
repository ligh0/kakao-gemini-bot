const express = require("express");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(express.json());

// 상태 관리 및 답변 저장소
const taskMap = new Map(); // 'PENDING' 또는 답변 텍스트 저장

// 환경변수 이름은 Vercel 설정과 똑같이 맞췄어
const G_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash-lite";

app.post("/webhook", async (req, res) => {
  const userId = req.body.userRequest?.user?.id || "unknown";
  const userMsg = req.body.userRequest?.utterance || "";
  const cacheKey = `${userId}_${userMsg}`;

  // 1. 이미 답변이 완성되어 저장되어 있는 경우 -> 즉시 반환
  const existingTask = taskMap.get(cacheKey);
  if (existingTask && existingTask !== "PENDING") {
    taskMap.delete(cacheKey); // 사용 후 삭제
    return res.json({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: existingTask } }] }
    });
  }

  // 2. 이미 생성이 진행 중인 경우 -> 사용자에게 재시도 안내
  if (existingTask === "PENDING") {
    return res.json({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: "🏃‍♂️ 답변을 거의 다 만들었어요! 3초만 있다가 한 번 더 말씀해 주세요." } }] }
    });
  }

  // 3. 완전히 새로운 질문인 경우 -> 생성 시작
  taskMap.set(cacheKey, "PENDING");
  
  // 백그라운드에서 제미나이 호출 (결과를 taskMap에 저장)
  runGemini(cacheKey, userMsg);

  // 첫 질문 시 4초만 기다려보고 완성되면 바로 응답, 아니면 안내 발송
  const result = await Promise.race([
    waitForReply(cacheKey),
    new Promise(resolve => setTimeout(() => resolve("TIMEOUT"), 4000))
  ]);

  if (result !== "TIMEOUT" && result !== "ERROR") {
    taskMap.delete(cacheKey);
    return res.json({ version: "2.0", template: { outputs: [{ simpleText: { text: result } }] } });
  } else {
    // 4초가 지나면 일단 대피
    return res.json({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: `'${userMsg}'에 대해 생각 중이에요! 잠시 후 다시 물어봐 주세요. 😊` } }] }
    });
  }
});

// 답변이 완성될 때까지 0.5초 간격으로 확인하는 함수
async function waitForReply(key) {
  while (true) {
    const val = taskMap.get(key);
    if (val && val !== "PENDING") return val;
    if (!taskMap.has(key)) return "ERROR";
    await new Promise(r => setTimeout(r, 500));
  }
}

// 실제 제미나이 호출 함수
async function runGemini(key, msg) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${G_KEY}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: msg }] }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
      })
    });
    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (reply) {
      taskMap.set(key, reply);
      // 5분 후 자동 삭제
      setTimeout(() => taskMap.delete(key), 300000);
    } else {
      taskMap.delete(key);
    }
  } catch (e) {
    console.error("Gemini Error:", e);
    taskMap.delete(key);
  }
}

app.get("/", (req, res) => res.send("Vercel Gemini Bot is Active!"));
module.exports = app;
