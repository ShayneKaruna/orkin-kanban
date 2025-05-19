const express = require('express');
const router = express.Router();
const BurningIssue = require('../models/BurningIssue');

// Get all burning issues
router.get('/', async (req, res) => {
  try {
    const issues = await BurningIssue.find().sort({ createdAt: -1 });
    res.json(issues);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new burning issue
router.post('/', async (req, res) => {
  const issue = new BurningIssue(req.body);
  try {
    const newIssue = await issue.save();
    req.app.get('io').emit('burning-issues-updated');
    res.status(201).json(newIssue);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a burning issue
router.patch('/:id', async (req, res) => {
  try {
    const issue = await BurningIssue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    Object.keys(req.body).forEach(key => {
      issue[key] = req.body[key];
    });

    const updatedIssue = await issue.save();
    req.app.get('io').emit('burning-issues-updated');
    res.json(updatedIssue);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a burning issue
router.delete('/:id', async (req, res) => {
  try {
    const issue = await BurningIssue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }
    await issue.deleteOne();
    req.app.get('io').emit('burning-issues-updated');
    res.json({ message: 'Issue deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 