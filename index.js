const express = require("express");

const app = express();
app.use(express.json());

// 카카오톡 챗봇 웹훅 엔드포인트
app.post("/webhook", async (req, res) => {
  const userMessage = req.body.userRequest.utterance;
  const API_KEY = process.env.GEMINI_API_KEY;
  
  // v1 안정 버전 API 주소 사용
  const MODEL = "gemini-1.5-flash"; 
  const API_URL = `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent?key=${API_KEY}`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userMessage }] }],
        // 안전 설정을 완화하여 다양한 답변이 가능하도록 설정
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ]
      })
    });

    const data = await response.json();
    
    // 로그에서 제미나이의 실제 응답 데이터를 확인 (디버깅용)
    console.log("Gemini Raw Data:", JSON.stringify(data));

    // 응답 데이터 구조가 정상인지 확인 후 카톡 형식으로 변환
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const replyText = data.candidates[0].content.parts[0].text;
      res.json({
        version: "2.0",
        template: {
          outputs: [{ simpleText: { text: replyText } }]
        }
      });
    } else {
      // 답변 생성 실패 시 (에러 로그 출력)
      console.error("Gemini Response Error:", data);
      res.json({
        version: "2.0",
        template: {
          outputs: [{ simpleText: { text: "제미나이가 대답을 거부했거나 오류가 발생했어요. 다시 말씀해 주세요!" } }]
        }
      });
    }
  } catch (error) {
    // 서버 자체 에러 발생 시
    console.error("Critical Error:", error);
    res.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "서버 연결에 문제가 생겼어요. 잠시 후 다시 시도해 주세요!" } }]
      }
    });
  }
});

// 기본 경로 접속 확인용
app.get("/", (req, res) => res.send("카카오 제미나이 챗봇 서버가 정상 작동 중입니다!"));

// 렌더 서버 헬스체크 및 잠자기 방지용 경로
app.get("/health", (req, res) => res.status(200).send("OK"));

// 포트 설정 (Render 기본 포트 10000 대응)
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`));
