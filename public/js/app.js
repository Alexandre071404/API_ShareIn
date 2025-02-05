let map;

const username = localStorage.getItem("username") || "Utilisateur inconnu";

const usersList = document.getElementById("users-list");

document.getElementById("welcome-message").textContent = `Bonjour, ${username} !`;

const socket = io();
const userId = Math.random().toString(36).substring(2, 9);

socket.emit("/api/user_joined", { id: userId, name: username });

function showLoading() {
    document.getElementById('loading').style.display = 'block'; 
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none'; 
}

// Quand on reçoit la liste des utilisateurs
socket.on("/api/users_list", (users) => {
    usersList.innerHTML = ""; // Efface la liste avant de la remplir

    Object.values(users).forEach(user => {
        const li = document.createElement("li");
        // Vérifie si c'est l'utilisateur actuel
        if (user.id === socket.id) {
            li.textContent = "Vous";
            li.style.fontStyle = "italic"; // Pour le distinguer visuellement
        } else {
            li.textContent = user.name || `Utilisateur ${user.id}`;
            li.addEventListener('click', () => openChat(user));
        }
        usersList.appendChild(li);
    });
});