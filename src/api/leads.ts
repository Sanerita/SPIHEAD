import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { leads } from '../db/schema';

const router = Router();

// GET /api/leads
router.get('/', async (req: Request, res: Response) => {
  try {
    const dbLeads = await db.select().from(leads);
    return res.json({ success: true, leads: dbLeads });
  } catch (err: any) {
    console.warn('DB leads query warning:', err);
    return res.json({ success: true, leads: [] });
  }
});

// POST /api/leads
router.post('/', async (req: Request, res: Response) => {
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
    console.warn('Failed to create lead in DB:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/leads/:id
router.put('/:id', async (req: Request, res: Response) => {
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

// DELETE /api/leads/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(leads).where(eq(leads.id, id));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
