// Modifications à apporter à votre server.js existant

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});



app.use(cors());
app.use(express.json());
app.use(express.static("public"));

let users = {};
let rooms = {}; 

let messageHistory = {}; // Stockage des messages par paire d'utilisateurs
let usersByName = {}; // Nouveau stockage par nom d'utilisateur


function getConversationId(name1, name2) {
  return [name1, name2].sort().join('-');
}


app.get("/api/users", (req, res) => {
  res.json(Object.values(users));
});

io.on("connection", (socket) => {
  console.log(`🔵 Connexion : ${socket.id}`);

  socket.on("/api/user_joined", (data) => {
    // Stocker dans les deux structures
    users[socket.id] = { 
      id: socket.id, 
      name: data.name, 
      latitude: null, 
      longitude: null,
      inCall: false
    };
    
    // Stocker ou mettre à jour la référence par nom
    usersByName[data.name] = socket.id;
    
    console.log(`👤 ${data.name} a rejoint la session`);
    io.emit("/api/users_list", users);
    io.emit("/api/positions_update", users);
  });

  // Gestion WebRTC
  socket.on("/api/join-call", () => {
    users[socket.id].inCall = true;
    io.emit("/api/users_list", users); // Mettre à jour la liste des utilisateurs
    socket.broadcast.emit("/api/user-connected", {
      userId: socket.id,
      userName: users[socket.id].name
    });
  });

  socket.on("/api/leave-call", () => {
    users[socket.id].inCall = false;
    io.emit("/api/users_list", users);
    socket.broadcast.emit("/api/user-disconnected", socket.id);
  });

  socket.on("/api/offer", ({ target, offer }) => {
    io.to(target).emit("/api/offer", {
      source: socket.id,
      sourceName: users[socket.id].name,
      offer: offer
    });
  });

  socket.on("/api/answer", ({ target, answer }) => {
    io.to(target).emit("/api/answer", {
      source: socket.id,
      answer: answer
    });
  });

  socket.on("/api/ice-candidate", ({ target, candidate }) => {
    io.to(target).emit("/api/ice-candidate", {
      source: socket.id,
      candidate: candidate
    });
  });

  // Vos gestionnaires existants
  socket.on("/api/update_position", (data) => {
    if (users[socket.id]) {
      users[socket.id].latitude = data.latitude;
      users[socket.id].longitude = data.longitude;
      io.emit("/api/positions_update", users);
    }
  });


  socket.on("/api/update_accelerometer", (data) => {
    if (users[socket.id]) {
      users[socket.id].acceleration = { x: data.x, y: data.y, z: data.z };
      io.emit("/api/accelerometer_update", { id: socket.id, x: data.x, y: data.y, z: data.z });
    }
  });

  socket.on("/api/private_message", ({ to, from, message, toName }) => {
    // Récupérer l'ID socket actuel du destinataire par son nom
    const currentToId = usersByName[toName];
    
    if (users[from] && currentToId) {
        const conversationId = getConversationId(users[from].name, toName);
        
        if (!messageHistory[conversationId]) {
            messageHistory[conversationId] = [];
        }
        
        const messageData = {
            from: from,
            fromName: users[from].name,
            message: message,
            timestamp: Date.now()
        };
        messageHistory[conversationId].push(messageData);
        io.to(currentToId).emit("/api/private_message", {
            from: users[from].name,
            message: message,
            timestamp: messageData.timestamp
        });
        
        io.to(from).emit("/api/message_sent", {
            to: toName,
            message: message,
            timestamp: messageData.timestamp
        });
    }
  });

// Nouvel événement pour récupérer l'historique
socket.on("/api/get_message_history", ({ otherUserName }) => {
  const conversationId = getConversationId(users[socket.id].name, otherUserName);
  const messages = messageHistory[conversationId] || [];
  socket.emit("/api/message_history", messages);
});



  socket.on("disconnect", () => {
    if (users[socket.id]) {
      const userName = users[socket.id].name;
      delete usersByName[userName];
      delete users[socket.id];
      io.emit("/api/users_list", users);
      io.emit("/api/positions_update", users);
      io.emit("/api/user-disconnected", socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
});