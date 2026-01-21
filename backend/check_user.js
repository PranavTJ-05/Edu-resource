const mongoose = require('mongoose');
const User = require('./models/User'); // Updated path
const dotenv = require('dotenv');
dotenv.config(); // .env is in current dir now

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to DB');
    
    // Check for both emails
    const emailWithDot = 'pranav.tj150605@gmail.com';
    const emailNoDot = 'pranavtj150605@gmail.com';
    
    const userWithDot = await User.findOne({ email: emailWithDot });
    console.log(`User with dot (${emailWithDot}): ${userWithDot ? 'Found' : 'Not Found'}`);
    
    const userNoDot = await User.findOne({ email: emailNoDot });
    console.log(`User without dot (${emailNoDot}): ${userNoDot ? 'Found' : 'Not Found'}`);
    
    if (userNoDot) {
      console.log(`Status of ${emailNoDot}: isActive=${userNoDot.isActive}, isApproved=${userNoDot.isApproved}`);
      
      // Reactivate if inactive
      if (!userNoDot.isActive) {
        console.log('Reactivating user...');
        userNoDot.isActive = true;
        userNoDot.isApproved = true; // Also approve just in case
        await userNoDot.save();
        console.log('User reactivated.');
      }
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
