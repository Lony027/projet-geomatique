let divmap = document.getElementById("map");

let layer = L.tileLayer('https://tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token={accessToken}', {
    attribution: '<a href="https://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    minZoom: 0,
    maxZoom: 22,
    accessToken: 'H2h0Jx9SUlnTFKSvAuhqfplwTUpFMPQL7J35nEptiCKhwy776J7TTk8m5QR6IKyZ'
});

let map = L.map(divmap, {
    center: [47.0811658, 2.399125],
    zoom: 6,
    layers: [layer]
});

// Pour stocker les couches des communes
let communesLayerGroup = L.layerGroup();

fetch('departements.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            style: {
                color: '#ff7800',
                weight: 0.5,
                opacity: 0.65
            },
            onEachFeature: function (feature, layer) {
                let nom_departement = feature.properties.nom;
                let code_departement = feature.properties.code;

                // Effets de survol
                layer.on('mouseover', function () {
                    layer.setStyle({
                        weight: 3
                    });
                });
                layer.on('mouseout', function () {
                    layer.setStyle({
                        weight: 0.5
                    });
                });

                // Au clic : Zoomer sur le département et afficher les communes avec leurs contours
                layer.on('click', function () {
                    // Zoomer sur les limites du département
                    map.fitBounds(layer.getBounds());

                    // Effacer les anciennes communes affichées
                    communesLayerGroup.clearLayers();

                    // Récupérer les communes avec leurs contours
                    fetch(`https://geo.api.gouv.fr/departements/${code_departement}/communes?fields=nom,code,contour`)
                        .then(response => response.json())
                        .then(communes => {
                            console.log(`Communes du département ${nom_departement} récupérées`);

                            // Ajouter chaque commune avec son contour
                            communes.forEach(commune => {
                                if (commune.contour) {
                                    let communeLayer = L.geoJSON(commune.contour, {
                                        style: {
                                            color: '#3388ff',
                                            weight: 1,
                                            opacity: 0.8
                                        },
                                        onEachFeature: function (feature, layer) {
                                            // Associer les données à chaque commune
                                            layer.bindPopup(`
                                                <strong>Commune : </strong>${commune.nom}<br>
                                                <strong>Code : </strong>${commune.code}
                                            `);

                                            // Effets de survol
                                            layer.on('mouseover', function () {
                                                layer.setStyle({
                                                    weight: 3
                                                });
                                            });
                                            layer.on('mouseout', function () {
                                                layer.setStyle({
                                                    weight: 0.5
                                                });
                                            });

                                            // Clic sur une commune : afficher ses informations dans la console
                                            layer.on('click', function () {
                                                console.log(`Commune cliquée : ${commune.nom} (Code : ${commune.code})`);
                                            });
                                        }
                                    });
                                    // Ajouter la commune au groupe de couches
                                    communesLayerGroup.addLayer(communeLayer);
                                }
                            });

                            // Ajouter toutes les communes à la carte
                            communesLayerGroup.addTo(map);
                        })
                        .catch(error => console.error(`Erreur lors de la récupération des communes :`, error));
                });
            }
        }).addTo(map);
    })
    .catch(error => console.error("Erreur lors du chargement du GeoJSON :", error));
