let divmap = document.getElementById("map");
let breadcrumbElement = document.getElementById("breadcrumb");

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

// Définition des groupes de calques
let regionsLayerGroup = L.layerGroup().addTo(map);
let departementsLayerGroup = L.layerGroup().addTo(map);
let communesLayerGroup = L.layerGroup().addTo(map);

var currentLayer = { name: "Régions", data: null, parent: null };
var breadcrumb = [];
let depth = 0;

// Fonction de mise à jour du fil d’Ariane
function updateBreadcrumb(newLayerName) {
    if (breadcrumb.length === 3) {
        breadcrumb.shift(); // Retirer le premier élément si on atteint la limite de 3
    }

    breadcrumb.push(newLayerName);
    console.log("Fil d'Ariane mis à jour :", breadcrumb);

    let breadcrumbString = breadcrumb.map((name, index) => {
        return `<a href="#" onclick="breadcrumbClick(${index})">${name}</a>`;
    }).join(" > ");

    breadcrumbElement.innerHTML = breadcrumbString;
    depth = breadcrumb.length;

    clearLayers(depth);
}

// Fonction de gestion des clics sur le fil d’Ariane
function breadcrumbClick(index) {
    depth = index + 1;

    // Nettoyage des couches en fonction du niveau cliqué
    if (depth === 1) {
        // Clic sur une région
        let regionName = breadcrumb[0];
        breadcrumb = [regionName];
        console.log(`Retour à la région : ${regionName}`);
        clearLayers(1); // Supprimer les couches des départements et communes
        zoomToRegion(regionName); // Recentrer sur la région
    } else if (depth === 2) {
        // Clic sur un département
        let regionName = breadcrumb[0];
        let departementName = breadcrumb[1];
        breadcrumb = [regionName, departementName];
        console.log(`Retour au département : ${departementName}`);
        clearLayers(2); // Supprimer les couches des communes
        zoomToDepartement(departementName);
    } else if (depth === 3) {
        // Clic sur une commune (pour future implémentation si nécessaire)
        console.log("Niveau commune cliqué : aucune action requise.");
    }

    // Mise à jour de l’affichage du fil d’Ariane
    let breadcrumbString = breadcrumb.map((name, idx) => {
        return `<a href="#" onclick="breadcrumbClick(${idx})">${name}</a>`;
    }).join(" > ");
    breadcrumbElement.innerHTML = breadcrumbString;
}

function zoomToRegion(regionName) {
    fetch("regions.geojson")
        .then(response => response.json())
        .then(data => {
            let regionFeature = data.features.find(feature => feature.properties.nom.trim() === regionName);
            if (regionFeature) {
                let regionLayer = L.geoJSON(regionFeature);
                map.fitBounds(regionLayer.getBounds());

                fetch("departements.geojson")
                    .then(response => response.json())
                    .then(departementsData => {
                        let filteredDepartements = departementsData.features.filter(departement =>
                            regionLayer.getBounds().contains(L.geoJSON(departement).getBounds())
                        );

                        let filteredGeoJson = {
                            type: "FeatureCollection",
                            features: filteredDepartements
                        };

                        departementsLayerGroup.clearLayers(); // Nettoyer les couches précédentes
                        L.geoJSON(filteredGeoJson, {
                            style: {
                                color: '#3388ff',
                                weight: 1,
                                opacity: 0.8
                            },
                            onEachFeature: function (feature, layer) {
                                layer.on('click', function () {
                                    const cleanName = feature.properties.nom.trim();
                                    updateBreadcrumb(cleanName);
                                    moveToCommunes(layer);
                                });
                            }
                        }).addTo(departementsLayerGroup);
                    })
                    .catch(error => console.error("Erreur lors du chargement des départements :", error));
            }
        })
        .catch(error => console.error("Erreur lors du chargement des régions :", error));
}


// Fonction pour zoomer sur un département à partir de son nom
function zoomToDepartement(departementName) {
    fetch("departements.geojson")
        .then(response => response.json())
        .then(data => {
            let departementFeature = data.features.find(feature => feature.properties.nom.trim() === departementName);
            if (departementFeature) {
                // Créer la couche Leaflet à partir du feature pour zoomer
                let departementLayer = L.geoJSON(departementFeature);
                map.fitBounds(departementLayer.getBounds()); // Zoomer sur les limites du département

                // Charger les communes du département
                fetch(`https://geo.api.gouv.fr/departements/${departementFeature.properties.code}/communes?fields=nom,code,contour`)
                    .then(response => response.json())
                    .then(communes => {
                        let communesFeatures = communes.map(commune => {
                            if (!commune.contour) {
                                console.warn(`Aucun contour trouvé pour ${commune.nom} (${commune.code})`);
                                return null;
                            }
                            return {
                                type: "Feature",
                                properties: {
                                    code: commune.code,
                                    nom: commune.nom
                                },
                                geometry: commune.contour
                            };
                        }).filter(feature => feature !== null);

                        // Créer un GeoJSON avec les communes filtrées
                        let communesGeoJson = {
                            type: "FeatureCollection",
                            features: communesFeatures
                        };

                        // Nettoyer les anciennes couches de communes
                        communesLayerGroup.clearLayers();

                        // Ajouter les communes comme une nouvelle couche
                        L.geoJSON(communesGeoJson, {
                            style: {
                                color: '#2ca02c',
                                weight: 1,
                                opacity: 0.8
                            },
                            onEachFeature: function (feature, layer) {
                                layer.on('click', function () {
                                    const cleanName = feature.properties.nom.trim();
                                    updateBreadcrumb(cleanName);
                                    map.fitBounds(layer.getBounds()); // Zoomer sur la commune
                                });
                            }
                        }).addTo(communesLayerGroup);
                    })
                    .catch(error => console.error("Erreur lors de la requête API des communes :", error));
            }
        })
        .catch(error => console.error("Erreur lors du chargement des départements :", error));
}



// Fonction pour nettoyer les calques en fonction de la profondeur
function clearLayers(upToDepth) {
    if (upToDepth < 1) {
        regionsLayerGroup.clearLayers();
    }
    if (upToDepth < 2) {
        departementsLayerGroup.clearLayers();
    }
    if (upToDepth < 3) {
        communesLayerGroup.clearLayers();
    }
}



// Fonction pour générer et ajouter des calques GeoJSON à un groupe spécifique
function generateLayerByGeoJson(file, layerGroup) {
    fetch(file)
        .then(response => response.json())
        .then(data => {
            let geoJsonLayer = L.geoJSON(data, {
                style: {
                    color: '#ff7800',
                    weight: 0.5,
                    opacity: 0.65
                },
                onEachFeature: function (feature, layer) {
                    layer.on('mouseover', function () {
                        layer.setStyle({ weight: 3 });
                    });
                    layer.on('mouseout', function () {
                        layer.setStyle({ weight: 0.5 });
                    });

                    layer.on('click', function () {
                        switch (file){
                            case "regions.geojson":
                                const cleanName = feature.properties.nom.trim();
                                updateBreadcrumb(cleanName);
                                moveToDepartements(layer);
                                console.log("Région sélectionnée");
                                break;
                            case "departements.geojson":
                                const depName = feature.properties.nom.trim();
                                updateBreadcrumb(depName);
                                moveToCommunes(layer);
                                console.log("Département sélectionné");
                                break;
                            case "communes.geojson":
                                // Action pour les communes si nécessaire
                                break;
                        }
                    });
                }
            });

            geoJsonLayer.addTo(layerGroup);
        })
        .catch(error => console.error("Erreur lors du chargement du GeoJSON :", error));
}

// Fonction de nettoyage dynamique des couches en fonction de la hiérarchie
function dynamicClearLayers(level) {
    switch (level) {
        case "region":
            // On conserve les régions, mais on nettoie les départements et les communes
            departementsLayerGroup.clearLayers();
            communesLayerGroup.clearLayers();
            break;
        case "departement":
            // On conserve les départements, mais on nettoie les communes
            communesLayerGroup.clearLayers();
            break;
        case "commune":
            // Rien à nettoyer en dessous
            break;
        default:
            // Nettoyage complet (si besoin)
            regionsLayerGroup.clearLayers();
            departementsLayerGroup.clearLayers();
            communesLayerGroup.clearLayers();
            break;
    }
}

// Modification des fonctions pour intégrer la dynamique

// Naviguer vers les départements d'une région
function moveToDepartements(regionLayer) {
    dynamicClearLayers("region");
    let regionCode = regionLayer.feature.properties.code;
    map.fitBounds(regionLayer.getBounds());

    fetch(`https://geo.api.gouv.fr/regions/${regionCode}/departements`)
        .then(response => response.json())
        .then(departements => {
            fetch("departements.geojson")
                .then(response => response.json())
                .then(geojsonData => {
                    let filteredDepartements = geojsonData.features.filter(feature =>
                        departements.some(dep => dep.code === feature.properties.code)
                    );

                    let filteredGeoJson = {
                        type: "FeatureCollection",
                        features: filteredDepartements
                    };

                    let departementLayer = L.geoJSON(filteredGeoJson, {
                        style: {
                            color: '#3388ff',
                            weight: 1,
                            opacity: 0.8
                        },
                        onEachFeature: function (feature, layer) {
                            layer.on('mouseover', function () {
                                layer.setStyle({ weight: 3 });
                            });

                            layer.on('mouseout', function () {
                                layer.setStyle({ weight: 1 });
                            });

                            layer.on('click', function () {
                                const cleanName = feature.properties.nom.trim();
                                updateBreadcrumb(cleanName);
                                moveToCommunes(layer);
                            });
                        }
                    });

                    departementLayer.addTo(departementsLayerGroup);
                })
                .catch(error => console.error("Erreur lors du chargement du GeoJSON des départements :", error));
        })
        .catch(error => console.error("Erreur lors de la requête API des départements :", error));
}

function moveToCommunes(departementLayer) {
    dynamicClearLayers("departement"); // Nettoyer les couches inférieures
    if (!departementLayer || !departementLayer.feature) {
        console.error("Le département sélectionné n'a pas de couche valide.");
        return;
    }

    let departementCode = departementLayer.feature.properties.code;
    map.fitBounds(departementLayer.getBounds());

    fetch(`https://geo.api.gouv.fr/departements/${departementCode}/communes?fields=nom,code,contour`)
        .then(response => response.json())
        .then(communes => {
            let features = communes.map(commune => {
                if (!commune.contour) {
                    console.warn(`Aucun contour trouvé pour ${commune.nom} (${commune.code})`);
                    return null;
                }
                return {
                    type: "Feature",
                    properties: {
                        code: commune.code, // Code postal
                        nom: commune.nom
                    },
                    geometry: commune.contour
                };
            }).filter(feature => feature !== null);

            let communesGeoJson = {
                type: "FeatureCollection",
                features: features
            };

            let communesLayer = L.geoJSON(communesGeoJson, {
                style: {
                    color: '#2ca02c',
                    weight: 1,
                    opacity: 0.8
                },
                onEachFeature: function (feature, layer) {
                    layer.on('mouseover', function () {
                        layer.setStyle({ weight: 3 });
                    });

                    layer.on('mouseout', function () {
                        layer.setStyle({ weight: 1 });
                    });

                    layer.on('click', function () {
                        const cleanName = feature.properties.nom.trim();
                        const codePostal = feature.properties.code; // Récupérer le code postal
                        console.log(`Commune : ${cleanName}, Code Postal : ${codePostal}`); // Afficher dans la console
                        updateBreadcrumb(cleanName);
                        map.fitBounds(layer.getBounds());
                    });
                }
            });

            communesLayer.addTo(communesLayerGroup);
        })
        .catch(error => console.error("Erreur lors de la requête API des communes :", error));
}



// Charger initialement les régions
generateLayerByGeoJson("regions.geojson", regionsLayerGroup);