const express = require('express');
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Messaging API
 */

/**
 * @swagger
 * /api/messages/inbox:
 *   get:
 *     summary: Get user's inbox
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of received messages
 */
// @route   GET /api/messages/inbox
// @desc    Get user's inbox
// @access  Private
router.get('/inbox', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ 
      receiver: req.user._id,
      isDeleted: false 
    })
    .populate('sender', 'firstName lastName email role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const total = await Message.countDocuments({ 
      receiver: req.user._id,
      isDeleted: false 
    });

    res.json({
      messages,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get inbox error:', error);
    res.status(500).json({ message: 'Server error while fetching inbox' });
  }
});

/**
 * @swagger
 * /api/messages/sent:
 *   get:
 *     summary: Get sent messages
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of sent messages
 */
// @route   GET /api/messages/sent
// @desc    Get sent messages
// @access  Private
router.get('/sent', auth, async (req, res) => {
  try {
    const messages = await Message.find({ 
      sender: req.user._id,
      isDeleted: false 
    })
    .populate('receiver', 'firstName lastName email role')
    .sort({ createdAt: -1 });

    res.json(messages);
  } catch (error) {
    console.error('Get sent messages error:', error);
    res.status(500).json({ message: 'Server error while fetching sent messages' });
  }
});

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [receiverId, subject, content]
 *             properties:
 *               receiverId: { type: string }
 *               subject: { type: string }
 *               content: { type: string }
 *               priority: { type: string, enum: [normal, high] }
 *     responses:
 *       201:
 *         description: Message sent
 *       400:
 *         description: Validation error
 */
// @route   POST /api/messages
// @desc    Send a new message
// @access  Private
router.post('/', [
  auth,
  body('receiverId').notEmpty().withMessage('Receiver is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('content').trim().notEmpty().withMessage('Content is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { receiverId, subject, content, priority = 'normal' } = req.body;

    // Handle "All Students" broadcast
    if (receiverId === 'all_students') {
      // Fetch all active students (excluding sender if they are a student)
      const students = await User.find({ 
        role: 'student', 
        isActive: true,
        _id: { $ne: req.user._id } 
      }).select('_id');

      if (students.length === 0) {
        return res.status(400).json({ message: 'No students found to message' });
      }

      const messages = students.map(student => ({
        sender: req.user._id,
        receiver: student._id,
        subject,
        content,
        priority,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await Message.insertMany(messages);

      return res.status(201).json({
        message: `Message sent successfully to ${messages.length} students`,
        count: messages.length
      });
    }

    // Single Recipient Logic
    const message = new Message({
      sender: req.user._id,
      receiver: receiverId,
      subject,
      content,
      priority
    });

    await message.save();
    await message.populate([
      { path: 'sender', select: 'firstName lastName email' },
      { path: 'receiver', select: 'firstName lastName email' }
    ]);

    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error while sending message' });
  }
});

/**
 * @swagger
 * /api/messages/{id}/read:
 *   put:
 *     summary: Mark message as read
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Marked as read
 *       403:
 *         description: Access denied
 */
// @route   PUT /api/messages/:id/read
// @desc    Mark message as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    message.isRead = true;
    await message.save();

    res.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({ message: 'Server error while marking message as read' });
  }
});

/**
 * @swagger
 * /api/messages/users:
 *   get:
 *     summary: Get users for messaging
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available users
 */
// @route   GET /api/messages/users
// @desc    Get users for messaging
// @access  Private
router.get('/users', auth, async (req, res) => {
  try {
    const users = await User.find({ 
      _id: { $ne: req.user._id },
      isActive: true 
    })
    .select('firstName lastName email role')
    .sort({ firstName: 1 });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

module.exports = router;
