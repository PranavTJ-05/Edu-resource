const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const User = require('../models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const createInstructorUser = async () => {
  try {
    // Check if instructor user already exists
    const instructorEmail = 'chendur@gmail.com';
    const instructorPassword = '12341234';
    
    let user = await User.findOne({ email: instructorEmail });
    
    if (user) {
      console.log('Instructor user already exists. Updating...');
      user.firstName = 'Teacher';
      user.role = 'instructor';
      user.password = instructorPassword; // Will be hashed by pre-save middleware
      user.isApproved = true;
      user.isActive = true;
      
      // Ensure instructor profile exists
      if (!user.instructorProfile) {
        user.instructorProfile = {
          qualification: 'Master of Education',
          experience: 10,
          specialization: ['Web Development', 'Physics'],
          bio: 'Lead Instructor'
        };
      }
    } else {
      console.log('Creating new instructor user...');
      user = new User({
        firstName: 'Teacher',
        lastName: 'User',
        email: instructorEmail,
        password: instructorPassword,
        role: 'instructor',
        isApproved: true,
        isActive: true,
        instructorProfile: {
          qualification: 'Master of Education',
          experience: 10,
          specialization: ['Web Development', 'Physics'],
          bio: 'Lead Instructor'
        }
      });
    }

    await user.save();

    console.log('Instructor user seeded successfully!');
    console.log(`Email: ${instructorEmail}`);
    console.log(`Password: ${instructorPassword}`);
    console.log('You can now log in as the instructor.');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding instructor user:', error);
    process.exit(1);
  }
};

createInstructorUser();
