// ... 앞부분 생략 (express 설정 등)

app.post("/webhook", async (req, res) => {
  const userMessage = req.body.userRequest.utterance;
  const API_KEY = process.env.GEMINI_API_KEY;
  const MODEL = "gemini-1.5-flash";
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userMessage }] }],
        // 안전 설정을 모두 끄거나 완화해서 답변 거부를 방지해
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ]
      })
    });

    const data = await response.json();

    // 로그에서 실제 데이터 구조를 확인하기 위해 추가
    console.log("Gemini Raw Data:", JSON.stringify(data));

    // 데이터가 정상적으로 들어있는지 꼼꼼하게 확인
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const replyText = data.candidates[0].content.parts[0].text;
      res.json({
        version: "2.0",
        template: { outputs: [{ simpleText: { text: replyText } }] }
      });
    } else {
      // 제미나이가 답변을 거부한 경우 (이유가 로그에 찍힘)
      console.error("Gemini Response Error:", data.promptFeedback || "No candidates found");
      res.json({
        version: "2.0",
        template: { outputs: [{ simpleText: { text: "제미나이가 대답을 거부했어요. 다른 질문을 해주세요!" } }] }
      });
    }
  } catch (error) {
    console.error("Critical Error:", error);
    res.json({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: "서버 에러가 발생했습니다." } }] }
    });
  }
});

// ... 뒷부분 생략
