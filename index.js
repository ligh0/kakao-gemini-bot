const express = require("express");

const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  const userMessage = req.body.userRequest.utterance;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: userMessage }],
        max_tokens: 1000
      })
    });

    const data = await response.json();
    const replyText = data.choices[0].message.content;

    res.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: replyText } }],
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

app.get("/", (req, res) => res.send("카카오 Groq 챗봇 서버 실행 중!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`서버 실행: http://localhost:${PORT}`));
