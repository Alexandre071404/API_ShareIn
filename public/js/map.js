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
        window.userMarker.remove(); // On supprime le marqueur existant
    }

    // On crée un nouveau marqueur pour l'utilisateur
    window.userMarker = L.marker([lat, lng], {
        icon: L.icon({
            iconUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Blue_dot.svg/200px-Blue_dot.svg.png", 
            iconSize: [32, 32], 
            iconAnchor: [16, 32]
        })
    }).addTo(map);

    map.setView([lat, lng], map.getZoom());
    hideLoading();
}


// Envoi de la position au serveur
function updateUserPosition(lat, lng) {
    socket.emit("/api/update_position", { id: userId, name: username, latitude: lat, longitude: lng });
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





// Accéléromètre - Utilisation de l'API DeviceMotion NON FONCTIONNEL
window.addEventListener("devicemotion", (event) => {
    const x = event.acceleration.x;
    const y = event.acceleration.y;
    const z = event.acceleration.z;

    document.getElementById("accel-x").textContent = `X: ${x}`;
    document.getElementById("accel-y").textContent = `Y: ${y}`;
    document.getElementById("accel-z").textContent = `Z: ${z}`;

    socket.emit("/api/update_accelerometer", { id: userId, x, y, z });
});
