import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { leads } from '../db/schema.js';

const router = Router();
const memoryLeads = new Map<string, any>();

// GET all leads
router.get('/', async (req: Request, res: Response) => {
  try {
    if (db) {
      const dbLeads = await db.select().from(leads);
      return res.json({
        success: true,
        leads: dbLeads,
        count: dbLeads.length
      });
    }

    const leadsList = Array.from(memoryLeads.values());
    return res.json({
      success: true,
      leads: leadsList,
      count: leadsList.length
    });
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch leads'
    });
  }
});

// GET single lead
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (db) {
      const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
      if (result.length > 0) {
        return res.json({ success: true, lead: result[0] });
      }
    }

    const memLead = memoryLeads.get(id);
    if (memLead) {
      return res.json({ success: true, lead: memLead });
    }

    return res.status(404).json({
      success: false,
      error: 'Lead not found'
    });
  } catch (error: any) {
    console.error('Error fetching lead:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch lead'
    });
  }
});

// POST create lead
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, company, status, notes, industry, budget, userId } = req.body;

    // Validate required fields
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Lead name is required (min 2 characters)'
      });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Valid email is required'
      });
    }

    const leadId = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newLead = {
      id: leadId,
      userId: userId || null,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone || '',
      company: company || '',
      status: status || 'New',
      notes: notes || '',
      industry: industry || '',
      budget: budget ? Number(budget) : 0,
      createdAt: now,
      updatedAt: now
    };

    memoryLeads.set(leadId, newLead);

    if (db) {
      try {
        await db.insert(leads).values(newLead);
      } catch (dbErr) {
        console.warn('Database save warning:', dbErr);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      id: leadId,
      lead: newLead
    });
  } catch (error: any) {
    console.error('Error creating lead:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create lead'
    });
  }
});

// PUT update lead
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    let existingLead = memoryLeads.get(id);
    
    if (!existingLead && db) {
      const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
      if (result.length > 0) {
        existingLead = result[0];
        memoryLeads.set(id, existingLead);
      }
    }

    if (!existingLead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    const allowedUpdates = ['name', 'email', 'phone', 'company', 'status', 'notes', 'industry', 'budget'];
    const updatePayload: any = { updatedAt: new Date().toISOString() };

    for (const field of allowedUpdates) {
      if (updates[field] !== undefined) {
        if (field === 'email' && !updates[field].includes('@')) {
          return res.status(400).json({
            success: false,
            error: 'Valid email is required'
          });
        }
        if (field === 'name' && updates[field].trim().length < 2) {
          return res.status(400).json({
            success: false,
            error: 'Name must be at least 2 characters'
          });
        }
        updatePayload[field] = field === 'budget' ? Number(updates[field]) : updates[field];
      }
    }

    const updatedLead = { ...existingLead, ...updatePayload };
    memoryLeads.set(id, updatedLead);

    if (db) {
      try {
        await db.update(leads).set(updatePayload).where(eq(leads.id, id));
      } catch (dbErr) {
        console.warn('Database update warning:', dbErr);
      }
    }

    return res.json({
      success: true,
      message: 'Lead updated successfully',
      lead: updatedLead
    });
  } catch (error: any) {
    console.error('Error updating lead:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update lead'
    });
  }
});

// DELETE lead
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!memoryLeads.has(id) && db) {
      const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Lead not found'
        });
      }
    }

    memoryLeads.delete(id);

    if (db) {
      try {
        await db.delete(leads).where(eq(leads.id, id));
      } catch (dbErr) {
        console.warn('Database delete warning:', dbErr);
      }
    }

    return res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting lead:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete lead'
    });
  }
});

export default router;
