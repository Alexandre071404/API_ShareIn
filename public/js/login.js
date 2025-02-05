function saveUsername() {
    const input = document.getElementById("username-input").value.trim();
    if (input === "") {
        alert("Veuillez entrer un nom !");
        return;
    }
    localStorage.setItem("username", input); // Sauvegarde le nom
    window.location.href = "map.html"; // Redirige vers la carte
}
