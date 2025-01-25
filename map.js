// FIX ZOOM!
// @ to-do: features gagnant (: front et partie dynamique, affichage intuitif, // opacité max sur 1 et min sur 0.10)
// css menu. prends pas le max de width
// @ to-do: check css et html
// cannot hover with label

// drom bug
// add more years

// Tout mettre en anglais
// 1 seul .js
// 1 seul CSS
// rapport
// Readme
// @ to-do: last clean

// -----------------------

let lastRegionLayer;
let lastDepLayer;

let presidentialData;
let partysData, regionDataGeoJson, departmentDataGeoJson, circoDataGeoJson;
const regionsList = [
  '11',
  '24',
  '27',
  '28',
  '32',
  '44',
  '52',
  '53',
  '75',
  '76',
  '84',
  '93',
  '94',
  '01',
  '02',
  '03',
  '04',
  '06',
];
async function initData() {
  try {
    const promise = await Promise.all([
      fetchData('ressources/parties.json'),
      fetchData('ressources/geojson/regions.geojson'),
      fetchData('ressources/geojson/departements.geojson'),
      fetchData('ressources/geojson/circonscriptions.geojson'),
      // fetchData('https://geo.api.gouv.fr/regions'),
      setDataPresidentielles(),
    ]);

    partysData = promise[0];
    regionDataGeoJson = promise[1];
    departmentDataGeoJson = promise[2];
    circoDataGeoJson = promise[3];
    // regionsList = promise[4];
  } catch (e) {
    throw new Error('Error while fetching data');
  }
}

let map;
function initMap() {
  let divmap = document.getElementById('map');
  let layer = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    {
      attribution: '©OpenStreetMap, ©CartoDB',
      minZoom: 0,
      maxZoom: 22,
    }
  );

  map = L.map(divmap, {
    zoomControl: false,
    center: [47.0811658, 2.399125],
    zoom: 6,
    layers: [layer],
  });

  // map.createPane('labels');
  // L.tileLayer(
  //   'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png',
  //   {
  //     attribution: '©OpenStreetMap, ©CartoDB',
  //     pane: 'labels',
  //   }
  // ).addTo(map);
}

let regionsLayerGroup,
  departementsLayerGroup,
  circoLayerGroup,
  regionLabelLayerGroup,
  departmentLabelLayerGroup,
  circoLabelLayerGroup;
function definePane() {
  map.createPane('regionsPane');
  map.getPane('regionsPane').style.zIndex = 650;
  // map.getPane('regionsPane'.style.

  map.createPane('departmentsPane');
  map.getPane('departmentsPane').style.zIndex = 700;

  map.createPane('circoPane');
  map.getPane('circoPane').style.zIndex = 750;

  map.createPane('partyLabelPane');
  map.getPane('partyLabelPane').style.zIndex = 200;
  map.getPane('partyLabelPane').style.pointerEvents = 'none';

  regionsLayerGroup = L.layerGroup([], { pane: 'regionsPane' }).addTo(map);
  departementsLayerGroup = L.layerGroup([], { pane: 'departmentsPane' }).addTo(
    map
  );
  circoLayerGroup = L.layerGroup([], { pane: 'circoPane' }).addTo(map);

  regionLabelLayerGroup = L.layerGroup([], { pane: 'partyLabelPane' }).addTo(
    map
  );
  departmentLabelLayerGroup = L.layerGroup([], {
    pane: 'partyLabelPane',
  }).addTo(map);
  circoLabelLayerGroup = L.layerGroup([], { pane: 'partyLabelPane' }).addTo(
    map
  );
}

let breadcrumbElement, breadcrumb, isWinning, selectedParty;
const selectYear = document.getElementById('selectYear');
const btnWinning = document.getElementById('btn_winning');
const btnCandidat = document.getElementById('btn_candidat');
const selectedTurn = document.getElementById('tour');
function getHTMLElements() {
  breadcrumbElement = document.getElementById('breadcrumb');
  breadcrumb = [];

  // smarter way to do

  selectedParty = 'SARKOZY (UMP)';

  isWinning = 1;
  btnWinning.addEventListener('click', function () {
    btnWinning.classList.add('selected');
    btnCandidat.classList.remove('selected');
    isWinning = 1;
    reloadLayer();
  });

  btnCandidat.addEventListener('click', function () {
    btnCandidat.classList.add('selected');
    btnWinning.classList.remove('selected');
    isWinning = 0;
    reloadLayer();
  });

  availableYear.forEach((year) => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    selectYear.appendChild(option);
  });

  selectYear.addEventListener('change', reloadLayer);


  selectedTurn.addEventListener('change', reloadLayer);
}

let currentPartys;
function init() {
  currentPartys = getParty(presidentialData);
  generateLayerByGeoJson();
}

window.onload = async () => {
  await initData();
  initMap();
  definePane();
  getHTMLElements();
  showLabelOnZoom();
  init();
};

// ------------------------- UTILS

function replaceAndTruncateArray(array, index, newValue) {
  if (index < 0 || index >= array.length) {
    throw new Error('Index out of bounds');
  }
  return array.slice(0, index).concat(newValue);
}

function dynamicClearLayers(level) {
  regionLabelLayerGroup.clearLayers();
  departmentLabelLayerGroup.clearLayers();
  circoLabelLayerGroup.clearLayers();
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
    mapDepth == undefined ||
    newLayerName == undefined ||
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
  if (depth == undefined || depth < 0 || depth > 3) {
    throw new Error('breadcrumbClick: Depth is undefined or out of bound');
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
  return (
    selectYear.options[selectYear.selectedIndex]?.value ||
    availableYear[0]
  );
}

function getSelectedTour() {
  return (
    selectedTurn.options[selectedTurn.selectedIndex]?.value || '1'
  );
}

async function setDataPresidentielles() {
  const selectedYear = getSelectedYear();
  const selectedTour = getSelectedTour();
  presidentialData = await loadDataPresidentielles(selectedYear, selectedTour);
}

// -------------------------- LAYER MANAGEMENT

let minPartySelected, maxPartySelected;
function setMinAndMaxByZone(data, party) {
  sortedData = [];
  data.forEach((e) => {
    sortedData.push(data[party]);
  });
  return [Math.min(sortedData), Math.max(sortedData)];
}

async function reloadLayer() {
  resetTable();
  dynamicClearLayers();
  resetBreadcrumb();

  // if (!isWinning) {
  //   console.log(await getPartyScoreForAllRegions(selectedParty));
  //   // minPartySelected()
  // }

  map.setView([47.0811658, 2.399125], 6);
  await setDataPresidentielles();
  currentPartys = getParty(presidentialData);
  generateLayerByGeoJson();
}

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

function fillLayerColorByWinningParty(layer, winningParty, fillColor) {
  fillColor = colorByParty(winningParty);
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
    fillTableWithData(data);
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

function getPercentByParty(data, party) {
  return ((data[party] * 100) / data.exprimes).toFixed(2);
}

// function fillTableWithData(data) {
//   const partyData = currentPartys.map((party) => ({
//     name: party,
//     percentage: getPercentByParty(data, party),
//     votes: data[party],
//   }));
//   partyData.push({
//     name: 'BLANCS ET NULS',
//     percentage: getPercentByParty(data, 'blancs_et_nuls'),
//     votes: data['blancs_et_nuls'],
//   });
//   partyData.sort((a, b) => b.votes - a.votes);

//   const table = document.getElementById('table_results');
//   const tbody = table.querySelector('tbody');

//   tbody.innerHTML = '<tr><th>Color</th><th>Party</th><th>Pourcentage</th><th>Votes</th></tr>';

//   partyData.forEach((party) => {
//     const row = document.createElement('tr');
//     row.innerHTML = `<th>${colorByParty(party.name)}</th><th>${party.name}</th><th>${party.percentage}%</th><th>${party.votes}</th>`;
//     tbody.appendChild(row);
//   });
// }
function fillTableWithData(data) {
  const partyData = currentPartys.map((party) => ({
    name: party,
    percentage: getPercentByParty(data, party),
    votes: data[party],
    color: colorByParty(party), // Add the color hex code here
  }));

  // Add BLANCS ET NULS data
  partyData.push({
    name: 'BLANCS ET NULS',
    percentage: getPercentByParty(data, 'blancs_et_nuls'),
    votes: data['blancs_et_nuls'],
    color: undefined, // No color defined for this
  });

  // Sort data by votes in descending order
  partyData.sort((a, b) => b.votes - a.votes);

  const table = document.getElementById('table_results');
  const tbody = table.querySelector('tbody');

  // Reset the table body
  tbody.innerHTML =
    '<tr><th>Color</th><th>Party</th><th>Pourcentage</th><th>Votes</th></tr>';

  // Fill the table rows
  partyData.forEach((party) => {
    const row = document.createElement('tr');

    // Dynamically create the row with a color cell
    row.innerHTML = `
      <th style="background-color: ${
        party.color || '#FFFFFF'
      }; opacity:0.5"> </th>
      <th>${party.name}</th>
      <th>${party.percentage}%</th>
      <th>${party.votes}</th>
    `;

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

function addLabel(winningParty, center, depth) {
  const textLabel = L.divIcon({
    className: 'winning-party-label',
    html: `<div style="background-color: #090A0A; color: white; padding: 2px 5px; border-radius: 5px; opacity:0.7;">${winningParty}</div>`,
    iconSize: [100, 30],
  });
  switch (depth) {
    case 1:
      L.marker(center, { icon: textLabel }).addTo(regionLabelLayerGroup);
      break;
    case 2:
      L.marker(center, { icon: textLabel }).addTo(departmentLabelLayerGroup);
      break;
    case 3:
      L.marker(center, { icon: textLabel }).addTo(circoLabelLayerGroup);
      break;
  }
}

function showLabelOnZoom() {
  map.on('zoomend', function () {
    const zoom = map.getZoom();
    if (zoom <= 4) {
      map.removeLayer(regionLabelLayerGroup);
    } else {
      map.addLayer(regionLabelLayerGroup);
    }

    if (zoom <= 6) {
      map.removeLayer(departmentLabelLayerGroup);
      map.removeLayer(circoLabelLayerGroup);
    } else {
      map.addLayer(departmentLabelLayerGroup);
      map.addLayer(circoLabelLayerGroup);
    }
  });
}

function colorByPercent(layer, color, percent) {
  layer.setStyle({
    color: '#F1F1F1',
    fillOpacity: percent,
    fillColor: color,
  });
}

function eachFeatureWrapper(feature, layer, data, depth) {
  if (isWinning) {
    let center = layer.getBounds().getCenter();
    const winningParty = getWinningParty(data);
    addLabel(winningParty, center, depth);
    fillLayerColorByWinningParty(layer, winningParty);
  } else {
    let color = colorByParty(selectedParty);
    let percent = getPercentByParty(data, selectedParty);
    colorByPercent(layer, color, percent / 100);
  }
  setWeighByDepth(layer, depth);
  layerHover(layer, depth);
  layerOnClick(feature, data, layer, depth);
}

// -------------------------- MOVE TO LAYER

function generateLayerByGeoJson() {
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
  if (lastRegionLayer) {
    lastRegionLayer.setStyle({ opacity: 1, fillOpacity: 0.2 });
  }
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

  lastRegionLayer = regionLayer;
  regionLayer.setStyle({ opacity: 0, fillOpacity: 0 });
}

async function moveToDepartments(departmentLayer) {
  if (lastDepLayer) {
    lastDepLayer.setStyle({ opacity: 1, fillOpacity: 0.2 });
  }
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

  lastDepLayer = departmentLayer;
  departmentLayer.setStyle({ opacity: 0, fillOpacity: 0 });
}

async function moveToCirco(circoLayer) {
  departmentLabelLayerGroup.clearLayers();
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
  return partysData[partyName];
}

// function getPercentage(data) {
//   let jsonToReturn = {};
//   currentPartys.forEach((partie) => {
//     jsonToReturn[partie] = ((data[partie] * 100) / data.exprimes).toFixed(2);
//   });
//   return jsonToReturn;
// }
