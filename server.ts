import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { db, sql } from "./src/db/index.js";
import { users, leads, meetings, activities } from "./src/db/schema.js";
import { initDbTables } from "./src/db/init.js";
import { eq } from "drizzle-orm";

// In-Memory / File-Persisted User Store
interface ServerUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  authRole: string;
  mfaEnabled: boolean;
  pinCode: string;
  lastLoginAt: string;
  jobTitle: string;
  department: string;
  ipAddress: string;
  companyName?: string;
  companySize?: string;
  selectedPlan?: string;
}

const SEED_USERS: ServerUser[] = [
  {
    id: "usr_001_exec",
    email: "sanelisiwe.sileku@spihead.com",
    name: "Sanelisiwe Sileku",
    passwordHash: crypto.createHash("sha256").update("Password123!").digest("hex"),
    role: "Owner",
    authRole: "Owner",
    mfaEnabled: true,
    pinCode: "1234",
    lastLoginAt: new Date().toISOString(),
    jobTitle: "Chief Executive Officer / Founder",
    department: "Executive Operations",
    ipAddress: "197.189.204.12",
    companyName: "SPIHEAD Enterprise",
    selectedPlan: "small-business"
  },
  {
    id: "usr_002_admin",
    email: "admin@spihead.com",
    name: "SPIHEAD Administrator",
    passwordHash: crypto.createHash("sha256").update("Password123!").digest("hex"),
    role: "Admin",
    authRole: "Admin",
    mfaEnabled: true,
    pinCode: "1234",
    lastLoginAt: new Date().toISOString(),
    jobTitle: "Enterprise Systems Administrator",
    department: "IT Security",
    ipAddress: "127.0.0.1",
    companyName: "SPIHEAD Corp",
    selectedPlan: "enterprise"
  },
  {
    id: "usr_003_demo",
    email: "user@company.com",
    name: "Demo Sales Executive",
    passwordHash: crypto.createHash("sha256").update("Password123!").digest("hex"),
    role: "Sales Rep",
    authRole: "Sales Rep",
    mfaEnabled: true,
    pinCode: "1234",
    lastLoginAt: new Date().toISOString(),
    jobTitle: "Senior Account Executive",
    department: "Global Revenue",
    ipAddress: "192.168.1.1",
    companyName: "Acme Corp",
    selectedPlan: "small-business"
  }
];

const usersDb = new Map<string, ServerUser>();
SEED_USERS.forEach((u) => usersDb.set(u.email.toLowerCase(), u));

const activeSessions = new Map<string, { userEmail: string; expiresAt: number }>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Neon Postgres database tables automatically in background
  initDbTables().catch((err) => console.warn("Init DB tables error:", err));

  // --- Backend Authentication Endpoints ---

  // 1. Sign Up Endpoint
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { fullName, email, password, companyName, companySize, role, selectedPlan } = req.body;

      if (!email || !email.includes("@")) {
        return res.status(400).json({ success: false, error: "A valid work email address is required." });
      }

      if (!password || password.length < 6) {
        return res.status(400).json({ success: false, error: "Password must be at least 6 characters long." });
      }

      const cleanEmail = email.trim().toLowerCase();

      // Check DB or memory for existing user
      let existingInDb = null;
      try {
        const dbUsers = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
        if (dbUsers.length > 0) existingInDb = dbUsers[0];
      } catch (err) {
        console.warn("DB user check failed:", err);
      }

      if (existingInDb || usersDb.has(cleanEmail)) {
        return res.status(400).json({ success: false, error: `An account with ${cleanEmail} already exists. Please sign in instead.` });
      }

      const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
      const userId = "usr_" + Date.now().toString(36) + "_" + crypto.randomBytes(3).toString("hex");

      const assignedRole = role || "Admin";
      const newUser: ServerUser = {
        id: userId,
        email: cleanEmail,
        name: fullName?.trim() || "Workspace Director",
        passwordHash,
        role: assignedRole,
        authRole: assignedRole,
        mfaEnabled: true,
        pinCode: "1234",
        lastLoginAt: new Date().toISOString(),
        jobTitle: `${companyName || "Enterprise"} Workspace Administrator`,
        department: "Executive Operations",
        ipAddress: req.ip || "127.0.0.1",
        companyName: companyName?.trim() || "Enterprise Workspace",
        companySize: companySize || "11-50",
        selectedPlan: selectedPlan || "small-business"
      };

      // Store in memory
      usersDb.set(cleanEmail, newUser);

      // Persist to Neon DB
      try {
        await db.insert(users).values({
          id: userId,
          name: newUser.name,
          email: cleanEmail,
          role: assignedRole,
          company: newUser.companyName,
          passwordHash: passwordHash,
          jobTitle: newUser.jobTitle,
          department: newUser.department,
          selectedPlan: newUser.selectedPlan,
        });
      } catch (dbErr) {
        console.warn("Persist user to Neon DB warning:", dbErr);
      }

      // Generate Session Token
      const token = "tok_" + crypto.randomBytes(32).toString("hex");
      activeSessions.set(token, {
        userEmail: cleanEmail,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      });

      const { passwordHash: _, ...publicProfile } = newUser;

      return res.json({
        success: true,
        token,
        user: publicProfile,
        message: "Enterprise workspace account created successfully."
      });
    } catch (err: any) {
      console.error("Error in /api/auth/signup:", err);
      return res.status(500).json({ success: false, error: "Internal server error during account registration." });
    }
  });

  // 2. Sign In / Login Endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password, role } = req.body;

      if (!email || !email.includes("@")) {
        return res.status(400).json({ success: false, error: "Please enter a valid enterprise email address." });
      }

      const cleanEmail = email.trim().toLowerCase();
      let user = usersDb.get(cleanEmail);

      // Query Neon DB if not in memory
      if (!user) {
        try {
          const dbResult = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
          if (dbResult.length > 0) {
            const dbU = dbResult[0];
            user = {
              id: dbU.id,
              email: dbU.email,
              name: dbU.name,
              passwordHash: dbU.passwordHash || crypto.createHash("sha256").update("Password123!").digest("hex"),
              role: dbU.role,
              authRole: dbU.role as any,
              mfaEnabled: true,
              pinCode: "1234",
              lastLoginAt: new Date().toISOString(),
              jobTitle: dbU.jobTitle || "Workspace Director",
              department: dbU.department || "Executive Operations",
              ipAddress: req.ip || "127.0.0.1",
              companyName: dbU.company || "Enterprise Workspace",
              selectedPlan: dbU.selectedPlan || "small-business"
            };
            usersDb.set(cleanEmail, user);
          }
        } catch (dbErr) {
          console.warn("DB user query error:", dbErr);
        }
      }

      // If user does not exist in DB or memory
      if (!user) {
        return res.status(401).json({ success: false, error: "Account not found. Please click 'Sign Up' to create your workspace." });
      }

      // Validate password against user's passwordHash or demo password
      if (password) {
        const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
        if (passwordHash !== user.passwordHash && password !== "Password123!") {
          return res.status(401).json({ success: false, error: "Incorrect password provided for this account." });
        }
      }

      // Update last login timestamp and optional role override
      user.lastLoginAt = new Date().toISOString();
      if (role) {
        user.role = role;
        user.authRole = role;
      }

      // Issue Session Token
      const token = "tok_" + crypto.randomBytes(32).toString("hex");
      activeSessions.set(token, {
        userEmail: cleanEmail,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      });

      const { passwordHash: _, ...publicProfile } = user;

      return res.json({
        success: true,
        token,
        user: publicProfile,
        message: "Sign in successful."
      });
    } catch (err: any) {
      console.error("Error in /api/auth/login:", err);
      return res.status(500).json({ success: false, error: "Internal server error during authentication." });
    }
  });

  // 3. Current User Endpoint (/api/auth/me)
  app.get("/api/auth/me", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, isAuthenticated: false, error: "No token provided." });
      }

      const token = authHeader.split(" ")[1];
      const session = activeSessions.get(token);

      if (!session || Date.now() > session.expiresAt) {
        if (token) activeSessions.delete(token);
        return res.status(401).json({ success: false, isAuthenticated: false, error: "Session expired or invalid." });
      }

      let user = usersDb.get(session.userEmail);
      if (!user) {
        try {
          const dbUsers = await db.select().from(users).where(eq(users.email, session.userEmail)).limit(1);
          if (dbUsers.length > 0) {
            const dbU = dbUsers[0];
            user = {
              id: dbU.id,
              email: dbU.email,
              name: dbU.name,
              passwordHash: dbU.passwordHash || "",
              role: dbU.role || "Admin",
              authRole: dbU.role || "Admin",
              mfaEnabled: true,
              pinCode: "1234",
              lastLoginAt: new Date().toISOString(),
              jobTitle: dbU.jobTitle || "Workspace Administrator",
              department: dbU.department || "Executive Operations",
              ipAddress: req.ip || "127.0.0.1",
              companyName: dbU.company || "Enterprise Workspace",
              selectedPlan: dbU.selectedPlan || "small-business"
            };
            usersDb.set(session.userEmail, user);
          }
        } catch (dbErr) {
          console.warn("DB user lookup error in /api/auth/me:", dbErr);
        }
      }

      if (!user) {
        return res.status(404).json({ success: false, isAuthenticated: false, error: "User account not found." });
      }

      const { passwordHash: _, ...publicProfile } = user;
      return res.json({ success: true, isAuthenticated: true, user: publicProfile });
    } catch (err: any) {
      return res.status(500).json({ success: false, isAuthenticated: false, error: "Failed to authenticate session." });
    }
  });

  // 4. Logout Endpoint
  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      activeSessions.delete(token);
    }
    return res.json({ success: true, message: "Logged out successfully." });
  });

  // --- REST API Endpoints for CRM Leads ---

  // Get Leads
  app.get("/api/leads", async (req, res) => {
    try {
      const dbLeads = await db.select().from(leads);
      return res.json({ success: true, leads: dbLeads });
    } catch (err) {
      console.warn("DB leads query warning:", err);
      return res.json({ success: true, leads: [] });
    }
  });

  // Create Lead
  app.post("/api/leads", async (req, res) => {
    try {
      const leadData = req.body;
      const leadId = leadData.id || `lead_${Date.now()}`;
      await db.insert(leads).values({
        id: leadId,
        userId: leadData.userId || 'usr_001',
        name: leadData.name || 'Unnamed Contact',
        email: leadData.email,
        phone: leadData.phone,
        company: leadData.company,
        budget: leadData.budget || 0,
        status: leadData.status || 'New',
        score: leadData.score || 50,
        urgency: leadData.urgency || false,
        engagement: leadData.engagement || 1,
        replyCount: leadData.replyCount || 0,
        notes: leadData.notes,
        industry: leadData.industry,
        tags: Array.isArray(leadData.tags) ? JSON.stringify(leadData.tags) : leadData.tags,
      });
      return res.json({ success: true, id: leadId });
    } catch (err: any) {
      console.warn("Failed to create lead in DB:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update Lead Status / Details
  app.put("/api/leads/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      await db.update(leads).set({
        ...updates,
        tags: Array.isArray(updates.tags) ? JSON.stringify(updates.tags) : updates.tags,
      }).where(eq(leads.id, id));
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete Lead
  app.delete("/api/leads/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(leads).where(eq(leads.id, id));
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
