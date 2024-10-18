const mongoose = require('mongoose');

const addFriends = new mongoose.Schema({
userId :{
    type : mongoose.Schema.Types.ObjectId,
    ref:'User'
},
friendId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'User'
},

status:{
    type:String,
    enum:['accepted','rejected','pending'],
    default:'pending'
},
createdAt:{
    type : Date,
    default:Date.now
}

});

const friends = mongoose.model('addFriend', addFriends);

module.exports = friends;