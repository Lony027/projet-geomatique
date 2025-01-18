// Configuration des DROM avec leurs centres géographiques et niveaux de zoom
const dromRegions = {
    mayotte: { code: "976", center: [-12.8333, 45.1667], zoom: 10 },
    reunion: { code: "974", center: [-21.1151, 55.5364], zoom: 10 },
    guadeloupe: { code: "971", center: [16.265, -61.550999], zoom: 10 },
    martinique: { code: "972", center: [14.641528, -61.024174], zoom: 10 },
    guyane: { code: "973", center: [4.933333, -52.333333], zoom: 7 }
};

// Initialisation d'une carte DROM dans un conteneur spécifique
function initializeDromMap(containerClass, regionInfo) {
    const container = document.querySelector(`.${containerClass}`);

    if (!container) {
        console.error(`Conteneur HTML non trouvé pour ${containerClass}`);
        return;
    }

    const layer = L.tileLayer('https://tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token={accessToken}', {
        attribution: '<a href="https://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        minZoom: 0,
        maxZoom: 22,
        accessToken: 'H2h0Jx9SUlnTFKSvAuhqfplwTUpFMPQL7J35nEptiCKhwy776J7TTk8m5QR6IKyZ'
    });

    const map = L.map(container, {
        center: regionInfo.center,
        zoom: regionInfo.zoom,
        layers: [layer],
        zoomControl: false,
        attributionControl: false
    });

    fetch('ressources/geojson/departements.geojson')
        .then(response => response.json())
        .then(geoJsonData => {
            const regionFeatures = geoJsonData.features.filter(feature => feature.properties.code === regionInfo.code);

            L.geoJSON({ type: "FeatureCollection", features: regionFeatures }, {
                style: {
                    color: "#0074D9",
                    weight: 1,
                    fillOpacity: 0.5
                }
            }).addTo(map);
        })
        .catch(error => console.error(`Erreur lors du chargement des données pour ${regionInfo.code}:`, error));
}

// Initialisation de toutes les cartes DROM
function initializeDromMaps() {
    Object.entries(dromRegions).forEach(([containerClass, regionInfo]) => {
        initializeDromMap(containerClass, regionInfo);
    });
}

// Appeler l'initialisation une fois le DOM chargé
document.addEventListener("DOMContentLoaded", initializeDromMaps);
