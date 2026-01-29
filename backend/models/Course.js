const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  courseCode: {
    type: String,
    required: [true, 'Course code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Instructor is required']
  },
  credits: {
    type: Number,
    required: [true, 'Credits are required'],
    min: [1, 'Credits must be at least 1'],
    max: [10, 'Credits cannot exceed 10']
  },
  maxStudents: {
    type: Number,
    required: [true, 'Maximum students limit is required'],
    min: [1, 'Maximum students must be at least 1']
  },
  currentEnrollment: {
    type: Number,
    default: 0
  },
  // fees field removed
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Arts', 'Business', 'Other']
  },
  level: {
    type: String,
    required: [true, 'Level is required'],
    enum: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    default: '1st Year'
  },
  prerequisites: [String],
  modules: [{
    title: { type: String, required: true },
    description: String,
    duration: String, // e.g., "2 hours"
    markdownContent: String, // The content from the Markdown Manager
    assignments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment'
    }],
    isAssignmentBlocking: {
      type: Boolean,
      default: true
    },
    // assignment field deprecated, kept for reference if needed but better removed to force migration
    materials: [{
      title: String,
      type: {
        type: String,
        enum: ['pdf', 'video', 'link', 'document', 'note']
      },
      url: String,
      filename: String,
      description: String,
      uploadDate: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  // materials: [] // Deprecated - replaced by modules. Keeping strictly for migration/reference if needed? No, let's just comment it out or remove it to enforce new structure.
  // We will assume fresh start or ignoring old materials field for now as per plan.
  isActive: {
    type: Boolean,
    default: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  thumbnailImage: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes for better performance
courseSchema.index({ courseCode: 1 });
courseSchema.index({ instructor: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ isActive: 1, isApproved: 1 });

// Virtual for enrollment status
courseSchema.virtual('isFullyEnrolled').get(function() {
  return this.currentEnrollment >= this.maxStudents;
});

// Removed duration validation since we removed duration fields

module.exports = mongoose.model('Course', courseSchema);
