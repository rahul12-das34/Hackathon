export default async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
  
    try {
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      if (!OPENAI_API_KEY) {
        return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
      }
  
      const { messages } = req.body || {};
      if (!Array.isArray(messages)) {
        return res.status(400).json({ error: "messages must be an array" });
      }
  
      const resp = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          input: messages,
          max_output_tokens: 500,
        }),
      });
  
      if (!resp.ok) {
        const txt = await resp.text();
        return res.status(resp.status).send(txt);
      }
  
      const data = await resp.json();
  
      // Extract text
      let reply = data.output_text || "";
      if (!reply && Array.isArray(data.output)) {
        for (const item of data.output) {
          if (item.type === "message") {
            for (const part of item.content || []) {
              if (part.type === "output_text") reply += part.text;
            }
          }
        }
      }
  
      return res.status(200).json({ reply: reply || "No reply returned." });
    } catch (err) {
      return res.status(500).json({ error: err.message || String(err) });
    }
  }
