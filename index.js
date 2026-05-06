const express = require("express");

const app = express();
app.use(express.json());

// 카카오톡 챗봇 웹훅 엔드포인트
app.post("/webhook", async (req, res) => {
  const userMessage = req.body.userRequest.utterance;
  const API_KEY = process.env.GEMINI_API_KEY;
  
  // 현재 가장 부하가 적고 빠른 최신 모델로 설정
  const MODEL = "gemini-3.1-flash-lite-preview"; 
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userMessage }] }],
        // 답변 생성 옵션 (속도 최적화)
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        }
      })
    });

    const data = await response.json();
    
    // 로그에서 제미나이의 응답 데이터를 확인
    console.log("Gemini Raw Data:", JSON.stringify(data));

    // 응답 데이터 구조가 정상인지 확인
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const replyText = data.candidates[0].content.parts[0].text;
      res.json({
        version: "2.0",
        template: {
          outputs: [{ simpleText: { text: replyText } }]
        }
      });
    } else {
      // 503 과부하 또는 다른 에러 발생 시 처리
      console.error("Gemini Response Error:", data);
      const errorMessage = data.error && data.error.code === 503 
        ? "지금 사용자가 많아 제미나이가 잠시 쉬고 있어요. 잠시 후 다시 말을 걸어주세요!"
        : "제미나이가 답변을 생성하지 못했어요. 다시 시도해주세요.";
        
      res.json({
        version: "2.0",
        template: {
          outputs: [{ simpleText: { text: errorMessage } }]
        }
      });
    }
  } catch (error) {
    console.error("Critical Error:", error);
    res.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "서버 연결에 오류가 발생했습니다." } }]
      }
    });
  }
});

// 서버 접속 확인용 기본 경로
app.get("/", (req, res) => res.send("카카오 Gemini 3.1 챗봇 서버 작동 중!"));
app.get("/health", (req, res) => res.status(200).send("OK"));

// Render 포트 설정 (10000)
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`서버 실행 포트: ${PORT}`));
