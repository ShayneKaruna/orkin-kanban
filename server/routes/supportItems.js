const express = require('express');
const router = express.Router();
const SupportItem = require('../models/SupportItem');

// Get all support items
router.get('/', async (req, res) => {
  try {
    const items = await SupportItem.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new support item
router.post('/', async (req, res) => {
  const item = new SupportItem(req.body);
  try {
    const newItem = await item.save();
    req.app.get('io').emit('support-items-updated');
    res.status(201).json(newItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a support item
router.patch('/:id', async (req, res) => {
  try {
    const item = await SupportItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    Object.keys(req.body).forEach(key => {
      item[key] = req.body[key];
    });

    const updatedItem = await item.save();
    req.app.get('io').emit('support-items-updated');
    res.json(updatedItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a support item
router.delete('/:id', async (req, res) => {
  try {
    const item = await SupportItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    await item.deleteOne();
    req.app.get('io').emit('support-items-updated');
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get items by status
router.get('/status/:status', async (req, res) => {
  try {
    const items = await SupportItem.find({ status: req.params.status })
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 