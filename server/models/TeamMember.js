const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  color: {
    type: String,
    required: true,
    default: 'bg-gray-500'
  },
  role: {
    type: String,
    enum: ['team_member', 'executive', 'region_manager', 'branch_manager'],
    default: 'team_member'
  },
  status: {
    type: String,
    default: 'N/A'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('TeamMember', teamMemberSchema); 