const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
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

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management API
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Instructor only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [student, instructor, admin] }
 *     responses:
 *       200:
 *         description: List of users
 *       403:
 *         description: Unauthorized
 */
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
/**
 * @swagger
 * /api/users/{id}/profile:
 *   get:
 *     summary: Get user profile by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User profile
 *       404:
 *         description: User not found
 */
router.get('/:id/profile', [auth, authorize('instructor')], async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch student's enrollments if they are a student
    let enrolledCourses = [];
    if (user.role === 'student') {
      const enrollments = await Enrollment.find({ student: user._id })
        .populate('course', 'title description levels')
        .sort({ enrollmentDate: -1 });
      
      enrolledCourses = enrollments
        .filter(e => e.course) // Filter out null courses (deleted courses)
        .map(e => ({
          _id: e.course._id,
          title: e.course.title,
          status: e.status,
          enrollmentDate: e.enrollmentDate,
          progress: e.progress || 0
        }));
    }

    res.json({ ...user.toObject(), enrolledCourses });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error while fetching user profile' });
  }
});

// @route   POST /api/users/:id/enroll
// @desc    Enroll user in a course
// @access  Private (Instructor only)
router.post('/:id/enroll', [auth, authorize('instructor')], async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.params.id;

    // Check if enrollment already exists
    const existingEnrollment = await Enrollment.findOne({
      student: userId,
      course: courseId
    });

    if (existingEnrollment) {
      return res.status(400).json({ message: 'User is already enrolled in this course' });
    }

    const newEnrollment = new Enrollment({
      student: userId,
      course: courseId,
      status: 'enrolled',
      paymentStatus: 'completed' // Admin enrollment implies bypass payment
    });

    await newEnrollment.save();
    res.json(newEnrollment);
  } catch (error) {
    console.error('Enroll user error:', error);
    res.status(500).json({ message: 'Server error while enrolling user' });
  }
});

// @route   DELETE /api/users/:id/enroll/:courseId
// @desc    Unenroll user from a course
// @access  Private (Instructor only)
router.delete('/:id/enroll/:courseId', [auth, authorize('instructor')], async (req, res) => {
  try {
    const { id, courseId } = req.params;

    const result = await Enrollment.findOneAndDelete({
      student: id,
      course: courseId
    });

    if (!result) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    res.json({ message: 'User unenrolled successfully' });
  } catch (error) {
    console.error('Unenroll user error:', error);
    res.status(500).json({ message: 'Server error while unenrolling user' });
  }
});

// @route   PUT /api/users/:id/activate
// @desc    Activate a user
// @access  Private (Instructor only)
router.put('/:id/activate', [auth, authorize('instructor')], async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ message: 'Server error while activating user' });
  }
});

// @route   PUT /api/users/:id/deactivate
// @desc    Deactivate a user
// @access  Private (Instructor only)
router.put('/:id/deactivate', [auth, authorize('instructor')], async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ message: 'Server error while deactivating user' });
  }
});

// @route   PUT /api/users/:id/decline
// @desc    Decline user permission (set isApproved to false)
// @access  Private (Instructor only)
router.put('/:id/decline', [auth, authorize('instructor')], async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isApproved: false, isActive: false },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Decline user error:', error);
    res.status(500).json({ message: 'Server error while declining user' });
  }
});



module.exports = router;
