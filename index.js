const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

const chatHistories = {};

app.post("/webhook", async (req, res) => {
  const userRequest = req.body.userRequest;
  const userId = userRequest.user.id;
  const userMessage = userRequest.utterance;

  try {
    if (!chatHistories[userId]) {
      chatHistories[userId] = model.startChat({
        history: [],
        generationConfig: { maxOutputTokens: 1000 },
      });
    }

    const chat = chatHistories[userId];
    const result = await chat.sendMessage(userMessage);
    const responseText = result.response.text();

    res.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: responseText } }],
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
