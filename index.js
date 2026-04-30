const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post("/webhook", async (req, res) => {
  const userRequest = req.body.userRequest;
  const userMessage = userRequest.utterance;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: userMessage,
    });

    res.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: response.text } }],
      },
    });
  } catch (error) {
    console.error("Error:", error);
    res.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "오류가 발생했어요. 다시 시도해주세요." } }],
      },
    });
  }
});

app.get("/", (req, res) => res.send("카카오 Gemini 챗봇 서버 실행 중!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`서버 실행: http://localhost:${PORT}`));
