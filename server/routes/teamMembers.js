const express = require('express');
const router = express.Router();
const TeamMember = require('../models/TeamMember');

// Get all team members
router.get('/', async (req, res) => {
  try {
    console.log('GET /api/team-members - Fetching all team members');
    const members = await TeamMember.find().sort({ createdAt: -1 });
    console.log(`GET /api/team-members - Found ${members.length} team members`);
    res.json(members);
  } catch (error) {
    console.error('GET /api/team-members - Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create a new team member
router.post('/', async (req, res) => {
  console.log('POST /api/team-members - Request body:', req.body);
  
  // Validate required fields
  if (!req.body.name) {
    return res.status(400).json({ message: 'Name is required' });
  }

  try {
    // Check if team member with same name already exists
    const existingMember = await TeamMember.findOne({ name: req.body.name });
    if (existingMember) {
      return res.status(400).json({ message: 'Team member with this name already exists' });
    }

    const member = new TeamMember(req.body);
    const newMember = await member.save();
    console.log('POST /api/team-members - Saved member:', newMember);
    
    // Emit socket event
    req.app.get('io').emit('team-members-updated');
    
    res.status(201).json(newMember);
  } catch (error) {
    console.error('POST /api/team-members - Error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update a team member
router.patch('/:id', async (req, res) => {
  console.log(`PATCH /api/team-members/${req.params.id} - Request body:`, req.body);
  
  try {
    const member = await TeamMember.findById(req.params.id);
    if (!member) {
      console.log(`PATCH /api/team-members/${req.params.id} - Member not found`);
      return res.status(404).json({ message: 'Team member not found' });
    }

    // If name is being updated, check for duplicates
    if (req.body.name && req.body.name !== member.name) {
      const existingMember = await TeamMember.findOne({ name: req.body.name });
      if (existingMember) {
        return res.status(400).json({ message: 'Team member with this name already exists' });
      }
    }

    Object.keys(req.body).forEach(key => {
      member[key] = req.body[key];
    });

    const updatedMember = await member.save();
    console.log(`PATCH /api/team-members/${req.params.id} - Updated member:`, updatedMember);
    
    req.app.get('io').emit('team-members-updated');
    res.json(updatedMember);
  } catch (error) {
    console.error(`PATCH /api/team-members/${req.params.id} - Error:`, error);
    res.status(400).json({ message: error.message });
  }
});

// Delete a team member
router.delete('/:id', async (req, res) => {
  console.log(`DELETE /api/team-members/${req.params.id}`);
  
  try {
    const member = await TeamMember.findById(req.params.id);
    if (!member) {
      console.log(`DELETE /api/team-members/${req.params.id} - Member not found`);
      return res.status(404).json({ message: 'Team member not found' });
    }
    
    await member.deleteOne();
    console.log(`DELETE /api/team-members/${req.params.id} - Member deleted`);
    
    req.app.get('io').emit('team-members-updated');
    res.json({ message: 'Team member deleted' });
  } catch (error) {
    console.error(`DELETE /api/team-members/${req.params.id} - Error:`, error);
    res.status(500).json({ message: error.message });
  }
});

// Get team members by role
router.get('/role/:role', async (req, res) => {
  console.log(`GET /api/team-members/role/${req.params.role}`);
  
  try {
    const members = await TeamMember.find({ role: req.params.role })
      .sort({ createdAt: -1 });
    console.log(`GET /api/team-members/role/${req.params.role} - Found ${members.length} members`);
    res.json(members);
  } catch (error) {
    console.error(`GET /api/team-members/role/${req.params.role} - Error:`, error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 