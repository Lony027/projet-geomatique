let divmap = document.getElementById('map');
let breadcrumbElement = document.getElementById('breadcrumb');

let layer = L.tileLayer(
  'https://tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token={accessToken}',
  {
    attribution:
      '<a href="https://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    minZoom: 0,
    maxZoom: 22,
    accessToken:
      'H2h0Jx9SUlnTFKSvAuhqfplwTUpFMPQL7J35nEptiCKhwy776J7TTk8m5QR6IKyZ',
  }
);

let map = L.map(divmap, {
  center: [47.0811658, 2.399125],
  zoom: 6,
  layers: [layer],
});

const partyColors = {
  RPR: '#1f77b4',
  FN: '#d62728',
  PS: '#2ca02c',
  UDF: '#ff7f0e',
  PCF: '#9467bd',
  ECO: '#8c564b',
  // "DIV": "#e377c2",
  // "DVD": "#7f7f7f",
  DVG: '#bcbd22',
  LO: '#17becf',
  UMP: '#0055a4',
  NPA: '#dd1c77',
  UDR: '#4682b4',
  UNR: '#4682b4',
  CIR: '#6a5acd',
  RI: '#f4a460',
};

// Full names for parties
const partyFullNames = {
  RPR: 'Les Républicains',
  FN: 'Front National',
  PS: 'Parti Socialiste',
  UDF: 'Union pour la Démocratie Française',
  PCF: 'Parti Communiste Français',
  ECO: 'Écologistes',
  DIV: 'Divers',
  // "DVD": "Divers Droite",
  // "DVG": "Divers Gauche",
  LO: 'Lutte Ouvrière',
  UMP: 'Union pour un Mouvement Populaire',
  NPA: 'Nouveau Parti Anticapitaliste',
  UDR: 'Union des Démocrates pour la République',
  UNR: 'Union pour la Nouvelle République',
  CIR: 'Candidats Indépendants Républicains',
  RI: 'Républicains Indépendants',
};

let regionsLayerGroup = L.layerGroup().addTo(map);
let departementsLayerGroup = L.layerGroup().addTo(map);
let communesLayerGroup = L.layerGroup().addTo(map);

var currentLayer = { name: 'Régions', data: null, parent: null };
var breadcrumb = [];
// let depth = 0;

function hover(layer) {
  layer.on('mouseover', function () {
    layer.setStyle({
      weight: 5,
      opacity: 1,
    });
  });

  layer.on('mouseout', function () {
    layer.setStyle({
      weight: 1,
      opacity: 0.8,
    });
  });
}


function replaceAndTruncateArray(array, index, newValue) {
  if (index < 0 || index >= array.length) {
    throw new Error('Index out of bounds');
  }
  return array.slice(0, index).concat(newValue);
}

/*
  mapDepth : 
    1 : Region
    2 : Departement
    3 : Circo
*/
function updateBreadcrumb(newLayerName, mapDepth) {
  if (
    mapDepth == null ||
    newLayerName == null ||
    mapDepth < 1 ||
    mapDepth > 3
  ) {
    throw new Error('Wrong parameters');
  }

  let bcLen = breadcrumb.length; // gérer si incoherence avec mapdepth ou si superieur a 3
  if (mapDepth > bcLen + 1) {
    return;
  }
  if (bcLen == mapDepth - 1) {
    breadcrumb.push(newLayerName);
  } else {
    breadcrumb = replaceAndTruncateArray(
      breadcrumb,
      mapDepth - 1,
      newLayerName
    );
  }
  updateBreadcrumbHTML();
  // clearLayers(breadcrumb.length);
}

function resetBreadcrumb() {
  breadcrumb = [];
  updateBreadcrumbHTML();
  return;
}

function updateBreadcrumbHTML() {
  let breadcrumbString = `<a href="#" onclick="breadcrumbClick(0)">France</a>`;
  if (breadcrumb.length > 0) {
    breadcrumbString += ' > '
    breadcrumbString += breadcrumb
      .map((name, index) => {
        return `<a href="#" onclick="breadcrumbClick(${index+1})">${name}</a>`;
      })
      .join(' > ');
  }
  breadcrumbElement.innerHTML = breadcrumbString;
}

function breadcrumbClick(depth) {
  if (depth == null || depth < 1 || depth > 3) {
    throw new Error('breadcrumbClick: Depth is null or out of bound')
  }

  breadcrumb = breadcrumb.slice(0, depth);
  clearLayers(depth);
  switch (depth) {
    case 0:
      // @to-do: reset to orignial France view
    case 1:
      zoomToRegion(breadcrumb[0]);
      break;
    case 2:
      zoomToDepartement(breadcrumb[1]);
      break;
    case 3:
      // @to-do: add circonscription
      break;
  }
  updateBreadcrumbHTML();
}

function zoomToRegion(regionName) {
  fetch('ressources/geojson/regions.geojson')
    .then((response) => response.json())
    .then((data) => {
      let regionFeature = data.features.find(
        (feature) => feature.properties.nom.trim() === regionName
      );
      if (regionFeature) {
        let regionLayer = L.geoJSON(regionFeature);
        map.fitBounds(regionLayer.getBounds());
        fetch('ressources/geojson/departements.geojson')
          .then((response) => response.json())
          .then((departementsData) => {
            let filteredDepartements = departementsData.features.filter(
              (departement) =>
                regionLayer
                  .getBounds()
                  .contains(L.geoJSON(departement).getBounds())
            );
            let filteredGeoJson = {
              type: 'FeatureCollection',
              features: filteredDepartements,
            };
            departementsLayerGroup.clearLayers();
            L.geoJSON(filteredGeoJson, {
              style: {
                color: '#F1F1F1',
                weight: 1,
                opacity: 0.8,
              },
              onEachFeature: function (feature, layer) {
                layer.on('click', function () {
                  const cleanName = feature.properties.nom.trim();
                  updateBreadcrumb(cleanName, 1);
                  moveToCommunes(layer);
                });
              },
            }).addTo(departementsLayerGroup);
          })
          .catch((error) =>
            console.error('Erreur lors du chargement des départements :', error)
          );
      }
    })
    .catch((error) =>
      console.error('Erreur lors du chargement des régions :', error)
    );
}

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

// Fonction pour zoomer sur un département à partir de son nom
function zoomToDepartement(departementName) {
  fetch('ressources/geojson/departements.geojson')
    .then((response) => response.json())
    .then((data) => {
      let departementFeature = data.features.find(
        (feature) => feature.properties.nom.trim() === departementName
      );
      if (departementFeature) {
        // Créer la couche Leaflet à partir du feature pour zoomer
        let departementLayer = L.geoJSON(departementFeature);
        map.fitBounds(departementLayer.getBounds()); // Zoomer sur les limites du département

        // Charger les communes du département
        fetch(
          `https://geo.api.gouv.fr/departements/${departementFeature.properties.code}/communes?fields=nom,code,contour`
        )
          .then((response) => response.json())
          .then((communes) => {
            let communesFeatures = communes
              .map((commune) => {
                if (!commune.contour) {
                  console.warn(
                    `Aucun contour trouvé pour ${commune.nom} (${commune.code})`
                  );
                  return null;
                }
                return {
                  type: 'Feature',
                  properties: {
                    code: commune.code,
                    nom: commune.nom,
                  },
                  geometry: commune.contour,
                };
              })
              .filter((feature) => feature !== null);

            // Créer un GeoJSON avec les communes filtrées
            let communesGeoJson = {
              type: 'FeatureCollection',
              features: communesFeatures,
            };

            // Nettoyer les anciennes couches de communes
            communesLayerGroup.clearLayers();

            // Ajouter les communes comme une nouvelle couche
            L.geoJSON(communesGeoJson, {
              style: {
                color: '#2ca02c',
                weight: 1,
                opacity: 0.8,
              },
              onEachFeature: function (feature, layer) {
                layer.on('click', function () {
                  const cleanName = feature.properties.nom.trim();
                  updateBreadcrumb(cleanName, 2);
                  map.fitBounds(layer.getBounds()); // Zoomer sur la commune
                });
              },
            }).addTo(communesLayerGroup);
          })
          .catch((error) =>
            console.error('Erreur lors de la requête API des communes :', error)
          );
      }
    })
    .catch((error) =>
      console.error('Erreur lors du chargement des départements :', error)
    );
}

// Generate layer by date selection and round

function getPartyColor(party) {
  const match = party.match(/\((.*?)\)/);
  if (match) {
    const partyName = match[1];
    return partyColors[partyName] || '#cccccc';
  }
  return '#F1F1F1';
}

async function generateLayerByGeoJson(file, layerGroup) {
  const selectYearElement = document.getElementById('selectYear');
  const selectTourElement = document.getElementById('tour');

  function getSelectedYear() {
    return (
      selectYearElement.options[selectYearElement.selectedIndex]?.value ||
      availableYear[0]
    );
  }

  function getSelectedTour() {
    return (
      selectTourElement.options[selectTourElement.selectedIndex]?.value || '1'
    );
  }

  async function loadAndUpdateData() {
    const selectedYear = getSelectedYear();
    const selectedTour = getSelectedTour();
    const data = await loadDataPresidentielles(selectedYear, selectedTour);

    fetch(file)
      .then((response) => response.json())
      .then((geoJsonData) => {
        layerGroup.clearLayers();

        let geoJsonLayer = L.geoJSON(geoJsonData, {
          style: {
            color: '#F1F1F1',
            weight: 1,
            fillOpacity: 0.7,
          },
          onEachFeature: async function (feature, layer) {
            const regionCode = feature.properties.code;
            const regionData = await getByRegion(data, regionCode);

            const winningParty = Object.keys(regionData)
              .filter(
                (key) =>
                  key !== 'code_region' &&
                  key !== 'inscrits' &&
                  key !== 'votants' &&
                  key !== 'exprimes' &&
                  key !== 'blancs_et_nuls'
              )
              .reduce(
                (maxParty, currentParty) =>
                  regionData[currentParty] > (regionData[maxParty] || 0)
                    ? currentParty
                    : maxParty,
                ''
              );

            // console.log(`Données pour la région ${regionCode}:`, regionData);
            // console.log(`Région: ${feature.properties.nom}, Parti gagnant: ${winningParty}, Votes: ${regionData[winningParty]}`);
            // console.log(`Couleur attribuée à ${winningParty}: ${getPartyColor(winningParty)}`);

            const fillColor = getPartyColor(winningParty);

            if (!winningParty || regionData[winningParty] === 0) {
              console.warn(
                `Pas de données valides pour la région ${regionCode}`
              );
              return;
            }

            layer.setStyle({
              color: fillColor,
              weight: 1,
              fillOpacity: 0.2,
              fillColor: fillColor,
            });

            // Afficher un popup temporaire au survol de la souris avec le nom du parti gagnant
            // const popupContent = `<b>Parti gagnant :</b> ${winningParty}`;
            // const center = layer.getBounds().getCenter();
            // const popup = L.popup({
            //     className: 'region-popup',
            //     closeButton: false,
            //     autoClose: false
            // }).setLatLng(center).setContent(popupContent);

            layer.on('mouseover', function () {
              layer.setStyle({ weight: 3 });
              // popup.openOn(layer._map);
            });

            layer.on('mouseout', function () {
              layer.setStyle({ weight: 1 });
              // layer._map.closePopup(popup);
            });

            layer.on('click', function () {
              const cleanName = feature.properties.nom.trim();
              updateBreadcrumb(cleanName, 1);
              moveToDepartements(layer);
              console.log('Région sélectionnée', cleanName);
            });
          },
        });

        geoJsonLayer.addTo(layerGroup);
      })
      .catch((error) =>
        console.error('Erreur lors du chargement du GeoJSON :', error)
      );
  }

  loadAndUpdateData();

  selectYearElement.addEventListener('change', loadAndUpdateData);
  selectTourElement.addEventListener('change', loadAndUpdateData);
}

function dynamicClearLayers(level) {
  switch (level) {
    case 'region':
      departementsLayerGroup.clearLayers();
      communesLayerGroup.clearLayers();
      break;
    case 'departement':
      communesLayerGroup.clearLayers();
      break;
    case 'commune':
      break;
    default:
      regionsLayerGroup.clearLayers();
      departementsLayerGroup.clearLayers();
      communesLayerGroup.clearLayers();
      break;
  }
}

// Naviguer vers les départements d'une région
let departmentLabelsLayer = L.layerGroup().addTo(map);

async function moveToDepartements(regionLayer) {
  dynamicClearLayers('region');
  departmentLabelsLayer.clearLayers();

  let regionCode = regionLayer.feature.properties.code;
  console.log(`Région sélectionnée : ${regionCode}`);
  map.fitBounds(regionLayer.getBounds());

  let departements = await fetchData(
    `https://geo.api.gouv.fr/regions/${regionCode}/departements`
  );
  console.log('Départements chargés :', departements);

  let selectedYear = document.getElementById('selectYear').value;
  let selectedTour = document.getElementById('tour').value;
  console.log(`Année sélectionnée : ${selectedYear}, Tour : ${selectedTour}`);

  fetch('ressources/geojson/departements.geojson')
    .then((response) => response.json())
    .then(async (geojsonData) => {
      let filteredDepartements = geojsonData.features.filter((feature) =>
        departements.some((dep) => dep.code === feature.properties.code)
      );
      console.log('Départements filtrés par région :', filteredDepartements);

      let data = await loadDataPresidentielles(selectedYear, selectedTour);
      console.log('Données électorales chargées :', data);

      let departementLayer = L.geoJSON(filteredDepartements, {
        style: function (feature) {
          let departementResults =
            getByDepartmentCode(data, feature.properties.code) || [];
          let totalVotesByParty = {};

          if (departementResults.length === 0) {
            console.warn(
              `Aucun résultat trouvé pour le département ${feature.properties.nom}`
            );
            return {
              color: '#cccccc',
              weight: 1,
              fillOpacity: 0.2,
              fillColor: '#cccccc',
            };
          }

          departementResults.forEach((result) => {
            for (let [party, votes] of Object.entries(result)) {
              if (party.match(/^.*\)$/g)) {
                totalVotesByParty[party] =
                  (totalVotesByParty[party] || 0) + votes;
              }
            }
          });

          let winningParty = Object.keys(totalVotesByParty).reduce(
            (maxParty, currentParty) =>
              totalVotesByParty[currentParty] >
              (totalVotesByParty[maxParty] || 0)
                ? currentParty
                : maxParty,
            Object.keys(totalVotesByParty)[0] || ''
          );

          let fillColor =
            partyColors[winningParty.match(/\((.*?)\)/)?.[1]] || '#cccccc';
          console.log(
            `Parti gagnant pour ${feature.properties.nom} : ${winningParty}, Couleur : ${fillColor}`
          );

          return {
            color: fillColor,
            weight: 1,
            opacity: 1,
            fillOpacity: 0.5,
            fillColor: fillColor,
          };
        },
        onEachFeature: function (feature, layer) {
          layer.on('click', function () {
            const cleanName = feature.properties.nom.trim();
            updateBreadcrumb(cleanName, 2);
            moveToCommunes(layer);
          });

          let center = layer.getBounds().getCenter();
          let winningParty = getWinningPartyForFeature(feature, data);
          if (winningParty) {
            let textLabel = L.divIcon({
              className: 'winning-party-label',
              html: `<div style="background-color: white; padding: 2px 5px; border-radius: 5px; box-shadow: 0 0 3px rgba(0,0,0,0.3);">${winningParty}</div>`,
              iconSize: [100, 30],
            });
            L.marker(center, { icon: textLabel }).addTo(departmentLabelsLayer);
          }

          hover(layer);
        },
      });

      departementLayer.addTo(departementsLayerGroup);

      regionsLayerGroup.eachLayer((layer) => {
        layer.setStyle({
          fillOpacity: 0,
          color: '#ffffff',
          weight: 1,
        });
      });
    })
    .catch((error) =>
      console.error(
        'Erreur lors du chargement du GeoJSON des départements :',
        error
      )
    );
}

function getWinningPartyForFeature(feature, data) {
  let departementResults = getByDepartmentCode(data, feature.properties.code);
  let totalVotesByParty = {};

  departementResults.forEach((result) => {
    for (let [party, votes] of Object.entries(result)) {
      if (party.match(/^.*\)$/g)) {
        totalVotesByParty[party] = (totalVotesByParty[party] || 0) + votes;
      }
    }
  });

  return Object.keys(totalVotesByParty).reduce((maxParty, currentParty) =>
    totalVotesByParty[currentParty] > (totalVotesByParty[maxParty] || 0)
      ? currentParty
      : maxParty
  );
}

function moveToCommunes(departementLayer) {
  dynamicClearLayers('departement'); // Nettoyer les couches inférieures
  if (!departementLayer || !departementLayer.feature) {
    console.error("Le département sélectionné n'a pas de couche valide.");
    return;
  }

  let departementCode = departementLayer.feature.properties.code;
  map.fitBounds(departementLayer.getBounds());

  fetch(
    `https://geo.api.gouv.fr/departements/${departementCode}/communes?fields=nom,code,contour`
  )
    .then((response) => response.json())
    .then((communes) => {
      let features = communes
        .map((commune) => {
          if (!commune.contour) {
            console.warn(
              `Aucun contour trouvé pour ${commune.nom} (${commune.code})`
            );
            return null;
          }
          return {
            type: 'Feature',
            properties: {
              code: commune.code, // Code postal
              nom: commune.nom,
            },
            geometry: commune.contour,
          };
        })
        .filter((feature) => feature !== null);

      let communesGeoJson = {
        type: 'FeatureCollection',
        features: features,
      };

      let communesLayer = L.geoJSON(communesGeoJson, {
        style: {
          color: '#2ca02c',
          weight: 1,
          opacity: 0.8,
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
            updateBreadcrumb(cleanName, 3);
            map.fitBounds(layer.getBounds());
          });
        },
      });

      communesLayer.addTo(communesLayerGroup);
    })
    .catch((error) =>
      console.error('Erreur lors de la requête API des communes :', error)
    );
}

// Charger initialement les régions
generateLayerByGeoJson('ressources/geojson/regions.geojson', regionsLayerGroup);

function resetMapOnTourChange() {
  // Efface toutes les couches et les étiquettes
  dynamicClearLayers('all');
  departmentLabelsLayer.clearLayers();

  resetBreadcrumb();

  // Recentrer la carte sur la vue initiale des régions
  map.setView([47.0811658, 2.399125], 6);

  // Récupérer les valeurs de l'année et du tour sélectionnés
  let selectedYear = document.getElementById('selectYear').value;
  let selectedTour = document.getElementById('tour').value;

  console.log(
    `Réinitialisation de la carte pour l'année ${selectedYear}, tour ${selectedTour}`
  );


  // Générer les calques des régions avec les nouvelles données
  generateLayerByGeoJson(
    'ressources/geojson/regions.geojson',
    regionsLayerGroup
  );
}

// Attachez l'événement au changement de sélection du tour
document
  .getElementById('tour')
  .addEventListener('change', resetMapOnTourChange);


(async function main() {
  const data = await loadDataPresidentielles('1965', '1');

  // Calculate by region
  const regionalResults = await getVictoryPercentageByRegion(data, 'UNR');
  console.log('Results by region:', regionalResults);

  // Calculate by department
  const departmentResults = getVictoryPercentageByDepartment(data, 'UNR');
  console.log('Results by department:', departmentResults);

  // Calculate by constituency
  const constituencyResults = getVictoryPercentageByConstituency(data, 'UNR');
  console.log('Results by constituency:', constituencyResults);
})();

