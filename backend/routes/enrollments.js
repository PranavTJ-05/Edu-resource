const express = require('express');
const { body, validationResult } = require('express-validator');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Enrollments
 *   description: Enrollment management API
 */

/**
 * @swagger
 * /api/enrollments:
 *   post:
 *     summary: Enroll in a course
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [courseId]
 *             properties:
 *               courseId: { type: string }
 *     responses:
 *       201:
 *         description: Enrolled successfully
 *       400:
 *         description: Already enrolled or course full
 *       404:
 *         description: Course not found
 */
// @route   POST /api/enrollments
// @desc    Enroll student in a course
// @access  Private (Student only)
router.post('/', [
  auth,
  authorize('student'),
  body('courseId').notEmpty().withMessage('Course ID is required')
], async (req, res) => {
  try {
    console.log('Enrollment request received:', {
      userId: req.user._id,
      userRole: req.user.role,
      courseId: req.body.courseId
    }); // Debug log

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array()); // Debug log
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { courseId } = req.body;

    // Check if course exists and is active
    const course = await Course.findById(courseId);
    console.log('Found course:', {
      exists: !!course,
      isActive: course?.isActive,
      isApproved: course?.isApproved,
      currentEnrollment: course?.currentEnrollment,
      maxStudents: course?.maxStudents
    }); // Debug log

    if (!course || !course.isActive) {
      return res.status(404).json({ message: 'Course not found or not available' });
    }

    // Check if course is approved
    if (!course.isApproved) {
      return res.status(400).json({ message: 'Course is pending approval and not available for enrollment' });
    }

    // Check if already enrolled
    let enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: courseId
    });

    if (enrollment) {
      if (enrollment.status === 'enrolled' || enrollment.status === 'active') { // 'active' might not be in enum but strict check 'enrolled' is main one
        return res.status(400).json({ message: 'Already enrolled in this course' });
      }

      // If status is dropped, reactivate
      if (enrollment.status === 'dropped') {
        // Check course capacity again
        if (course.currentEnrollment >= course.maxStudents) {
          return res.status(400).json({ message: 'Course is full' });
        }

        enrollment.status = 'enrolled';
        enrollment.enrollmentDate = Date.now();
        await enrollment.save();

        // Update course enrollment count
        await Course.findByIdAndUpdate(courseId, {
          $inc: { currentEnrollment: 1 }
        });

        await enrollment.populate([
          { path: 'student', select: 'firstName lastName email' },
          { path: 'course', select: 'title courseCode instructor' }
        ]);

        return res.status(200).json({
          message: 'Re-enrolled successfully',
          enrollment
        });
      }
    }

    // Check course capacity
    if (course.currentEnrollment >= course.maxStudents) {
      return res.status(400).json({ message: 'Course is full' });
    }

    // Create new enrollment if none exists
    enrollment = new Enrollment({
      student: req.user._id,
      course: courseId
    });

    await enrollment.save();

    // Update course enrollment count
    await Course.findByIdAndUpdate(courseId, {
      $inc: { currentEnrollment: 1 }
    });

    await enrollment.populate([
      { path: 'student', select: 'firstName lastName email' },
      { path: 'course', select: 'title courseCode instructor' }
    ]);

    res.status(201).json({
      message: 'Enrolled successfully',
      enrollment
    });
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({ message: 'Server error during enrollment' });
  }
});

/**
 * @swagger
 * /api/enrollments/student/{studentId}:
 *   get:
 *     summary: Get student enrollments
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of enrollments
 *       403:
 *         description: Access denied
 */
// @route   GET /api/enrollments/student/:studentId
// @desc    Get student enrollments
// @access  Private
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    // Students can only view their own enrollments
    if (req.user.role === 'student' && req.params.studentId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const enrollments = await Enrollment.find({
      student: req.params.studentId
    })
    .populate('course', 'title courseCode instructor credits fees')
    .populate({
      path: 'course',
      populate: {
        path: 'instructor',
        select: 'firstName lastName'
      }
    })
    .sort({ enrollmentDate: -1 });

    console.log(` fetched ${enrollments.length} enrollments for user ${req.params.studentId}`);
    enrollments.forEach(e => console.log(` - ${e.course?._id} status: ${e.status}`));

    res.json(enrollments);
  } catch (error) {
    console.error('Get student enrollments error:', error);
    res.status(500).json({ message: 'Server error while fetching enrollments' });
  }
});

/**
 * @swagger
 * /api/enrollments/course/{courseId}:
 *   get:
 *     summary: Get course enrollments
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of enrollments
 *       403:
 *         description: Access denied
 */
// @route   GET /api/enrollments/course/:courseId
// @desc    Get course enrollments
// @access  Private (Instructor/Admin)
router.get('/course/:courseId', [auth, authorize('instructor', 'admin')], async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if instructor owns this course
    if (req.user.role === 'instructor' && course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const enrollments = await Enrollment.find({
      course: req.params.courseId
    })
    .populate('student', 'firstName lastName email profileImage')
    .sort({ enrollmentDate: -1 });

    res.json(enrollments);
  } catch (error) {
    console.error('Get course enrollments error:', error);
    res.status(500).json({ message: 'Server error while fetching course enrollments' });
  }
});

/**
 * @swagger
 * /api/enrollments/{id}:
 *   delete:
 *     summary: Drop a course
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Dropped successfully
 *       404:
 *         description: Enrollment not found
 */
// @route   DELETE /api/enrollments/:id
// @desc    Drop from course
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Students can only drop their own enrollments
    if (req.user.role === 'student' && enrollment.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update enrollment status
    enrollment.status = 'dropped';
    await enrollment.save();

    // Update course enrollment count
    await Course.findByIdAndUpdate(enrollment.course, {
      $inc: { currentEnrollment: -1 }
    });

    res.json({ message: 'Dropped from course successfully' });
  } catch (error) {
    console.error('Drop course error:', error);
    res.status(500).json({ message: 'Server error while dropping course' });
  }
});

module.exports = router;
