// src/api/leads.ts
import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db, isDatabaseConnected } from '../db/index.js';
import { leads } from '../db/schema.js';

const router = Router();
const memoryLeads = new Map<string, any>();

// Helper to convert database lead to memory format
function mapDbLeadToMemory(dbLead: any): any {
  // Parse tags if it's a string
  let tags = dbLead.tags;
  if (typeof tags === 'string') {
    try {
      tags = JSON.parse(tags);
    } catch {
      tags = [];
    }
  }
  if (!Array.isArray(tags)) {
    tags = [];
  }

  return {
    ...dbLead,
    tags: tags,
    createdAt: dbLead.createdAt instanceof Date ? dbLead.createdAt.toISOString() : dbLead.createdAt,
    updatedAt: dbLead.updatedAt instanceof Date ? dbLead.updatedAt.toISOString() : dbLead.updatedAt,
  };
}

// GET all leads
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('📊 [LEADS] Fetching all leads...');
    console.log('📊 [LEADS] Database connected:', isDatabaseConnected);

    if (db && isDatabaseConnected) {
      try {
        const dbLeads = await db.select().from(leads);
        console.log(`📊 [LEADS] Found ${dbLeads.length} leads in database`);
        const formattedLeads = dbLeads.map(mapDbLeadToMemory);
        return res.json({
          success: true,
          leads: formattedLeads,
          count: formattedLeads.length,
          source: 'Neon PostgreSQL'
        });
      } catch (dbErr) {
        console.error('❌ [LEADS] Database error:', dbErr);
      }
    }

    console.log(`📊 [LEADS] Using memory fallback (${memoryLeads.size} leads)`);
    const leadsList = Array.from(memoryLeads.values());
    return res.json({
      success: true,
      leads: leadsList,
      count: leadsList.length,
      source: 'In-Memory Cache'
    });
  } catch (error: any) {
    console.error('❌ [LEADS] Error fetching leads:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch leads'
    });
  }
});

// GET single lead
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Lead ID is required'
      });
    }

    if (db && isDatabaseConnected) {
      try {
        const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
        if (result.length > 0) {
          const lead = mapDbLeadToMemory(result[0]);
          return res.json({ success: true, lead });
        }
      } catch (dbErr) {
        console.warn(`Database error for lead ${id}:`, dbErr);
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
    console.error(`Error fetching lead ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch lead'
    });
  }
});

// POST create lead
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      name, email, phone, company, status, notes, industry, 
      budget, userId, score, urgency, engagement, tags 
    } = req.body;

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
    const now = new Date();

    // Ensure tags is an array before stringifying
    let tagsArray = Array.isArray(tags) ? tags : [];

    const newLead = {
      id: leadId,
      userId: userId || null,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone || '',
      company: company || '',
      status: status || 'New',
      notes: notes || '',
      industry: industry || 'Technology',
      budget: budget ? Number(budget) : 0,
      score: score || 50,
      urgency: urgency || false,
      engagement: engagement || 1,
      replyCount: 0,
      tags: JSON.stringify(tagsArray),
      createdAt: now,
      updatedAt: now,
    };

    let dbSaved = false;
    if (db && isDatabaseConnected) {
      try {
        await db.insert(leads).values({
          id: newLead.id,
          userId: newLead.userId,
          name: newLead.name,
          email: newLead.email,
          phone: newLead.phone,
          company: newLead.company,
          budget: newLead.budget,
          status: newLead.status,
          score: newLead.score,
          urgency: newLead.urgency,
          engagement: newLead.engagement,
          replyCount: newLead.replyCount,
          notes: newLead.notes,
          industry: newLead.industry,
          tags: newLead.tags,
          createdAt: newLead.createdAt,
          updatedAt: newLead.updatedAt,
        });
        dbSaved = true;
        console.log('✅ Lead saved to Neon DB:', leadId);
      } catch (dbErr) {
        console.error('❌ Database save error:', dbErr);
      }
    }

    const memoryLead = {
      ...newLead,
      createdAt: newLead.createdAt.toISOString(),
      updatedAt: newLead.updatedAt.toISOString(),
      tags: tagsArray,
    };
    memoryLeads.set(leadId, memoryLead);

    return res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      id: leadId,
      lead: memoryLead,
      persistedToDb: dbSaved
    });
  } catch (error: any) {
    console.error('Error creating lead:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create lead'
    });
  }
});

// PUT update lead
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

    let existingLead = memoryLeads.get(id);

    if (!existingLead && db && isDatabaseConnected) {
      try {
        const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
        if (result.length > 0) {
          existingLead = mapDbLeadToMemory(result[0]);
          memoryLeads.set(id, existingLead);
        }
      } catch (dbErr) {
        console.warn('Database lookup error:', dbErr);
      }
    }

    if (!existingLead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    const allowedUpdates = ['name', 'email', 'phone', 'company', 'status', 'notes', 'industry', 'budget', 'score', 'urgency', 'engagement', 'tags'];
    const updatePayload: any = { updatedAt: new Date() };
    const updatePayloadMemory: any = { updatedAt: new Date().toISOString() };

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
        if (field === 'tags') {
          const tagsArray = Array.isArray(updates[field]) ? updates[field] : [];
          updatePayload[field] = JSON.stringify(tagsArray);
          updatePayloadMemory[field] = tagsArray;
        } else {
          const value = field === 'budget' ? Number(updates[field]) : 
                       field === 'score' ? Number(updates[field]) :
                       field === 'engagement' ? Number(updates[field]) :
                       field === 'urgency' ? Boolean(updates[field]) :
                       updates[field];
          updatePayload[field] = value;
          updatePayloadMemory[field] = value;
        }
      }
    }

    const updatedLead = { ...existingLead, ...updatePayloadMemory };
    memoryLeads.set(id, updatedLead);

    if (db && isDatabaseConnected) {
      try {
        await db.update(leads)
          .set(updatePayload)
          .where(eq(leads.id, id));
        console.log('✅ Lead updated in database:', id);
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
      error: error.message || 'Failed to update lead'
    });
  }
});

// DELETE lead
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Lead ID is required'
      });
    }

    let exists = memoryLeads.has(id);
    
    if (!exists && db && isDatabaseConnected) {
      try {
        const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
        if (result.length > 0) {
          exists = true;
        }
      } catch (dbErr) {
        console.warn('Database lookup error:', dbErr);
      }
    }

    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    memoryLeads.delete(id);

    if (db && isDatabaseConnected) {
      try {
        await db.delete(leads).where(eq(leads.id, id));
        console.log('✅ Lead deleted from database:', id);
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
      error: error.message || 'Failed to delete lead'
    });
  }
});

export default router;
