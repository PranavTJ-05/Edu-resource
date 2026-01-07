const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Helper function to get document type labels
const getDocumentTypeLabel = (type) => {
  const labels = {
    degree_certificate: 'Degree Certificate',
    teaching_certificate: 'Teaching Certificate',
    id_proof: 'ID Proof',
    experience_letter: 'Experience Letter',
    other: 'Other Document'
  };
  return labels[type] || type;
};

// @route   GET /api/users
// @desc    Get all users (Instructor only)
// @access  Private (Instructor)
router.get('/', [auth, authorize('instructor')], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const role = req.query.role;

    let filter = {};
    if (role && ['student', 'instructor', 'admin'].includes(role)) {
      filter.role = role;
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});



// @route   GET /api/users/:id/profile
// @desc    Get detailed user profile for instructor review
// @access  Private (Instructor only)
router.get('/:id/profile', [auth, authorize('instructor')], async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error while fetching user profile' });
  }
});



module.exports = router;
