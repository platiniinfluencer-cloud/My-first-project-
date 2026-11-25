
import express from "express";

const app = express();
const allowedOrigin = "https://justanai.deploysnap.site";

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({ service: "justanAi API", status: "online" });
});

app.get("/api/status", (req, res) => {
  res.json({
    chat: !!process.env.GEMINI_API_KEY,
    video: !!process.env.HF_TOKEN
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(503).json({
      error: "Gemini API key is not configured."
    });

    const messages = req.body.messages || [];
    const contents = messages.slice(-20).map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content || "").slice(0, 10000) }]
    }));

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: "You are justanAi, a helpful and friendly AI assistant." }]
          },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "AI provider error"
      });
    }

    res.json({
      answer: data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "No answer returned."
    });
  } catch (error) {
    res.status(500).json({ error: "Chat request failed." });
  }
});

app.post("/api/video", async (req, res) => {
  res.status(503).json({
    error: "Video generation provider is not configured yet."
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("justanAi API listening on " + port));
