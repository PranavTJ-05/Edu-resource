const express = require('express');
const { body, validationResult, query } = require('express-validator');
const jwt = require('jsonwebtoken'); // Import jwt
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { auth, authorize, checkApproval } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Course:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - courseCode
 *         - credits
 *         - maxStudents
 *         - category
 *         - level
 *       properties:
 *         title:
 *           type: string
 *           description: Course title
 *         description:
 *           type: string
 *           description: Course description
 *         courseCode:
 *           type: string
 *           description: Unique course code
 *         credits:
 *           type: integer
 *           description: Number of credits
 *         maxStudents:
 *           type: integer
 *           description: Maximum number of students
 *         category:
 *           type: string
 *           description: Course category
 *         level:
 *           type: string
 *           enum: ['1st Year', '2nd Year', '3rd Year', '4th Year']
 *           description: Course level
 *         thumbnailImage:
 *           type: string
 *           description: URL of the course thumbnail
 *         instructor:
 *           $ref: '#/components/schemas/User'
 *         modules:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               duration: { type: string }
 *               markdownContent: { type: string }
 */

/**
 * @swagger
 * tags:
 *   name: Courses
 *   description: Course management API
 */

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Get all courses
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *         description: Filter by level
 *     responses:
 *       200:
 *         description: List of courses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 courses:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Course'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     current: { type: integer }
 *                     pages: { type: integer }
 *                     total: { type: integer }
 *       500:
 *         description: Server error
 */
// @route   GET /api/courses
// @desc    Get all courses with filtering and pagination
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('category').optional().trim(),
  query('level').optional().isIn(['1st Year', '2nd Year', '3rd Year', '4th Year']),
  query('search').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    let filter = {};
    
    // Check for auth token to allow instructors to see "My Courses" even if inactive
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // If user is authenticated, we adjust the filter logic
        // We want: (isActive: true) OR (instructor: userId)
        if (req.query.search || req.query.category || req.query.level) {
           // If other filters are present, we need to respect them AND the visibility rule
           // Base rule: (isActive: true OR instructor: me)
           // But how to combine with other filters?
           // Actually, simpler: Default is { isActive: true }
           // If instructor, we change to { $or: [{ isActive: true }, { instructor: userId }] }
           // But we still need to apply search/category/level filters.
           
           filter.$or = [
             { isActive: true },
             { instructor: decoded.userId }
           ];
        } else {
           // No other filters? Same logic.
           filter.$or = [
             { isActive: true },
             { instructor: decoded.userId }
           ];
        }
      } catch (err) {
        // Invalid token, treat as public
        filter.isActive = true;
      }
    } else {
      filter.isActive = true;
    }
    
    // If we have specific filters from query, we must ensure they are applied effectively
    // Note: If using $or for visibility, we must combine it with other filters via $and if necessary.
    // MongoDB structure: { $and: [ { VISIBILITY_RULE }, { FILTER_RULE } ] }
    
    // Let's refine the filter construction:
    const visibilityFilter = filter.$or ? { $or: filter.$or } : { isActive: true };
    
    // Reset filter to build it properly
    filter = { ...visibilityFilter };
    
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.level) {
      filter.level = req.query.level;
    }
    
    if (req.query.search) {
      // If search exists, we need to combine with visibility
      const searchFilter = {
        $or: [
          { title: { $regex: req.query.search, $options: 'i' } },
          { description: { $regex: req.query.search, $options: 'i' } },
          { courseCode: { $regex: req.query.search, $options: 'i' } }
        ]
      };
      
      // Merge search filter with existing filter
      // If filter already has $or (from visibility), we need to use $and
      if (filter.$or) {
        filter = {
          $and: [
             { $or: filter.$or }, // Visibility: Active OR Mine
             searchFilter         // AND Search match
          ]
        };
        // Re-apply category/level if they were added (since we reset filter)
        // Wait, the previous lines 35-41 added category/level to the 'filter' object directly.
        // If we switch to $and root, we need to put category/level inside $and or at root level (if not conflicting).
        // Mixing top-level fields with $and is fine.
        
        if (req.query.category) filter.category = req.query.category;
        if (req.query.level) filter.level = req.query.level;
        
      } else {
        // Public (isActive: true)
        // searchFilter has $or, so we use $and to combine: (Active) AND (SearchMatch)
        // Actually, lines 44-48 below handled search by adding $or.
        // But if we already have isActive: true, adding $or at root would mean (Active AND ...) OR (Search...) 
        // - NO, that's not how it works.
        // If we act strictly:
        // We have `filter.isActive = true`.
        // We add `filter.$or = [search...]`.
        // Result: `isActive: true` AND (`title match` OR `desc match`...). This is CORRECT.
        
        // So for public users, existing logic was:
        // filter = { isActive: true }
        // if search: filter.$or = [search_criteria]
        // This works: Active AND (Search Criteria).
        
        // For instructors:
        // filter = { $or: [{isActive: true}, {instructor: me}] }
        // if search: filter.$or = [search_criteria] -> THIS OVERWRITES the visibility $or!
        // We need $and.
        
      }
    }

    // Get courses with pagination
    const courses = await Course.find(filter)
      .populate('instructor', 'firstName lastName email')
      .select('-materials')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Course.countDocuments(filter);

    res.json({
      courses,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ message: 'Server error while fetching courses' });
  }
});

/**
 * @swagger
 * /api/courses/{id}:
 *   put:
 *     summary: Update a course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Course'
 *     responses:
 *       200:
 *         description: Course updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
// @route   PUT /api/courses/:id
// @desc    Update course details
// @access  Private (Instructor only)
router.put('/:id', [auth, authorize('instructor')], async (req, res) => {
  try {
    const { title, description, category, level, credits, maxStudents, fees, isActive, prerequisites, materials, thumbnailImage } = req.body;
    
    let course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check ownership
    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this course' });
    }

    const updates = {};
    if (title) updates.title = title;
    if (description) updates.description = description;
    if (category) updates.category = category;
    if (level) updates.level = level;
    if (credits) updates.credits = credits;
    if (maxStudents) updates.maxStudents = maxStudents;
    if (fees !== undefined) updates.fees = fees;
    if (isActive !== undefined) updates.isActive = isActive;
    if (prerequisites) updates.prerequisites = prerequisites;
    if (materials) updates.materials = materials;
    if (thumbnailImage !== undefined) updates.thumbnailImage = thumbnailImage;

    course = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json(course);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ message: 'Server error while updating course' });
  }
});

/**
 * @swagger
 * /api/courses/{id}:
 *   delete:
 *     summary: Delete a course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course removed
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
// @route   DELETE /api/courses/:id
// @desc    Delete a course
// @access  Private (Instructor only)
router.delete('/:id', [auth, authorize('instructor')], async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check ownership
    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this course' });
    }

    // Optional: Check if course has enrollments before deleting?
    // For now, simple delete
    await course.deleteOne();

    res.json({ message: 'Course removed' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ message: 'Server error while deleting course' });
  }
});

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Get course by ID
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       404:
 *         description: Course not found
 */
// @route   GET /api/courses/:id
// @desc    Get single course by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'firstName lastName email profileImage');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    console.error('Get course error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.status(500).json({ message: 'Server error while fetching course' });
  }
});

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = 'uploads/course-thumbnails';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'course-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload an image.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: Create a new course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               courseCode: { type: string }
 *               credits: { type: integer }
 *               maxStudents: { type: integer }
 *               category: { type: string }
 *               level: { type: string }
 *               thumbnailImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Course created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 course: { $ref: '#/components/schemas/Course' }
 *       400:
 *         description: Validation error or course code exists
 *       403:
 *         description: Unauthorized (Instructor only)
 *       500:
 *         description: Server error
 */
// @route   POST /api/courses
// @desc    Create a new course
// @access  Private (Instructor only)
router.post('/', [
  auth,
  authorize('instructor'),
  upload.single('thumbnailImage'),
  body('title').trim().notEmpty().withMessage('Course title is required'),
  body('description').trim().notEmpty().withMessage('Course description is required'),
  body('courseCode').trim().notEmpty().withMessage('Course code is required'),
  body('credits').isInt({ min: 1, max: 10 }).withMessage('Credits must be between 1 and 10'),
  body('maxStudents').isInt({ min: 1 }).withMessage('Maximum students must be at least 1'),
  // fees validation removed
  body('category').notEmpty().withMessage('Category is required'),
  body('level').isIn(['1st Year', '2nd Year', '3rd Year', '4th Year']).withMessage('Invalid level')
  // Removed duration validation - now optional
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // If there was an uploaded file but validation failed, delete it
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    // Check if course code already exists
    const existingCourse = await Course.findOne({ 
      courseCode: req.body.courseCode.toUpperCase() 
    });
    
    if (existingCourse) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Course code already exists' });
    }

    // Process uploaded file
    let thumbnailImage = '';
    if (req.file) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      thumbnailImage = `${baseUrl}/${req.file.path.replace(/\\/g, '/')}`;
    }

    // Create course
    const courseData = {
      ...req.body,
      instructor: req.user._id,
      courseCode: req.body.courseCode.toUpperCase(),
      isApproved: true, // Courses are automatically approved
      thumbnailImage // Add the image URL
    };

    const course = new Course(courseData);
    await course.save();

    await course.populate('instructor', 'firstName lastName email');

    res.status(201).json({
      message: 'Course created successfully.',
      course
    });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path); // Clean up on error
    console.error('Create course error:', error);
    res.status(500).json({ message: 'Server error while creating course' });
  }
});

/**
 * @swagger
 * /api/courses/instructor/{instructorId}:
 *   get:
 *     summary: Get courses by instructor
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instructorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of courses
 *       403:
 *         description: Access denied or Unauthorized
 */
// @route   GET /api/courses/instructor/:instructorId
// @desc    Get courses by instructor
// @access  Private
router.get('/instructor/:instructorId', auth, async (req, res) => {
  try {
    // Check if user is accessing their own courses or is admin
    if (req.user._id.toString() !== req.params.instructorId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const courses = await Course.find({ 
      instructor: req.params.instructorId
    })
    .populate('instructor', 'firstName lastName email')
    .sort({ createdAt: -1 });

    res.json(courses);
  } catch (error) {
    console.error('Get instructor courses error:', error);
    res.status(500).json({ message: 'Server error while fetching instructor courses' });
  }
});

/**
 * @swagger
 * /api/courses/{id}/material:
 *   post:
 *     summary: Add material to course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, type, url]
 *             properties:
 *               title: { type: string }
 *               type: { type: string, enum: [pdf, video, link, document, note] }
 *               url: { type: string }
 *               filename: { type: string }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Material added
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
// @route   POST /api/courses/:id/material
// @desc    Add material to a course
// @access  Private
router.post('/:id/material', [
  auth, 
  auth, 
  authorize('instructor'),
  body('title').notEmpty().withMessage('Title is required'),
  body('type').isIn(['pdf', 'video', 'link', 'document', 'note']).withMessage('Invalid material type'),
  body('url').notEmpty().withMessage('URL is required'),
  body('isFree').optional().isBoolean().withMessage('isFree must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const { title, type, url, filename, description } = req.body;

    // Find the course by ID
    let course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is the instructor of this course or admin
    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to add materials to this course' });
    }

    // Add the new material to the course
    const material = {
      title,
      type,
      url,
      filename,
      description,
      description,
      // isFree removed
      uploadDate: new Date()
    };

    course.materials.push(material);

    // Save the updated course
    await course.save();

    res.json({
      message: 'Material added successfully',
      material: course.materials[course.materials.length - 1]
    });
  } catch (error) {
    console.error('Add material error:', error);
    res.status(500).json({ message: 'Server error while adding material' });
  }
});

/**
 * @swagger
 * /api/courses/{id}/material/{materialId}:
 *   put:
 *     summary: Update a course material
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: materialId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               type: { type: string }
 *               url: { type: string }
 *     responses:
 *       200: { description: Material updated }
 */
// @route   PUT /api/courses/:id/material/:materialId
// @desc    Update a course material
// @access  Private
router.put('/:id/material/:materialId', [
  auth, 
  auth, 
  authorize('instructor'),
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('type').optional().isIn(['pdf', 'video', 'link', 'document', 'note']).withMessage('Invalid material type'),
  body('url').optional().notEmpty().withMessage('URL cannot be empty'),
  body('isFree').optional().isBoolean().withMessage('isFree must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { id, materialId } = req.params;
    const updates = req.body;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is the instructor of this course or admin
    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update materials in this course' });
    }

    const material = course.materials.id(materialId);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Update material fields
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        material[key] = updates[key];
      }
    });

    await course.save();

    res.json({
      message: 'Material updated successfully',
      material
    });
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ message: 'Server error while updating material' });
  }
});

/**
 * @swagger
 * /api/courses/{id}/material/{materialId}:
 *   delete:
 *     summary: Delete a course material
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: materialId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Material deleted }
 */
// @route   DELETE /api/courses/:id/material/:materialId
// @desc    Delete a course material
// @access  Private
router.delete('/:id/material/:materialId', [auth, authorize('instructor')], async (req, res) => {
  try {
    const { id, materialId } = req.params;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is the instructor of this course or admin
    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete materials from this course' });
    }

    const material = course.materials.id(materialId);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    course.materials.pull(materialId);
    await course.save();

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ message: 'Server error while deleting material' });
  }
});

/**
 * @swagger
 * /api/courses/{id}/modules:
 *   post:
 *     summary: Add a module to a course
 *     tags: [Courses]
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
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               duration: { type: string }
 *               markdownContent: { type: string }
 *     responses:
 *       200: { description: Module added }
 */
// @route   POST /api/courses/:id/modules
// @desc    Add a module to a course
// @access  Private (Instructor only)
router.post('/:id/modules', [
  auth,
  authorize('instructor'),
  body('title').notEmpty().withMessage('Module title is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const newModule = {
      title: req.body.title,
      description: req.body.description,
      duration: req.body.duration,
      markdownContent: req.body.markdownContent,
      materials: req.body.materials || [] // Array of { title, type, url, ... }
    };

    course.modules.push(newModule);
    await course.save();

    res.json(course.modules[course.modules.length - 1]);
  } catch (error) {
    console.error('Add module error:', error);
    res.status(500).json({ message: 'Server error adding module' });
  }
});

/**
 * @swagger
 * /api/courses/{id}/modules/{moduleId}:
 *   put:
 *     summary: Update a module
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               duration: { type: string }
 *               markdownContent: { type: string }
 *     responses:
 *       200: { description: Module updated }
 */
// @route   PUT /api/courses/:id/modules/:moduleId
// @desc    Update a module
// @access  Private (Instructor only)
router.put('/:id/modules/:moduleId', [auth, authorize('instructor')], async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const module = course.modules.id(req.params.moduleId);
    if (!module) return res.status(404).json({ message: 'Module not found' });

    if (req.body.title) module.title = req.body.title;
    if (req.body.description) module.description = req.body.description;
    if (req.body.duration) module.duration = req.body.duration;
    if (req.body.markdownContent) module.markdownContent = req.body.markdownContent;
    if (req.body.materials) module.materials = req.body.materials;

    await course.save();
    res.json(module);
  } catch (error) {
    console.error('Update module error:', error);
    res.status(500).json({ message: 'Server error updating module' });
  }
});

/**
 * @swagger
 * /api/courses/{id}/modules/{moduleId}:
 *   delete:
 *     summary: Delete a module
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Module removed }
 */
// @route   DELETE /api/courses/:id/modules/:moduleId
// @desc    Delete a module
// @access  Private (Instructor only)
router.delete('/:id/modules/:moduleId', [auth, authorize('instructor')], async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    course.modules.pull(req.params.moduleId);
    await course.save();
    res.json({ message: 'Module removed' });
  } catch (error) {
    console.error('Delete module error:', error);
    res.status(500).json({ message: 'Server error deleting module' });
  }
});





module.exports = router;