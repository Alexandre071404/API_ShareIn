let currentChatPartner = null;

// Gestion du chat
function openChat(user) {
    currentChatPartner = user;
    const chatContainer = document.getElementById('chat-container');
    const chatRecipient = document.getElementById('chat-recipient');
    const chatMessages = document.getElementById('chat-messages');
    
    chatRecipient.textContent = `Chat avec ${user.name}`;
    chatMessages.innerHTML = '';
    chatContainer.style.display = 'flex';
    
    // Modifier pour utiliser le nom au lieu de l'ID
    socket.emit("/api/get_message_history", { otherUserName: user.name });
}



// Gestionnaire pour fermer le chat
document.getElementById('close-chat').addEventListener('click', () => {
    document.getElementById('chat-container').style.display = 'none';
    currentChatPartner = null;
});

// Gestionnaire d'envoi de message
document.getElementById('send-message').addEventListener('click', sendMessage);
document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

socket.on("/api/message_history", (messages) => {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = ''; // Effacer les messages existants
    
    messages.forEach(msg => {
        const isSent = msg.from === socket.id;
        addMessageToChat(msg.message, isSent, new Date(msg.timestamp));
    });
    
    // Scroll vers le bas
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (message && currentChatPartner) {
        socket.emit('/api/private_message', {
            to: currentChatPartner.id,
            toName: currentChatPartner.name, // Ajouter le nom du destinataire
            from: socket.id,
            message: message
        });
        
        addMessageToChat(message, true);
        input.value = '';
    }
}

// Réception des messages privés
socket.on('/api/private_message', ({ from, message }) => {
    // Si le chat est ouvert avec l'expéditeur, afficher le message
    if (currentChatPartner && from === currentChatPartner.name) {
        addMessageToChat(message, false);
    } else {
        // Sinon, afficher une notification
        showNotification(`Nouveau message de ${from}`);
    }
});

function addMessageToChat(message, isSent, timestamp = new Date()) {
    const chatMessages = document.getElementById('chat-messages');
    const messageContainer = document.createElement('div');
    messageContainer.className = `message-container ${isSent ? 'sent' : 'received'}`;

    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.textContent = message;

    const timeElement = document.createElement('div');
    timeElement.className = 'message-time';
    timeElement.textContent = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    messageContainer.appendChild(messageElement);
    messageContainer.appendChild(timeElement);
    chatMessages.appendChild(messageContainer);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showNotification(message) {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification('Nouveau message', { body: message });
            }
        });
    }
}

// Ajouter dans votre app.js client
socket.on('/api/user_disconnected_chat', ({ userId, userName }) => {
    // Si on avait un chat ouvert avec cet utilisateur
    if (currentChatPartner && currentChatPartner.id === userId) {
        // Afficher un message dans le chat
        addMessageToChat(`${userName} s'est déconnecté(e)`, 'system');
        // Optionnellement, désactiver la zone de saisie
        document.getElementById('chat-input').disabled = true;
        document.getElementById('send-message').disabled = true;
    }
});

// Modifier la fonction addMessageToChat pour gérer les messages système
function addMessageToChat(message, isSent, timestamp = new Date()) {
    const chatMessages = document.getElementById('chat-messages');
    const messageContainer = document.createElement('div');
    messageContainer.className = `message-container ${isSent ? 'sent' : 'received'}`;

    // Ajouter le nom de l'utilisateur
    const userLabel = document.createElement('div');
    userLabel.className = 'user-label';
    userLabel.textContent = isSent ? 'Vous' : currentChatPartner.name;
    const timeElement = document.createElement('div');
    timeElement.className = 'message-time';
    timeElement.textContent = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.textContent = message;


    messageContainer.appendChild(userLabel);
    messageContainer.appendChild(messageElement);
    messageContainer.appendChild(timeElement);
    chatMessages.appendChild(messageContainer);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}