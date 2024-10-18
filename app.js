const mongoose = require('mongoose');
const express = require('express'); 
const bodyParser = require('body-parser');
const path = require('path');
const userRoutes=require('./routes/userRoutes');
const {Server} = require('socket.io');
const app = express();
const dotenv = require('dotenv');
dotenv.config();

const PORT = process.env.PORT || 3000 ;

app.use(express.json());
app.use('/uploads',express.static(path.join(__dirname, '../uploads')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/user', userRoutes);

const expressServer = app.listen(PORT,()=>{
  console.log(`listening on port ${PORT}`)
});



const io = new Server(expressServer,{
  origin:["http://localhost:5500"]
})

//mongo db connection 
const dbConnect = async()=>{
try{
  await mongoose.connect(process.env.DB_CONNECTION);
  console.log('data base connected');

}catch(err){
  console.log(err);
  process.exit(1);
}

};
dbConnect();

io.on('connection', socket=>{
 console.log(`User ${socket.id} connected`);
 //upon connection - only to the connected user 
 socket.emit('message','welcome to the chat app');

 //goes to everyone except the one who sent it
 socket.broadcast.emit('message',`User ${socket.id.substring(0,5)} connected`)

 socket.on('message', (data) => {
  console.log(data);
  //this is going to every one on the server
  io.emit('message', `${socket.id.substring(0, 5)}: ${data}`);
  //private chat
  socket.on('private-message', ({ message, recipientId }) => {
    // Send the message only to the specified recipient
    io.to(recipientId).emit('message', `${socket.id.substring(0, 5)}: ${message}`);
  });
//listening to the disconnection 
socket.on('disconnect',()=>{

  socket.broadcast.emit('message',`User ${socket.id.substring(0,5)} disconnected`);
});
socket.on('activity',(name)=>{
  socket.broadcast.emit('activity', name);
})
})})
