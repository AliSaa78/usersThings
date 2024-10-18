const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../model/userModel');
const Friend = require('../model/friendsModel');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const secretKey = process.env.SECRET_TOKEN_ACCESS;

const userControll = {
    // Creating a new User
    signUp: async (req, res) => {
        try {
            let imagePath = null;
            if (req.file) {
                imagePath = req.file.path; // Get the path of the uploaded file
            }
            const emailExists = await User.findOne({ email:req.body.email });
            if (emailExists) {
                return res.status(400).json({ message: "Email already exists" });
            }
            const newUser = new User({ ...req.body , imagePath: imagePath  });
            await newUser.save();
            const token = jwt.sign(
                { id: newUser._id },
                secretKey,
                { expiresIn: '8h' }
            );
            
            res.status(201).json({ token });
        } catch (err) {
            console.log(err);
            res.status(500).send('Server error');
        }
    },

    // Logging in
    login: async (req, res) => {
        try {
            const { username, password } = req.body;
            const user = await User.findOne({ username });
            if (!user) {
                return res.status(401).json({ message: "Invalid username or password" });
            }
            
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).send('Invalid email or password');
            }
            const token = jwt.sign({ id: user._id}, secretKey, { expiresIn: '8h' });
            res.status(201).json({ token });
        } catch (err) {
            console.log(err);
            res.status(500).send('Server error');
        }
    },
    // Get Profile
    getProfile: async (req, res) => {
        try {
            const authHeader = req.headers.authorization || req.headers.Authorization;
            if (!authHeader) {
                return res.status(403).json({ message: "Token is not provided" });
            }
            const token = authHeader.split(' ')[1];
            const payload = jwt.decode(token);
            const user = await User.findById(payload.id);
            if(!user){
                return res.status(404).json({message:"user not found"});
            }
            res.status(200).json({
                id: user._id,
                username: user.username,
                email: user.email,
                imagePath: user.imagePath 
            });

        } catch (error) {
            console.log(err);
            res.status(500).send('Server error');
        }
    },

    // Protect middleware
    protect: async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization || req.headers.Authorization;
            if (!authHeader) {
                return res.status(403).json({ message: "Token is not provided" });
            }
            const token = authHeader.split(' ')[1];
            jwt.verify(token, secretKey, async (err, decoded) => {
                if (err) {
                    return res.status(403).json({ message: "Invalid Token" });
                }
                console.log(decoded);
                req.user = await User.findById(decoded.id).select('-password');
                if (!req.user) {
                    return res.status(404).json({ message: "User not found" });
                }
                next();
            });
        } catch (err) {
            console.log(err);
            res.status(500).send('Server error');;
        }
    },



updateUser: async (req, res) => {
    try {
        let image = req.file ? req.file.path : null; // Get new image if uploaded

        // Check if the user ID matches the logged-in user ID
        if (req.params.id != req.user._id) {
            return res.status(404).send("Not the same user ID");
        }

        // Find the current user to check existing imagePath
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).send("User not found");
        }

        // Handle image update or removal
        if (req.file) {
            // If a new image is uploaded, set the new imagePath
            req.body.imagePath = image;

            // Delete the old image if it exists
            if (user.imagePath) {
                fs.unlink(user.imagePath, (err) => {
                    if (err) {
                        console.error("Error deleting the old image:", err);
                        return res.status(500).send('Error deleting the image');
                    }
                });
            }
        } else if (req.body.removePic) {
            // If user wants to remove the picture
            req.body.imagePath = null;

            // Delete the old image if it exists
            if (user.imagePath) {
                fs.unlink(user.imagePath, (err) => {
                    if (err) {
                        console.error("Error deleting the image:", err);
                        return res.status(500).send('Error deleting the image');
                    }
                });
            }
        } else {
            // If no image change, retain the current imagePath
            req.body.imagePath = user.imagePath;
        }

        // Update the user with new data
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            {
                username: req.body.username,
                email: req.body.email,
                imagePath: req.body.imagePath, // Set updated image path
            },
            {
                new: true, // Return the updated document
                runValidators: true, // Run validators for the update
            }
        ).select('-password'); // Exclude the password from the result

        // If no user is updated, return a 404 error
        if (!updatedUser) {
            return res.status(404).send("User not found");
        }

        // Return the updated user object
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(400).send(error);
    }
},


    // Delete User
    deleteUser: async (req, res) => {
        try {
            if(req.params.id != req.user._id){
             return res.status(404).send("not the same user id");
            }

            const deletedUser = await User.findByIdAndDelete(req.params.id);
            if(deletedUser.imagePath){
                fs.unlink(deletedUser.imagePath,(err)=>{
                    console.error('error deleting the image',err);
                    return res.status(500).send('Error deleting the image');
                })
            }
            if (!deletedUser) {
                return res.status(404).send(); // 404 Not Found if user not found
            }
            res.status(200).json(deletedUser);
        } catch (err) {
            console.log(err);
            res.status(500).send('Server error');
        }
    },
    addFriend: async (req, res) => {
        try {
            const { username } = req.body;
            if (!username) {
                return res.status(400).send('Username required');
            }
            const user = await User.findOne({ username });
            if (!user) {
                return res.status(404).send('User not found');
            }
            // Check if a friend request already exists
            const existingRequest = await Friend.findOne({
                userId: req.user._id,
                friendId: user._id,
                status: 'pending'
            });
            if (existingRequest) {
                return res.status(400).send('Friend request already sent');
            }
            const addNew = new Friend({
                userId: req.user._id,
                friendId: user._id
            });
            await addNew.save();
            res.status(201).json({ message: 'Friend request sent successfully' });
        } catch (err) {
            console.log(err);
            res.status(500).send('Server error');
        }
    },
    

  acceptFriend:async(req,res)=>{
    try{
          const {requestId}= req.params;
         const friendRequest = await Friend.findOne({userId:requestId,friendId:req.user._id,status:'pending'});
         if(!friendRequest){
            return res.status(404).send('Friend request not found or already processed');
         }
         friendRequest.status = 'accepted';
       await friendRequest.save(); 
       res.status(201).json({ message: 'Friend request accepted', friendRequest });
    }
    catch(err){
        console.log(err);
            res.status(500).send('Server error');
    }
  },
  rejectFriend:async(req,res,next)=>{
    try{
          const {requestId}= req.params;
         const friendRequest = await Friend.findOne({userId:requestId,friendId:req.user._id
            ,status:'pending'
         });
         if(!friendRequest){
            return res.status(404).send('Friend request not found or already processed');
         }
         
       await Friend.deleteOne({userId:requestId,friendId:req.user._id,status:'pending'}); 
       res.json({ message: 'Friend request rejected'});
    }
    catch(err){
        console.log(err);
            res.status(500).send('Server error');
    }
  },

  
   getAllFriends:async(req,res)=>{try
    {
        
        const allFriends = await Friend.find({
            $or: [
                { userId: req.user._id, status: 'accepted' },
                { friendId: req.user._id, status: 'accepted' }
            ]
        }).populate('userId friendId', 'username email');;
    
   res.json(allFriends);
   }
  catch(err){
    console.log(err);
    res.status(500).send('Server error');
  }
},
deleteFriend:async(req,res)=>{
    try{ 
        const { friendName } = req.body;
        if (!friendName) {
            return res.status(400).send('Friend name is required');
        }
        const friend = await User.findOne({ username: friendName });
        if (!friend) {
            return res.status(404).send('Friend not found in User schema');
        }
          const result = await Friend.deleteOne({$or: [{userId:req.user._id,friendId:friend._id},
                                                      {userId:friend._id,friendId:req.user._id}
                                                      ] });
          if(result.deletedCount === 0){
            return res.status(404).send('Friend not found in addFriend schema');
          };
          res.status(200).send('friend deleted successfully');

    }
    catch(err){
        console.log(err);
            res.status(500).send('Server error');
    }
},


};

 function pagination(model) {
    return async (req, res, next) => {
      try {
        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit);
  
        const startIndex = (page - 1) * limit;
        const lastIndex = page * limit;
  
        const result = {};
  
        // If there are previous pages
        if (startIndex > 0) {
          result.previous = {
            page: page - 1,
            limit: limit,
          };
        }
  
        // If there are more records after the current page
        if (lastIndex < await model.countDocuments().exec()) {
          result.next = {
            page: page + 1,
            limit: limit,
          };
        }
  
        // Get the paginated results
        result.results = await model.find().limit(limit).skip(startIndex).exec();
  
        // Attach the result to the response object
        res.paginatedResults = result;
  
        // Call next middleware or route handler
        next();
      } catch (err) {
        console.log(err);
            res.status(500).send('Server error');
      }
    };
  };
  

 

module.exports = {userControll , pagination};
