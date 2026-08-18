import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { leads } from '../db/schema.js';

const router = Router();

// In-memory leads fallback when database is disconnected
const memoryLeads: Map<string, any> = new Map();

// GET /api/leads - Fetch all leads from Neon database or memory fallback
router.get('/', async (req: Request, res: Response) => {
  try {
    if (db) {
      try {
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
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch leads' 
    });
  }
});

// GET /api/leads/:id - Fetch single lead by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Lead ID is required' 
      });
    }

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
    
    return res.status(404).json({ 
      success: false, 
      error: 'Lead not found' 
    });
  } catch (err: any) {
    console.error(`Error fetching lead ${req.params.id}:`, err);
    return res.status(500).json({ 
      success: false, 
      error: err.message || 'Failed to fetch lead' 
    });
  }
});

// POST /api/leads - Create new lead
router.post('/', async (req: Request, res: Response) => {
  try {
    const leadData = req.body;

    // Validate required fields
    if (!leadData.name || typeof leadData.name !== 'string' || leadData.name.trim().length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Lead name is required and must be at least 2 characters' 
      });
    }

    if (!leadData.email || typeof leadData.email !== 'string' || !leadData.email.includes('@')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid email address is required' 
      });
    }

    // Generate ID if not provided
    const leadId = leadData.id || `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Create lead with only provided data (no defaults)
    const newLead: any = {
      id: leadId,
      name: leadData.name.trim(),
      email: leadData.email.trim().toLowerCase(),
    };

    // Only add optional fields if they exist
    if (leadData.userId) newLead.userId = leadData.userId;
    if (leadData.phone) newLead.phone = leadData.phone;
    if (leadData.company) newLead.company = leadData.company;
    if (leadData.budget !== undefined && leadData.budget !== null) {
      newLead.budget = Number(leadData.budget);
    }
    if (leadData.status) newLead.status = leadData.status;
    if (leadData.score !== undefined && leadData.score !== null) {
      newLead.score = Number(leadData.score);
    }
    if (leadData.urgency !== undefined && leadData.urgency !== null) {
      newLead.urgency = Boolean(leadData.urgency);
    }
    if (leadData.engagement !== undefined && leadData.engagement !== null) {
      newLead.engagement = Number(leadData.engagement);
    }
    if (leadData.replyCount !== undefined && leadData.replyCount !== null) {
      newLead.replyCount = Number(leadData.replyCount);
    }
    if (leadData.notes) newLead.notes = leadData.notes;
    if (leadData.industry) newLead.industry = leadData.industry;
    if (leadData.tags) {
      newLead.tags = Array.isArray(leadData.tags) ? JSON.stringify(leadData.tags) : leadData.tags;
    }

    // Store in memory
    memoryLeads.set(leadId, newLead);

    // Persist to database if available
    if (db) {
      try {
        await db.insert(leads).values(newLead);
      } catch (dbErr) {
        console.warn('Persist lead to Neon DB warning:', dbErr);
        // Return success even if DB fails (memory has it)
      }
    }
    
    return res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      id: leadId,
      lead: newLead
    });
  } catch (err: any) {
    console.error('Failed to create lead:', err);
    return res.status(500).json({ 
      success: false, 
      error: err.message || 'Failed to create lead' 
    });
  }
});

// PUT /api/leads/:id - Update existing lead
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Lead ID is required' 
      });
    }

    // Check if lead exists
    let existingLead = memoryLeads.get(id);
    
    if (!existingLead && db) {
      try {
        const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
        if (result && result.length > 0) {
          existingLead = result[0];
          memoryLeads.set(id, existingLead);
        }
      } catch (dbErr) {
        console.warn(`Failed to fetch lead ${id} for update:`, dbErr);
      }
    }

    if (!existingLead) {
      return res.status(404).json({ 
        success: false, 
        error: 'Lead not found' 
      });
    }

    // Build update payload with only provided fields
    const updatePayload: Record<string, any> = {};
    
    if (updates.name !== undefined && updates.name.trim()) {
      updatePayload.name = updates.name.trim();
    }
    if (updates.email !== undefined && updates.email.trim()) {
      if (!updates.email.includes('@')) {
        return res.status(400).json({ 
          success: false, 
          error: 'Valid email address is required' 
        });
      }
      updatePayload.email = updates.email.trim().toLowerCase();
    }
    if (updates.phone !== undefined) updatePayload.phone = updates.phone;
    if (updates.company !== undefined) updatePayload.company = updates.company;
    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.notes !== undefined) updatePayload.notes = updates.notes;
    if (updates.industry !== undefined) updatePayload.industry = updates.industry;
    if (updates.urgency !== undefined) updatePayload.urgency = Boolean(updates.urgency);
    if (updates.tags !== undefined) {
      updatePayload.tags = Array.isArray(updates.tags) ? JSON.stringify(updates.tags) : updates.tags;
    }
    if (updates.budget !== undefined && updates.budget !== null) {
      updatePayload.budget = Number(updates.budget);
    }
    if (updates.score !== undefined && updates.score !== null) {
      updatePayload.score = Number(updates.score);
    }
    if (updates.replyCount !== undefined && updates.replyCount !== null) {
      updatePayload.replyCount = Number(updates.replyCount);
    }
    if (updates.engagement !== undefined && updates.engagement !== null) {
      updatePayload.engagement = Number(updates.engagement);
    }
    if (updates.userId !== undefined) updatePayload.userId = updates.userId;

    // Update memory
    memoryLeads.set(id, { ...existingLead, ...updatePayload });

    // Update database if available
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
      id,
      updated: updatePayload
    });
  } catch (err: any) {
    console.error(`Failed to update lead ${req.params.id}:`, err);
    return res.status(500).json({ 
      success: false, 
      error: err.message || 'Failed to update lead' 
    });
  }
});

// DELETE /api/leads/:id - Delete lead
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Lead ID is required' 
      });
    }

    // Check if lead exists
    const exists = memoryLeads.has(id);
    if (!exists && db) {
      try {
        const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
        if (!result || result.length === 0) {
          return res.status(404).json({ 
            success: false, 
            error: 'Lead not found' 
          });
        }
      } catch (dbErr) {
        console.warn(`Failed to check lead ${id} in database:`, dbErr);
      }
    }

    // Delete from memory
    memoryLeads.delete(id);

    // Delete from database if available
    if (db) {
      try {
        await db.delete(leads).where(eq(leads.id, id));
      } catch (dbErr) {
        console.warn('Delete lead from Neon DB warning:', dbErr);
      }
    }

    return res.json({
      success: true,
      message: 'Lead deleted successfully',
      id
    });
  } catch (err: any) {
    console.error(`Failed to delete lead ${req.params.id}:`, err);
    return res.status(500).json({ 
      success: false, 
      error: err.message || 'Failed to delete lead' 
    });
  }
});

export default router;
