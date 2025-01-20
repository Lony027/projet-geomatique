// @ to-do: corriger label bound
// zoom to n'actualise pas label et div results
//  and check doublon couleur, eviter  empilement couleurs
// @ to-do: bouton ranger le front, fix menu

// @ to-do: div refaire
// remove appel vers l'etat, avoir un json

// @ to-do: features gagnant (partie + abstention)

// @ to-do: check css et html
// @ CSS BREADCRUMB si g le temps
// search tool si j'ai le temps

// Tout mettre en anglais
// 1 seul .js
// rapport
// cannot hover with label
// @ to-do: last clean

// Readme

// -----------------------

let divmap = document.getElementById('map');

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

let regionsLayerGroup = L.layerGroup().addTo(map);
let departementsLayerGroup = L.layerGroup().addTo(map);
let circoLayerGroup = L.layerGroup().addTo(map);
let labelLayerGroup = L.layerGroup().addTo(map);

let regionDataGeoJson,
  departmentDataGeoJson,
  circoDataGeoJson,
  presidentialData;

let breadcrumbElement = document.getElementById('breadcrumb');
let breadcrumb = [];

let currentPartys;
let partys;

window.onload = () => {
  init();
}; // keep or not?

async function init() {
  try {
    partys = await fetchData('ressources/parties.json');
    regionDataGeoJson = await fetchData('ressources/geojson/regions.geojson');
    departmentDataGeoJson = await fetchData(
      'ressources/geojson/departements.geojson'
    );
    circoDataGeoJson = await fetchData(
      'ressources/geojson/circonscriptions.geojson'
    );
    await setDataPresidentielles();
    currentPartys = getParty(presidentialData);
    generateLayerByGeoJson();
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

async function reloadLayer() {
  resetTable();
  dynamicClearLayers(0);
  resetBreadcrumb();

  map.setView([47.0811658, 2.399125], 6);
  await setDataPresidentielles();
  currentPartys = getParty(presidentialData);
  generateLayerByGeoJson();
}

// ------------------------- UTILS

function replaceAndTruncateArray(array, index, newValue) {
  if (index < 0 || index >= array.length) {
    throw new Error('Index out of bounds');
  }
  return array.slice(0, index).concat(newValue);
}

function dynamicClearLayers(level) {
  labelLayerGroup.clearLayers();
  switch (level) {
    case 'region':
      departementsLayerGroup.clearLayers();
      circoLayerGroup.clearLayers();
      break;
    case 'departement':
      circoLayerGroup.clearLayers();
      break;
    case 'circo':
      break;
    default:
      regionsLayerGroup.clearLayers();
      departementsLayerGroup.clearLayers();
      circoLayerGroup.clearLayers();
      break;
  }
}

// -------------------------- BREADCRUMB

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

  let bcLen = breadcrumb.length;
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
}

function resetBreadcrumb() {
  breadcrumb = [];
  updateBreadcrumbHTML();
  return;
}

function updateBreadcrumbHTML() {
  let breadcrumbString = `<a href="#" onclick="breadcrumbClick(0)">France</a>`;
  if (breadcrumb.length > 0) {
    breadcrumbString += ' > ';
    breadcrumbString += breadcrumb
      .map((name, index) => {
        return `<a href="#" onclick="breadcrumbClick(${
          index + 1
        })">${name}</a>`;
      })
      .join(' > ');
  }
  breadcrumbElement.innerHTML = breadcrumbString;
}

function breadcrumbClick(depth) {
  if (depth == null || depth < 0 || depth > 3) {
    throw new Error('breadcrumbClick: Depth is null or out of bound');
  }

  breadcrumb = breadcrumb.slice(0, depth);
  switch (depth) {
    case 0:
      zoomToFrance();
      break;
    case 1:
      zoomToRegion(breadcrumb[0]);
      break;
    default: // case 2 & 3
      zoomToDepartement(breadcrumb[1]);
      break;
  }
  updateBreadcrumbHTML();
}

// -------------------------- INIT

function getSelectedYear() {
  const selectYearElement = document.getElementById('selectYear');
  return (
    selectYearElement.options[selectYearElement.selectedIndex]?.value ||
    availableYear[0]
  );
}

function getSelectedTour() {
  const selectTourElement = document.getElementById('tour');
  return (
    selectTourElement.options[selectTourElement.selectedIndex]?.value || '1'
  );
}

async function setDataPresidentielles() {
  const selectedYear = getSelectedYear();
  const selectedTour = getSelectedTour();
  presidentialData = await loadDataPresidentielles(selectedYear, selectedTour);
}

// -------------------------- LAYER MANAGEMENT

function getWinningParty(data) {
  return currentPartys.reduce((maxKey, key) =>
    data[key] > data[maxKey] ? key : maxKey
  );
}

function setWeighByDepth(layer, depth, add) {
  if (!add) {
    add = 0;
  }
  if (depth == 1) {
    layer.setStyle({ weight: 0.7 + add, opacity: 1 });
  } else {
    layer.setStyle({ weight: 0.5 + add, opacity: 0.5 });
  }
}

function fillLayerColorByWinningParty(layer, winningParty) {
  const fillColor = colorByParty(winningParty);
  layer.setStyle({
    color: '#F1F1F1',
    fillOpacity: 0.2,
    fillColor: fillColor,
  });
}

function layerHover(layer, depth) {
  layer.on('mouseover', function () {
    setWeighByDepth(layer, 1, 1);
  });

  layer.on('mouseout', function () {
    setWeighByDepth(layer, depth);
  });
}

function layerOnClick(feature, data, layer, depth) {
  layer.on('click', function () {
    let cleanName;
    if (depth != 3) {
      cleanName = feature.properties.nom.trim();
    } else {
      cleanName = feature.properties.nomCirconscription;
    }
    updateBreadcrumb(cleanName, depth);
    fillTableWithData(data); // add clean name
    fillTitle(cleanName);
    switch (depth) {
      case 1:
        moveToRegion(layer);
        break;
      case 2:
        moveToDepartments(layer);
        break;
      case 3:
        moveToCirco(layer);
        break;
    }
  });
}

// rajouter abstention,vote blanc....
function fillTableWithData(data) {
  // const percent = getPercentage(data);
  const partyData = currentPartys.map((party) => ({
    name: party,
    percentage: ((data[party] * 100) / data.exprimes).toFixed(2),
    votes: data[party],
  }));
  partyData.push({
    name: 'BLANCS ET NULS',
    percentage: ((data['blancs_et_nuls'] * 100) / data.exprimes).toFixed(2),
    votes: data['blancs_et_nuls'],
  })
  console.log(partyData);
  partyData.sort((a, b) => b.votes - a.votes);

  const table = document.getElementById('table_results');
  const tbody = table.querySelector('tbody');

  tbody.innerHTML = '<tr><th>Party</th><th>Pourcentage</th><th>Votes</th></tr>';

  partyData.forEach((party) => {
    const row = document.createElement('tr');
    row.innerHTML = `<th>${party.name}</th><th>${party.percentage}%</th><th>${party.votes}</th>`;
    tbody.appendChild(row);
  });
}

// function addToolTip(layer, data) {
//   L.tooltip(center, { content: infoAbout(data) }).addTo(map);
//   layer.on('mouseover', (e) => {
//     L.tooltip({
//       content: infoAbout(data),
//       direction: 'auto',
//       permanent: false,
//       interactive: false,
//     })
//       .setLatLng(e.latlng)
//       .addTo(map);
//     infoAbout(data);
//   });

//   layer.on('mouseout', () => {
//     map.eachLayer((tooltipLayer) => {
//       if (tooltipLayer instanceof L.Tooltip) {
//         map.removeLayer(tooltipLayer);
//       }
//     });
//   });

function resetTable() {
  const table = document.getElementById('table_results');
  const tbody = table.querySelector('tbody');

  tbody.innerHTML = '';

  const title = document.getElementById('result_place');
  title.innerHTML = '';
}

function fillTitle(name) {
  const title = document.getElementById('result_place');
  title.innerHTML = name;
}

function addLabel(winningParty, center) {
  let textLabel = L.divIcon({
    className: 'winning-party-label',
    html: `<div style="background-color: white; padding: 2px 5px; border-radius: 5px; box-shadow: 0 0 3px rgba(0,0,0,0.3);">${winningParty}</div>`,
    iconSize: [100, 30],
  });
  L.marker(center, { icon: textLabel }).addTo(labelLayerGroup);
}

function eachFeatureWrapper(feature, layer, data, depth) {
  let center = layer.getBounds().getCenter();
  const winningParty = getWinningParty(data);
  addLabel(winningParty, center);
  fillLayerColorByWinningParty(layer, winningParty);
  setWeighByDepth(layer, depth);
  layerHover(layer, depth);
  layerOnClick(feature, data, layer, depth);
}

// -------------------------- MOVE TO LAYER

function generateLayerByGeoJson() {
  // fillTableWithData(presidentialData);
  fillTableWithData(getFranceResults(presidentialData));
  let geoJsonLayer = L.geoJSON(regionDataGeoJson, {
    onEachFeature: async function (feature, layer) {
      const regionCode = feature.properties.code;
      const regionData = await getByRegion(presidentialData, regionCode);
      if (!regionData) {
        return;
      }
      eachFeatureWrapper(feature, layer, regionData, 1);
    },
  });
  geoJsonLayer.addTo(regionsLayerGroup);
}

async function moveToRegion(regionLayer) {
  dynamicClearLayers('region');
  map.fitBounds(regionLayer.getBounds());

  const regionCode = regionLayer.feature.properties.code;
  const departements = await fetchData(
    `https://geo.api.gouv.fr/regions/${regionCode}/departements`
  );

  const filteredDepartements = departmentDataGeoJson.features.filter(
    (feature) =>
      departements.some((dep) => dep.code === feature.properties.code)
  );
  if (!filteredDepartements) {
    return;
  }

  let departementLayer = L.geoJSON(filteredDepartements, {
    onEachFeature: async function (feature, layer) {
      const departmentCode = feature.properties.code;
      const departmentData = await getByDepartmentCode(
        presidentialData,
        departmentCode
      );
      if (!departmentData) {
        return;
      }
      eachFeatureWrapper(feature, layer, departmentData, 2);
    },
  });
  departementLayer.addTo(departementsLayerGroup);
}

async function moveToDepartments(departmentLayer) {
  dynamicClearLayers('departement');
  map.fitBounds(departmentLayer.getBounds());

  const departmentCode = departmentLayer.feature.properties.code;
  const filteredCirco = circoDataGeoJson.features.filter(
    (feature) => departmentCode === feature.properties.codeDepartement
  );
  if (!filteredCirco) {
    return;
  }

  let circoLayer = L.geoJSON(filteredCirco, {
    onEachFeature: async function (feature, layer) {
      const circoCode = feature.properties.codeCirconscription.slice(-2);
      const circoData = await getByCirconscription(
        presidentialData,
        departmentCode,
        circoCode
      );
      if (!circoData) {
        return;
      }
      eachFeatureWrapper(feature, layer, circoData[0], 3);
    },
  });
  circoLayer.addTo(circoLayerGroup);
}

async function moveToCirco(circoLayer) {
  map.fitBounds(circoLayer.getBounds());
}

// -------------------------- ZOOM TO LAYER

function layerByDepthName(depthLayer, depthName) {
  let depthFeature = depthLayer.features.find(
    (feature) => feature.properties.nom.trim() === depthName
  );
  if (!depthFeature) {
    return;
  }
  return L.geoJSON(depthFeature);
}

function zoomToFrance() {
  dynamicClearLayers('region');
  map.setView([47.0811658, 2.399125], 6);
}

function zoomToRegion(regionName) {
  dynamicClearLayers('departement');
  let regionLayer = layerByDepthName(regionDataGeoJson, regionName);
  if (!regionLayer) {
    return;
  }
  map.fitBounds(regionLayer.getBounds());
}

function zoomToDepartement(departementName) {
  let departmentLayer = layerByDepthName(
    departmentDataGeoJson,
    departementName
  );
  if (!departmentLayer) {
    return;
  }
  map.fitBounds(departmentLayer.getBounds());
}
// --------------------------

function colorByParty(partyName) {
  return partys[partyName];
}

// function getPercentage(data) {
//   let jsonToReturn = {};
//   currentPartys.forEach((partie) => {
//     jsonToReturn[partie] = ((data[partie] * 100) / data.exprimes).toFixed(2);
//   });
//   return jsonToReturn;
// }
