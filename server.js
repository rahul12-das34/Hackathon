/**
 * SmartPath AI - Minimal backend for Chat
 * - Keeps OPENAI_API_KEY on the server (never in browser)
 * - Exposes POST /api/chat
 *
 * Run:
 *   npm init -y
 *   npm i express
 *   # Node 18+ recommended (has global fetch)
 *   export OPENAI_API_KEY="YOUR_KEY"
 *   export OPENAI_MODEL="gpt-4.1-mini"   # optional
 *   node server.js
 *
 * Then open:
 *   http://localhost:3000/chat.html
 */
import express from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));

// Serve static files from current folder (so /chat.html works)
app.use(express.static(process.cwd()));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

function toResponsesInput(messages) {
  const cleaned = (Array.isArray(messages) ? messages : [])
    .filter(m => m && typeof m.content === "string" && typeof m.role === "string")
    .map(m => ({ role: m.role, content: m.content }));

  return cleaned;
}

app.post("/api/chat", async (req, res) => {
  try {
    if (!OPENAI_API_KEY) {
      return res.status(500).send("Server missing OPENAI_API_KEY. Set it in environment variables.");
    }

    const input = toResponsesInput(req.body?.messages);
    if (!input.some(m => m.role === "user")) {
      return res.status(400).send("No user message found.");
    }

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        input,
        max_output_tokens: 500,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).send(text);
    }

    const data = await resp.json();

    // Extract text output robustly
    let reply = "";
    if (typeof data.output_text === "string") {
      reply = data.output_text;
    } else if (Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item && item.type === "message" && Array.isArray(item.content)) {
          for (const part of item.content) {
            if (part && part.type === "output_text" && typeof part.text === "string") {
              reply += part.text;
            }
          }
        }
      }
    }

    res.json({ reply: reply || "No text returned from model." });
  } catch (err) {
    console.error(err);
    res.status(500).send(String(err?.message || err));
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
