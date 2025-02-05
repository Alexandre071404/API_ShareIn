let localStream;
let peers = {};
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    const joinBtn = document.getElementById('joinBtn');
    const leaveBtn = document.getElementById('leaveBtn');
    joinBtn.addEventListener('click', initializeCall);
    leaveBtn.addEventListener('click', leaveCall);
});

async function initializeCall() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
        });
        
        document.getElementById('localVideo').srcObject = localStream;
        document.getElementById('joinBtn').style.display = 'none';
        document.getElementById('leaveBtn').style.display = 'initial';
        document.getElementById('Vous').style.display = 'block';

        
        socket.emit('/api/join-call');
        
    } catch (err) {
        console.error('Erreur d\'accès aux périphériques:', err);
        alert('Erreur d\'accès à la caméra ou au micro');
    }
}

function createVideoElement(userId, userName) {
    // On vérifie si l'élément existe déjà
    const existingContainer = document.getElementById(`container-${userId}`);
    if (existingContainer) {
        return existingContainer.querySelector('video');
    }

    const remoteVideo = document.createElement('video');
    remoteVideo.id = `remote-${userId}`;
    remoteVideo.autoplay = true;
    remoteVideo.playsinline = true;
    
    const videoContainer = document.createElement('div');
    videoContainer.className = 'remote-video-container';
    videoContainer.display = 'inline-block';

    videoContainer.id = `container-${userId}`;
    
    const nameLabel = document.createElement('div');
    nameLabel.className = 'name-label';
    nameLabel.textContent = userName;
    
    videoContainer.appendChild(remoteVideo);
    videoContainer.appendChild(nameLabel);
    document.getElementById('remoteVideos').appendChild(videoContainer);
    
    return remoteVideo;
}

socket.on('/api/user-connected', async ({ userId, userName }) => {
    console.log(`${userName} a rejoint l'appel`);
    
    // Vérifier si une connexion existe déjà pour cet utilisateur
    if (peers[userId]) {
        console.log('Connection existante trouvée, nettoyage...');
        peers[userId].close();
        delete peers[userId];
    }
    
    const peerConnection = new RTCPeerConnection(configuration);
    peers[userId] = peerConnection;
    
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });
    
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('/api/ice-candidate', {
                target: userId,
                candidate: event.candidate
            });
        }
    };
    
    peerConnection.ontrack = event => {
        const video = createVideoElement(userId, userName);
        video.srcObject = event.streams[0];
    };
    
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    socket.emit('/api/offer', {
        target: userId,
        offer: offer
    });
});

socket.on('/api/offer', async ({ source, sourceName, offer }) => {
    // Vérifier si une connexion existe déjà
    if (peers[source]) {
        console.log('Connection existante trouvée, nettoyage...');
        peers[source].close();
        delete peers[source];
    }

    const peerConnection = new RTCPeerConnection(configuration);
    peers[source] = peerConnection;
    
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });
    
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('/api/ice-candidate', {
                target: source,
                candidate: event.candidate
            });
        }
    };
    
    peerConnection.ontrack = event => {
        const video = createVideoElement(source, sourceName);
        video.srcObject = event.streams[0];
    };
    
    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    socket.emit('/api/answer', {
        target: source,
        answer: answer
    });
});

socket.on('/api/answer', async ({ source, answer }) => {
    if (peers[source]) {
        await peers[source].setRemoteDescription(answer);
    }
});

socket.on('/api/ice-candidate', async ({ source, candidate }) => {
    if (peers[source]) {
        try {
            await peers[source].addIceCandidate(candidate);
        } catch (e) {
            console.error('Erreur d\'ajout de candidat ICE:', e);
        }
    }
});

socket.on('/api/user-disconnected', userId => {
    console.log(`Utilisateur déconnecté: ${userId}`);
    // Fermer la connexion peer
    if (peers[userId]) {
        peers[userId].close();
        delete peers[userId];
    }
    
    // Supprimer le conteneur vidéo
    const container = document.getElementById(`container-${userId}`);
    if (container) {
        const video = container.querySelector('video');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        container.remove();
    }
});

function leaveCall() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    
    // Fermer toutes les connexions peer
    for (let userId in peers) {
        peers[userId].close();
        delete peers[userId];
    }
    
    // Nettoyer tous les éléments vidéo distants
    const remoteVideos = document.getElementById('remoteVideos');
    while (remoteVideos.firstChild) {
        const video = remoteVideos.firstChild.querySelector('video');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        remoteVideos.firstChild.remove();
    }
    
    document.getElementById('localVideo').srcObject = null;
    document.getElementById('joinBtn').style.display = 'initial';
    document.getElementById('leaveBtn').style.display = 'none';
    document.getElementById('Vous').style.display = 'none';

    
    socket.emit('/api/leave-call');
}