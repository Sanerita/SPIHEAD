import "dotenv/config";
import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { initDbTables } from "./db/init.js";
import apiRouter, { apiErrorHandler, apiNotFoundHandler } from "./api/index.js";

/**
 * Builds and configures the Express app (routes, middleware, Gemini endpoints)
 * but does NOT call app.listen() and does NOT attach static file serving or
 * Vite dev middleware. Those are added by the caller depending on environment:
 *  - server.ts (local dev / long-running host) adds Vite middleware or static
 *    serving, then calls app.listen().
 *  - api/index.ts (Vercel serverless function) uses this app directly as the
 *    request handler; static assets are served by Vercel's CDN from /dist.
 */
export async function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // URL normalizer middleware to handle serverless rewrites where /api prefix might be stripped
  app.use((req, res, next) => {
    const url = req.url || '';
    if (!url.startsWith('/api') && (
      url.startsWith('/auth') ||
      url.startsWith('/login') ||
      url.startsWith('/signup') ||
      url.startsWith('/leads') ||
      url.startsWith('/gemini')
    )) {
      req.url = '/api' + url;
    }
    next();
  });

  // Universal CORS middleware for API routes
  app.use(['/api', '/auth', '/login', '/signup', '/leads', '/gemini'], (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Initialize Neon Postgres database tables automatically in background
  initDbTables().catch((err) => console.warn('Init DB tables error:', err));

  // Mount API handlers from src/api (auth, leads)
  app.use('/api', apiRouter);

  // Helper to initialize Gemini client lazily per request
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Please configure GEMINI_API_KEY in the Secrets panel.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // Health / Gemini API Status Endpoint
  app.get("/api/gemini/status", (req, res) => {
    const hasKey = !!process.env.GEMINI_API_KEY;
    res.json({
      status: "ok",
      configured: hasKey,
      model: "gemini-3.6-flash",
      message: hasKey
        ? "Gemini API is fully configured and ready."
        : "GEMINI_API_KEY is missing in server environment.",
    });
  });

  // 1. Analyze Lead Endpoint
  app.post("/api/gemini/analyze-lead", async (req, res) => {
    try {
      const ai = getGeminiClient();
      const { lead } = req.body;

      if (!lead || !lead.name) {
        return res.status(400).json({ error: "Invalid lead payload" });
      }

      const prompt = `Perform a comprehensive B2B sales lead assessment for:
Name: ${lead.name}
Company: ${lead.company}
Industry: ${lead.industry || 'Technology'}
Budget: $${(lead.budget || 0).toLocaleString()} USD
Current Stage: ${lead.status || 'New'}
Engagement Rating: ${lead.engagement || 1}/5
Urgency: ${lead.urgency ? 'High Urgency' : 'Standard'}
Email Replies: ${lead.replyCount || 0}
Discovery Notes: ${lead.notes || 'None provided'}

Provide a rigorous AI assessment evaluating deal probability, key growth drivers, deal risk factors, and actionable next steps.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an executive enterprise sales strategist and CRM analyst. Provide structured, high-value actionable sales intelligence.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedScore: {
                type: Type.NUMBER,
                description: "Recommended lead warmth score from 0 to 100",
              },
              conversionProbability: {
                type: Type.STRING,
                description: "High, Medium, or Low",
              },
              executiveSummary: {
                type: Type.STRING,
                description: "Brief 2-sentence executive summary for the sales rep",
              },
              growthDrivers: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Key positive signals driving this deal forward",
              },
              riskFactors: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Potential deal risks or objections",
              },
              recommendedNextAction: {
                type: Type.STRING,
                description: "Specific tactical step the sales rep should take next",
              },
            },
            required: [
              "recommendedScore",
              "conversionProbability",
              "executiveSummary",
              "growthDrivers",
              "riskFactors",
              "recommendedNextAction",
            ],
          },
        },
      });

      const jsonText = response.text ? response.text.trim() : "{}";
      const parsed = JSON.parse(jsonText);
      res.json({ success: true, analysis: parsed });
    } catch (err: any) {
      console.error("Error in /api/gemini/analyze-lead:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Failed to analyze lead with Gemini API",
      });
    }
  });

  // 2. Generate Sales Email Endpoint
  app.post("/api/gemini/generate-email", async (req, res) => {
    try {
      const ai = getGeminiClient();
      const { lead, emailType, customPrompt, senderName } = req.body;

      const prompt = `Compose a tailored sales email for:
Recipient: ${lead?.name || 'Prospect'} (${lead?.company || 'Company'})
Industry: ${lead?.industry || 'Technology'}
Budget: $${(lead?.budget || 0).toLocaleString()}
Email Purpose / Type: ${emailType || 'Follow-Up'}
Custom Context: ${customPrompt || 'Express enthusiasm and propose a 15-minute discovery call.'}
Sender Name: ${senderName || 'Sales Executive'}

Generate a professional, compelling, subject line and email body.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert sales communication strategist. Craft high-converting, concise B2B emails.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              body: { type: Type.STRING },
            },
            required: ["subject", "body"],
          },
        },
      });

      const jsonText = response.text ? response.text.trim() : "{}";
      const parsed = JSON.parse(jsonText);
      res.json({ success: true, email: parsed });
    } catch (err: any) {
      console.error("Error in /api/gemini/generate-email:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Failed to generate email with Gemini API",
      });
    }
  });

  // 3. Meeting Prep Brief Endpoint
  app.post("/api/gemini/meeting-brief", async (req, res) => {
    try {
      const ai = getGeminiClient();
      const { lead, meetingTitle } = req.body;

      const prompt = `Prepare a Microsoft Teams meeting prep brief for:
Meeting Title: ${meetingTitle || 'Client Discovery Call'}
Lead Name: ${lead?.name || 'Client'}
Company: ${lead?.company || 'Organization'}
Budget: $${(lead?.budget || 0).toLocaleString()} USD
Notes: ${lead?.notes || 'No discovery notes yet.'}

Provide meeting agenda, key discovery questions, and potential objection handlers.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an executive sales coach preparing reps for client meetings.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              agenda: { type: Type.ARRAY, items: { type: Type.STRING } },
              discoveryQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              objectionHandling: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["agenda", "discoveryQuestions", "objectionHandling"],
          },
        },
      });

      const jsonText = response.text ? response.text.trim() : "{}";
      const parsed = JSON.parse(jsonText);
      res.json({ success: true, brief: parsed });
    } catch (err: any) {
      console.error("Error in /api/gemini/meeting-brief:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Failed to generate meeting brief with Gemini API",
      });
    }
  });

  // 4. Next Best Action Engine Endpoint
  app.post("/api/gemini/next-best-action", async (req, res) => {
    try {
      const ai = getGeminiClient();
      const { lead, activities, emails, meetings } = req.body;

      if (!lead || !lead.name) {
        return res.status(400).json({ error: "Invalid lead payload" });
      }

      const activitiesSummary = Array.isArray(activities) && activities.length > 0
        ? activities.map((a: any) => `- [${a.type}] ${a.message}`).join("\n")
        : "No recent activities recorded.";

      const emailsSummary = Array.isArray(emails) && emails.length > 0
        ? emails.map((e: any) => `- Subject: "${e.subject}" | Body preview: "${(e.body || '').substring(0, 100)}..."`).join("\n")
        : "No recent email logs.";

      const meetingsSummary = Array.isArray(meetings) && meetings.length > 0
        ? meetings.map((m: any) => `- [${m.status}] ${m.title} on ${m.date} at ${m.time}`).join("\n")
        : "No upcoming or past meetings.";

      const prompt = `Analyze the complete B2B sales lead history and calculate the single Next Best Action for the sales rep:

LEAD DETAILS:
Name: ${lead.name}
Company: ${lead.company}
Industry: ${lead.industry || 'Technology'}
Budget: $${(lead.budget || 0).toLocaleString()} USD
Pipeline Stage: ${lead.status || 'New'}
Lead Energy Score: ${lead.score || 50}/100
Engagement Rating: ${lead.engagement || 1}/5
Urgency Flag: ${lead.urgency ? 'Yes (High Urgency)' : 'No'}
Discovery / Sales Notes: ${lead.notes || 'None'}

RECENT ACTIVITIES:
${activitiesSummary}

RECENT EMAILS:
${emailsSummary}

MEETINGS:
${meetingsSummary}

Goal: Provide the single highest-value Next Best Action for the sales rep. Examples include:
- "Send formal proposal now - engagement peaked and budget is approved"
- "Pause outreach - decision maker on leave, follow up in 2 weeks"
- "Schedule product demo - competitor evaluation mentioned"
- "Executive escalation - multi-stakeholder approval needed for $100k+ deal"
- "Re-engage cold lead - send ROI case study"

Return structured JSON containing actionTitle, category, confidenceScore (number 0-100), urgency, rationale, suggestedMessage, and keyTriggers.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an elite AI Sales Director and Next Best Action Engine. Analyze CRM signals, timing, engagement, and deal risks to recommend precise, high-converting next actions with confidence scores.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              actionTitle: {
                type: Type.STRING,
                description: "Clear, punchy next best action title (e.g., 'Send proposal now - engagement peaked')",
              },
              category: {
                type: Type.STRING,
                description: "Category: 'Send Proposal', 'Schedule Demo', 'Pause Outreach', 'Executive Escalation', 'Contract Close', or 'Follow Up'",
              },
              confidenceScore: {
                type: Type.NUMBER,
                description: "AI confidence percentage between 0 and 100",
              },
              urgency: {
                type: Type.STRING,
                description: "Urgency: 'Immediate', 'Today', 'This Week', or 'Monitor'",
              },
              rationale: {
                type: Type.STRING,
                description: "1-2 sentence logical breakdown explaining why Gemini recommends this action right now",
              },
              suggestedMessage: {
                type: Type.STRING,
                description: "Ready-to-use email/phone message snippet or script for the sales rep",
              },
              keyTriggers: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3-4 detected CRM signals or triggers that justified this recommendation",
              },
            },
            required: [
              "actionTitle",
              "category",
              "confidenceScore",
              "urgency",
              "rationale",
              "suggestedMessage",
              "keyTriggers",
            ],
          },
        },
      });

      const jsonText = response.text ? response.text.trim() : "{}";
      const parsed = JSON.parse(jsonText);
      res.json({ success: true, recommendation: parsed });
    } catch (err: any) {
      console.error("Error in /api/gemini/next-best-action:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Failed to generate Next Best Action with Gemini API",
      });
    }
  });

  // Catch-all 404 and error handlers for /api routes to prevent HTML/static 405 fallback pages
  app.all(['/api/*', '/api', '/auth/*', '/login/*', '/signup/*', '/leads/*', '/gemini/*'], apiNotFoundHandler);
  app.use(apiErrorHandler);

  return app;
}
