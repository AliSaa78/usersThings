const express = require('express');
const { userControll, pagination } = require('../controller/userController.js');
const multer = require('multer');
const { default: rateLimit } = require('express-rate-limit');
const router = express.Router();
const Friend = require('../model/friendsModel.js');
const signUplimiter = rateLimit({
    windowMs:15* 60 * 1000,
    limit:5,
    message:'Too many singup/login attempts,please try again after 15 minutes'
});
const loginlimiter = rateLimit({
    windowMs:15* 60 * 1000,
    limit:15,
    message:'Too many singup/login attempts,please try again after 15 minutes'
});

const fileFilter = (req,file,cb)=>{
    if(file.mimetype ==='image/png'
      || file.mimetype==='image/jpg'||
      file.mimetype === 'image/jpeg'
     ){
        cb(null,true);
     }
     else{
        cb(null, false);
     }
}


// Configure multer for profile picture uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) =>  cb(null, './uploads'),//file path 
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage:storage,fileFilter:fileFilter, limits: { fileSize: 1024 * 1024 * 2 } });

// User sign up
router.post('/signUp',signUplimiter,upload.single('newUserPic'), userControll.signUp);

// User login
router.post('/login', loginlimiter , userControll.login);

// Get user profile
router.get('/profile', userControll.protect,pagination(Friend), userControll.getProfile);

// Update user information
router.put('/updateInfo/:id',upload.single('image'), userControll.protect, userControll.updateUser);

// Delete user account
router.delete('/deleteAccount/:id', userControll.protect, userControll.deleteUser);

// Add a friend
router.post('/addFriend', userControll.protect, userControll.addFriend);

// Fetch all friends
router.get('/your-friend-list',userControll.protect, userControll.getAllFriends);

// Remove a friend
router.post('/removeFriend', userControll.protect, userControll.deleteFriend);

// Accept friend request
router.post('/acceptFriend/:requestId', userControll.protect, userControll.acceptFriend);

// Reject friend request
router.post('/rejectFriend/:requestId', userControll.protect, userControll.rejectFriend);

module.exports = router;
