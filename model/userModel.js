const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');


const userSchema  = new mongoose.Schema({
 username:{
    type:String,
    required:[true,'please enter your user name'],
    unique:true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username cannot be longer than 20 characters'],
 },
 email: {
    type: String,
    required: [true, 'Please enter an email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please enter a valid email'],
  },
 password: {
   type: String,
   required: [true, 'Please enter a password'],
   minlength: [6, 'Password must be at least 6 characters'] 
 },
 createdAt: {
   type: Date,
   default: Date.now,
 },
 imagePath: { type: String ,
  required: false
} 

});


userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
