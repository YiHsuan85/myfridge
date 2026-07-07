import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please configure it in your AI Studio secrets.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable JSON body parsing with large limit for base64 images
  app.use(express.json({ limit: "15mb" }));

  // API Route 1: Scan receipt or food photo with Gemini AI
  app.post("/api/scan-receipt", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image) {
        return res.status(400).json({ error: "No image data provided" });
      }

      // Standardize base64 string
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const resolvedMimeType = mimeType || "image/jpeg";

      const ai = getAiClient();
      
      const prompt = `
        Please analyze this receipt or photo of food items.
        Extract all individual foods/ingredients you can identify.
        Return a JSON array of food objects.
        Each food object MUST have:
        1. "name" (string, in Traditional Chinese (繁體中文), e.g. "鮮乳", "雞蛋", "高麗菜")
        2. "quantity" (number, representing quantity or package count, e.g. 1, 2)
        3. "category" (string, MUST be exactly one of: "fridge" (for 冷藏), "freezer" (for 冷凍), "room" (for 室溫/常溫))
        4. "expiryDays" (number, estimated shelf life in days from today, e.g., milk is 5, fresh vegetables are 7, frozen meat is 30, canned food is 365, eggs are 20. Guess based on the type of food and standard storage practices)
        5. "notes" (string, a short note like brand or description, e.g. "光泉", "有機", or "500ml", can be empty string "")

        Format your entire response strictly as a valid JSON array of objects. Do not wrap in markdown other than application/json.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: resolvedMimeType,
              data: base64Data,
            },
          },
          prompt,
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "[]";
      let parsed = [];
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        // Fallback pattern if JSON.parse fails due to unexpected formatting
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        parsed = JSON.parse(cleanText);
      }

      res.json({ success: true, items: parsed });
    } catch (error: any) {
      console.error("Error scanning receipt with Gemini:", error);
      res.status(500).json({ 
        error: error.message || "Failed to analyze receipt",
        fallback: true 
      });
    }
  });

  // API Route 2: Generate Smart Refrigerator Butler Advice
  app.post("/api/fridge-advice", async (req, res) => {
    try {
      const { items } = req.body;
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "No items provided" });
      }

      if (items.length === 0) {
        return res.json({ 
          advice: "您的冰箱空空如也！趕快去新增一些食材，或者透過『自動加入購物清單』來補貨吧！🍎🥦" 
        });
      }

      const ai = getAiClient();

      const itemsDescription = items.map((item: any) => {
        const daysLeft = item.daysLeft !== undefined ? item.daysLeft : "未設定";
        return `- ${item.name} (數量: ${item.quantity}, 位置: ${item.category === "fridge" ? "冷藏" : item.category === "freezer" ? "冷凍" : "室溫"}, 剩餘天數: ${daysLeft}天, 備註: ${item.notes || "無"})`;
      }).join("\n");

      const prompt = `
        您是一個親切溫暖、高質感的 AI 冰箱管理大管家。
        以下是使用者目前的冰箱食材列表：
        ${itemsDescription}

        請為使用者撰寫一段簡短、溫馨且實用的「今日冰箱小叮嚀與烹飪建議」（大約 120-180 字，使用繁體中文）。
        重點：
        1. 提醒即將到期的食材（特別是剩餘天數 <= 3 天的食材）。
        2. 推薦可以如何搭配這些食材做一道簡單的料理，或建議優先吃掉什麼。
        3. 語氣要像 Apple Health 或 Notion 的貼心小秘書，優雅、溫馨、有質感。
        4. 不要使用任何 Markdown 標題（例如 # 或 ##），保持段落自然，可以使用 emoji 增加親切感。
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({ success: true, advice: response.text?.trim() });
    } catch (error: any) {
      console.error("Error generating fridge advice:", error);
      res.json({ 
        advice: "哈囉！今天又是美好的一天。記得多留意保存期限較短的食材，提早享用最美味！祝您用餐愉快 🥬✨" 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
