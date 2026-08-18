import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { leads } from '../db/schema.js';

const router = Router();

// Seed leads array (empty for production)
const DEMO_LEADS: any[] = [];

// In-memory leads fallback when database is disconnected
const memoryLeads: Map<string, any> = new Map();

async function ensureSeedLeads() {
  if (!db) return;
  try {
    const existing = await db.select().from(leads).limit(1);
    if (existing && existing.length === 0) {
      console.log('Seeding initial leads into Neon database...');
      for (const lead of DEMO_LEADS) {
        try {
          await db.insert(leads).values(lead);
        } catch (insertErr) {
          console.warn(`Failed to seed lead ${lead.id}:`, insertErr);
        }
      }
    }
  } catch (err) {
    console.warn('Seed leads check warning:', err);
  }
}

// GET /api/leads - Fetch all leads from Neon database or memory fallback
router.get('/', async (req: Request, res: Response) => {
  try {
    if (db) {
      try {
        await ensureSeedLeads();
        const dbLeads = await db.select().from(leads);
        return res.json({
          success: true,
          leads: dbLeads,
          count: dbLeads.length,
          source: 'Neon PostgreSQL'
        });
      } catch (dbErr) {
        console.warn('Falling back to memory store for leads:', dbErr);
      }
    }

    const leadsList = Array.from(memoryLeads.values());
    return res.json({
      success: true,
      leads: leadsList,
      count: leadsList.length,
      source: 'In-Memory Cache'
    });
  } catch (err: any) {
    console.error('Error fetching leads:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch leads', leads: Array.from(memoryLeads.values()) });
  }
});

// GET /api/leads/:id - Fetch single lead by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (db) {
      try {
        const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
        if (result && result.length > 0) {
          return res.json({ success: true, lead: result[0] });
        }
      } catch (dbErr) {
        console.warn(`Lead DB fetch failed for ${id}, checking memory store:`, dbErr);
      }
    }

    const memLead = memoryLeads.get(id);
    if (memLead) {
      return res.json({ success: true, lead: memLead });
    }
    return res.status(404).json({ success: false, error: 'Lead not found' });
  } catch (err: any) {
    console.error(`Error fetching lead ${req.params.id}:`, err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads - Create new lead in Neon database or memory cache
router.post('/', async (req: Request, res: Response) => {
  try {
    const leadData = req.body;
    const leadId = leadData.id || `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const newLead = {
      id: leadId,
      userId: leadData.userId || 'usr_001',
      name: leadData.name || 'Unnamed Contact',
      email: leadData.email || '',
      phone: leadData.phone || '',
      company: leadData.company || '',
      budget: Number(leadData.budget) || 0,
      status: leadData.status || 'New',
      score: Number(leadData.score) || 50,
      urgency: Boolean(leadData.urgency),
      engagement: Number(leadData.engagement) || 1,
      replyCount: Number(leadData.replyCount) || 0,
      notes: leadData.notes || '',
      industry: leadData.industry || 'Technology',
      tags: Array.isArray(leadData.tags) ? JSON.stringify(leadData.tags) : (leadData.tags || '[]'),
    };

    memoryLeads.set(leadId, newLead);

    if (db) {
      try {
        await db.insert(leads).values(newLead);
      } catch (dbErr) {
        console.warn('Persist lead to Neon DB warning:', dbErr);
      }
    }
    
    return res.json({
      success: true,
      message: 'Lead created successfully',
      id: leadId,
      lead: newLead
    });
  } catch (err: any) {
    console.error('Failed to create lead:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/leads/:id - Update existing lead in Neon database or memory cache
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updatePayload: Record<string, any> = {};
    if (updates.name !== undefined) updatePayload.name = updates.name;
    if (updates.email !== undefined) updatePayload.email = updates.email;
    if (updates.phone !== undefined) updatePayload.phone = updates.phone;
    if (updates.company !== undefined) updatePayload.company = updates.company;
    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.notes !== undefined) updatePayload.notes = updates.notes;
    if (updates.industry !== undefined) updatePayload.industry = updates.industry;
    if (updates.urgency !== undefined) updatePayload.urgency = Boolean(updates.urgency);
    if (updates.tags !== undefined) {
      updatePayload.tags = Array.isArray(updates.tags) ? JSON.stringify(updates.tags) : updates.tags;
    }
    if (updates.budget !== undefined) updatePayload.budget = Number(updates.budget);
    if (updates.score !== undefined) updatePayload.score = Number(updates.score);
    if (updates.replyCount !== undefined) updatePayload.replyCount = Number(updates.replyCount);
    if (updates.engagement !== undefined) updatePayload.engagement = Number(updates.engagement);

    const existingMem = memoryLeads.get(id) || {};
    memoryLeads.set(id, { ...existingMem, ...updatePayload });

    if (db) {
      try {
        await db.update(leads).set(updatePayload).where(eq(leads.id, id));
      } catch (dbErr) {
        console.warn('Update lead in Neon DB warning:', dbErr);
      }
    }
    
    return res.json({
      success: true,
      message: 'Lead updated successfully',
      id
    });
  } catch (err: any) {
    console.error(`Failed to update lead ${req.params.id}:`, err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/leads/:id - Delete lead from Neon database or memory cache
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    memoryLeads.delete(id);

    if (db) {
      try {
        await db.delete(leads).where(eq(leads.id, id));
      } catch (dbErr) {
        console.warn('Delete lead from Neon DB warning:', dbErr);
      }
    }

    return res.json({
      success: true,
      message: 'Lead removed',
      id
    });
  } catch (err: any) {
    console.error(`Failed to delete lead ${req.params.id}:`, err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

