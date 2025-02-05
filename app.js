let map;

const username = localStorage.getItem("username") || "Utilisateur inconnu";

const usersList = document.getElementById("users-list");





document.getElementById("welcome-message").textContent = `Bonjour, ${username} !`;

const socket = io("https://alexandre.transon.caen.mds-project.fr", {
  transports: ["websocket", "polling"],
});
const userId = Math.random().toString(36).substring(2, 9);

socket.emit("/api/user_joined", { id: userId, name: username });

function showLoading() {
    document.getElementById('loading').style.display = 'block'; 
}

// Quand on reçoit la liste des utilisateurs
socket.on("/api/users_list", (users) => {
    usersList.innerHTML = ""; // Efface la liste avant de la remplir

    Object.values(users).forEach(user => {
        const li = document.createElement("li");
        li.textContent = user.name || `Utilisateur ${user.id}`;
        usersList.appendChild(li);
    });
});


function hideLoading() {
    document.getElementById('loading').style.display = 'none'; 

}


// Réception des positions mises à jour depuis le serveur
socket.on("/api/positions_update", (users) => {
    const displayedMarkers = new Set();

    Object.keys(users).forEach((id) => {
        const { latitude, longitude, name } = users[id];
        if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
            console.warn(`⚠️ Coordonnées invalides pour ${name || `Utilisateur ${id}`}:`, latitude, longitude);
            return;
        }
        if (id === userId) return;
        if (!displayedMarkers.has(id)) {
            const marker = L.marker([latitude, longitude]).addTo(this.map);
            if (name===username){
                marker.bindPopup(`<b>Vous</b><br><b>Position:</b><br>Latitude: ${latitude}<br>Longitude: ${longitude}`).openPopup();
            }
            else{
                marker.bindPopup(`<b>${name}</b><br><b>Position:</b><br>Latitude: ${latitude}<br>Longitude: ${longitude}`).openPopup();
            }
            displayedMarkers.add(id); 
        }
    });
    
});


function saveUsername() {
    const input = document.getElementById("username-input").value.trim();
    if (input === "") {
        alert("Veuillez entrer un nom !");
        return;
    }

    username = input;
    localStorage.setItem("username", username); 

    document.getElementById("username-container").style.display = "none";
    document.getElementById("app-container").style.display = "block"; 

    socket.emit("/api/user_joined", { id: userId, name: username });

    getUserPosition(); 
}


// Fonction pour obtenir la position de l'utilisateur
function getUserPosition() {
    
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                console.log(lat);
                console.log(lng);
                initMap(lat,lng);
                updateUserPosition(lat, lng);
                updateMap(lat, lng);
                hideLoading();

            },
            (error) => {
                console.error("❌ Erreur de géolocalisation :", error);
                if (error.code === 1) {
                    alert("⚠️ Vous avez refusé l'accès à la géolocalisation. Activez-la dans les paramètres de votre navigateur.");
                } else if (error.code === 2) {
                    alert("❌ Impossible d'obtenir votre position. Vérifiez votre connexion GPS.");
                } else if (error.code === 3) {
                    setTimeout(getUserPosition, 1);
                }
            },
            {
                timeout: 20000,
                maximumAge: 5000 
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        alert("Géolocalisation non supportée par votre navigateur.");
    }
}


// Mise à jour de la position sur la carte
function updateMap(lat, lng) {

    if (!map) {
        console.error("La carte n'est pas encore initialisée !");
        return;
    }
    showLoading();


    // Si le marqueur de l'utilisateur existe déjà, on le supprime avant de le recréer
    if (window.userMarker) {
        window.userMarker.remove(); // Supprimer le marqueur existant
    }

    // Créer un nouveau marqueur pour l'utilisateur
    window.userMarker = L.marker([lat, lng], {
        icon: L.icon({
            iconUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Blue_dot.svg/200px-Blue_dot.svg.png", // Icône bleue
            iconSize: [32, 32], // Taille de l'icône
            iconAnchor: [16, 32] // Pour que le point soit centré sous le marqueur
        })
    }).addTo(map);

    map.setView([lat, lng], map.getZoom());
    hideLoading();

}


// Envoi de la position au serveur
function updateUserPosition(lat, lng) {
    socket.emit("/api/update_position", { id: userId, name: username, latitude: lat, longitude: lng });
}

// WebRTC - Gestion de la vidéo
let localStream;
let peerConnection;

function startVideoChat() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        localStream = stream;
        document.getElementById("local-video").srcObject = stream;
    })
    .catch((err) => console.log("Erreur WebRTC: ", err));
}

// Gestion des connexions WebRTC
socket.on("/api/user_connected", () => {
    startVideoChat();
    // Ici, tu pourrais implémenter la logique WebRTC pour gérer les connexions et l'échange de flux vidéo
});

// Accéléromètre - Utilisation de l'API DeviceMotion
window.addEventListener("devicemotion", (event) => {
    const x = event.acceleration.x;
    const y = event.acceleration.y;
    const z = event.acceleration.z;

    // Mettre à jour l'interface avec les données de l'accéléromètre
    document.getElementById("accel-x").textContent = `X: ${x}`;
    document.getElementById("accel-y").textContent = `Y: ${y}`;
    document.getElementById("accel-z").textContent = `Z: ${z}`;

    // Envoyer les données au serveur
    socket.emit("/api/update_accelerometer", { id: userId, x, y, z });
});

function initMap(latu,lngu) {
    try {
      // Initialiser la carte Leaflet
      this.map = L.map('map').setView([latu, lngu], 13);
      // Ajouter une couche de tuiles (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(this.map);
      const marker = L.marker([latu, lngu]).addTo(this.map);
      marker.bindPopup(`<b>Vous</b><br><b>Position:</b><br>Latitude: ${latu}<br>Longitude: ${lngu}`).openPopup();
      
    } catch (error) {
      console.error('Erreur Leaflet:', error);
      throw error;
    }
  }
window.onload = () => {
    showLoading();
    getUserPosition();
};


const chatContainer = document.getElementById("chat-container");
const chatTitle = document.getElementById("chat-title");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");

let activeChatUser = null; // Stocke l'utilisateur avec qui on parle

// 📌 Ouvrir le chat quand on clique sur un utilisateur
document.getElementById("users-list").addEventListener("click", (event) => {
    if (event.target.tagName === "LI") {
        activeChatUser = event.target.dataset.userId;
        chatTitle.textContent = `Chat avec ${event.target.textContent}`;
        chatMessages.innerHTML = ""; // Efface l'ancien chat
        chatContainer.style.display = "block";
    }
});

// 📌 Envoi d'un message
chatSend.addEventListener("click", () => {
    const message = chatInput.value.trim();
    if (message && activeChatUser) {
        socket.emit("private_message", { to: activeChatUser, from: userId, message });
        displayMessage(`Moi: ${message}`, true);
        chatInput.value = "";
    }
});

// 📌 Réception d'un message privé
socket.on("private_message", ({ from, message }) => {
    if (from === activeChatUser) {
        displayMessage(`${from}: ${message}`, false);
    }
});

// 📌 Affiche un message dans le chat
function displayMessage(text, isMine) {
    const div = document.createElement("div");
    div.textContent = text;
    div.style.textAlign = isMine ? "right" : "left";
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll en bas
}
