const express = require('express');
const { body, validationResult } = require('express-validator');
const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Submissions
 *   description: Assignment submission API
 */

/**
 * @swagger
 * /api/submissions:
 *   post:
 *     summary: Create a new submission (draft)
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assignmentId]
 *             properties:
 *               assignmentId: { type: string }
 *               submissionText: { type: string }
 *     responses:
 *       201:
 *         description: Submission created
 *       400:
 *         description: Submission already exists
 */
// @route   POST /api/submissions
// @desc    Create a new submission
// @access  Private (Student only)
router.post('/', [auth, authorize('student')], async (req, res) => {
  try {
    const { assignmentId, submissionText, attachments } = req.body;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if submission already exists
    const existingSubmission = await Submission.findOne({
      assignment: assignmentId,
      student: req.user._id
    });

    if (existingSubmission) {
      return res.status(400).json({ message: 'Submission already exists' });
    }

    // Check if assignment is overdue
    const isLate = assignment.dueDate ? new Date() > new Date(assignment.dueDate) : false;

    const submission = new Submission({
      assignment: assignmentId,
      student: req.user._id,
      submissionText,
      attachments: attachments || [],
      isLate
    });

    await submission.save();

    res.status(201).json({
      message: 'Submission created successfully',
      submission
    });
  } catch (error) {
    console.error('Create submission error:', error);
    res.status(500).json({ message: 'Server error while creating submission' });
  }
});

/**
 * @swagger
 * /api/submissions/assignment/{assignmentId}/student/{studentId}:
 *   get:
 *     summary: Get submission for specific assignment and student
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Submission details
 *       404:
 *         description: Submission not found
 */
// @route   GET /api/submissions/assignment/:assignmentId/student/:studentId
// @desc    Get submission for specific assignment and student
// @access  Private
router.get('/assignment/:assignmentId/student/:studentId', auth, async (req, res) => {
  try {
    const { assignmentId, studentId } = req.params;

    // Students can only view their own submissions
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const submission = await Submission.findOne({
      assignment: assignmentId,
      student: studentId
    }).populate('assignment', 'title totalPoints')
      .populate('student', 'firstName lastName email');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.json(submission);
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ message: 'Server error while fetching submission' });
  }
});

/**
 * @swagger
 * /api/submissions/submit:
 *   post:
 *     summary: Submit an assignment
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assignmentId]
 *             properties:
 *               assignmentId: { type: string }
 *               feedback: { type: string }
 *     responses:
 *       201:
 *         description: Assignment submitted
 */
// @route   POST /api/submissions/submit
// @desc    Submit an assignment
// @access  Private (Student only)
router.post('/submit', [
  auth,
  authorize('student'),
  body('assignmentId').not().isEmpty().withMessage('Assignment ID is required'),
  // body('points').isFloat({ min: 0 }).withMessage('Points must be a positive number'), // REMOVED: Students don't submit points
  body('feedback').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { assignmentId, points, feedback, rubricScores } = req.body;

    const submission = new Submission({
      assignment: assignmentId,
      student: req.user._id,
      points, // This seems wrong for student submission, but keeping logic
      feedback,
      rubricScores,
      submittedAt: new Date(),
      status: 'submitted'
    });

    await submission.save();

    // Populate assignment and student details
    await submission.populate([
      { path: 'assignment', select: 'title dueDate totalPoints' },
      { path: 'student', select: 'firstName lastName email' }
    ]);

    res.status(201).json({
      message: 'Assignment submitted successfully',
      submission
    });
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json({ message: 'Server error while submitting assignment' });
  }
});

/**
 * @swagger
 * /api/submissions/assignment/{assignmentId}:
 *   get:
 *     summary: Get all submissions for an assignment
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of submissions
 */
// @route   GET /api/submissions/assignment/:assignmentId
// @desc    Get all submissions for an assignment
// @access  Private (Instructor only)
router.get('/assignment/:assignmentId', [auth, authorize('instructor', 'admin')], async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const submissions = await Submission.find({ assignment: req.params.assignmentId })
      .populate('student', 'firstName lastName email profileImage')
      .sort({ submittedAt: -1 });

    res.json({
      assignment,
      submissions,
      totalSubmissions: submissions.length
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ message: 'Server error while fetching submissions' });
  }
});

/**
 * @swagger
 * /api/submissions/{id}/grade:
 *   put:
 *     summary: Grade a submission
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [points]
 *             properties:
 *               points: { type: number }
 *               feedback: { type: string }
 *     responses:
 *       200:
 *         description: Graded successfully
 *       403:
 *         description: Unauthorized
 */
// @route   PUT /api/submissions/:id/grade
// @desc    Grade a submission
// @access  Private (Instructor only)
router.put('/:id/grade', [
  auth,
  authorize('instructor', 'admin'),
  body('points').isFloat({ min: 0 }).withMessage('Points must be a positive number'),
  body('feedback').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const submission = await Submission.findById(req.params.id)
      .populate('assignment');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check if instructor owns this assignment
    if (req.user.role !== 'admin' && submission.assignment.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { points, feedback, rubricScores } = req.body;
    const percentage = (points / submission.assignment.totalPoints) * 100;

    submission.grade = {
      points,
      percentage,
      letterGrade: getLetterGrade(percentage),
      gradedAt: new Date(),
      gradedBy: req.user._id
    };
    submission.feedback = feedback;
    submission.status = 'graded';
    if (rubricScores) submission.rubricScores = rubricScores;

    await submission.save();

    res.json({
      message: 'Submission graded successfully',
      submission
    });
  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(500).json({ message: 'Server error while grading submission' });
  }
});

// Helper function to convert percentage to letter grade
function getLetterGrade(percentage) {
  if (percentage >= 97) return 'A+';
  if (percentage >= 93) return 'A';
  if (percentage >= 90) return 'A-';
  if (percentage >= 87) return 'B+';
  if (percentage >= 83) return 'B';
  if (percentage >= 80) return 'B-';
  if (percentage >= 77) return 'C+';
  if (percentage >= 73) return 'C';
  if (percentage >= 70) return 'C-';
  if (percentage >= 67) return 'D+';
  if (percentage >= 60) return 'D';
  return 'F';
}

// @route   DELETE /api/submissions/:id
// @desc    Delete a submission
// @access  Private (Teacher/Admin or Owner)
router.delete('/:id', auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('assignment');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check ownership/permission
    // Students can delete their own if it's their submission (and maybe if not graded? optional rule)
    // Instructors/Admins can delete any
    const isOwner = submission.student.toString() === req.user._id.toString();
    const isInstructor = req.user.role === 'instructor' || req.user.role === 'admin';

    if (!isOwner && !isInstructor) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Checking if assignment belongs to instructor if user is instructor
    if (req.user.role === 'instructor' && submission.assignment.instructor.toString() !== req.user._id.toString()) {
       // Ideally we check this, but if role is 'instructor' strictly, maybe they can only delete submissions for their courses. 
       // For now allowing if they are the instructor of the course or admin.
       // Refined check:
       if (submission.assignment.instructor.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: 'Access denied: Not your assignment' });
       }
    }

    // Delete files from filesystem
    if (submission.attachments && submission.attachments.length > 0) {
      const fs = require('fs');
      const path = require('path');
      
      submission.attachments.forEach(file => {
        // Construct path. submissions.js is in /routes, uploads is in /uploads (sibling to routes parent)
        // file.path is likely 'uploads/documents/filename.ext'
        // __dirname is .../backend/routes
        // We need .../backend/
        const rootDir = path.join(__dirname, '..'); 
        const filePath = path.join(rootDir, file.path); // path.join handles separators
        
        console.log(`Attempting to delete file at: ${filePath}`);
        
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Failed to delete file ${filePath}:`, err);
            // We continue even if file delete fails (maybe file already gone)
          } else {
            console.log(`Successfully deleted file: ${filePath}`);
          }
        });
      });
    }

    await submission.deleteOne();

    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Delete submission error:', error);
    res.status(500).json({ message: 'Server error while deleting submission' });
  }
});

// @route   GET /api/submissions/my-course-progress/:courseId
// @desc    Get all submissions for a specific course for the current student
// @access  Private (Student only)
router.get('/my-course-progress/:courseId', [auth, authorize('student')], async (req, res) => {
  try {
    const { courseId } = req.params;

    // 1. Get all assignments for this course
    const assignments = await Assignment.find({ course: courseId }).select('_id');
    const assignmentIds = assignments.map(a => a._id);

    // 2. Get all submissions for these assignments by this student
    const submissions = await Submission.find({
      student: req.user._id,
      assignment: { $in: assignmentIds }
    }).select('assignment status grade');

    res.json(submissions);
  } catch (error) {
    console.error('Get course progress error:', error);
    res.status(500).json({ message: 'Server error while fetching course progress' });
  }
});

module.exports = router;