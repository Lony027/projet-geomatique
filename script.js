// @ to-do: fix darken
// cannot hover with label
// fix zoom

// github ownership
// add more years

// Tout mettre en anglais
// 1 seul .js
// rapport
// Readme
// TEEST
// @ to-do: last clean
// TEEST

// -----------------------

let lastRegionLayer;
let lastDepLayer;

let presidentialData;
let partysData,
  regionDataGeoJson,
  departmentDataGeoJson,
  circoDataGeoJson,
  depByRegionData;

const availableYear = [
  '2012',
  '2007',
  '2002',
  '1995',
  '1988',
  '1981',
  '1974',
  '1969',
  '1965',
];

const availableTour = ['1', '2'];
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
const drom = ['01', '02', '03', '04'];
async function initData() {
  try {
    // let regionPromises = [];
    // regionsList.forEach((regionCode) =>
    //   regionPromises.push(fetchData(`https://geo.api.gouv.fr/regions/${regionCode}/departements`))
    // );

    let regionPromises = regionsList.map((regionCode) =>
      fetchData(
        `https://geo.api.gouv.fr/regions/${regionCode}/departements`
      ).then((departments) => ({
        regionCode,
        departments,
      }))
    );

    const promise = await Promise.all([
      fetchData('ressources/parties.json'),
      fetchData('ressources/geojson/regions.geojson'),
      fetchData('ressources/geojson/departements.geojson'),
      fetchData('ressources/geojson/circonscriptions.geojson'),
      // ...regionPromises,
      ...regionPromises.map((p) => p.then((data) => data.departments)),
      setDataPresidentielles(),
    ]);

    partysData = promise[0];
    regionDataGeoJson = promise[1];
    departmentDataGeoJson = promise[2];
    circoDataGeoJson = promise[3];
    // depByRegionData = promise.slice(4, 4 + regionsList.length).flat();

    depByRegionData = {};
    const regionResults = await Promise.all(regionPromises);
    regionResults.forEach(({ regionCode, departments }) => {
      depByRegionData[regionCode] = departments;
    });

    console.log(depByRegionData);
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

let breadcrumbElement, breadcrumb, isWinning;
const selectYear = document.getElementById('selectYear');
const btnWinning = document.getElementById('btn_winning');
const btnCandidat = document.getElementById('btn_candidate');
const selectedTurn = document.getElementById('turn');
const candidates = document.getElementById('slct_candidates');
function getHTMLElements() {
  breadcrumbElement = document.getElementById('breadcrumb');
  breadcrumb = [];

  isWinning = 1;
  btnWinning.addEventListener('click', function () {
    btnWinning.classList.add('selected');
    btnCandidat.classList.remove('selected');
    candidates.style.visibility = 'hidden';
    isWinning = 1;
    reloadLayer();
  });

  btnCandidat.addEventListener('click', function () {
    btnCandidat.classList.add('selected');
    btnWinning.classList.remove('selected');
    candidates.style.visibility = 'visible';
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
  candidates.addEventListener('change', reloadLayer);
}

let currentPartys;
function init() {
  currentPartys = getParty(presidentialData);
  // selectedParty = currentPartys[0];
  fillCandidates();
  selectedPartyListener();
  generateLayerByGeoJson();
}

function fillCandidates() {
  if (isWinning != 0) {
    return;
  }
  const currentSelection = candidates.value;
  candidates.innerHTML = '';
  currentPartys.forEach((party) => {
    const option = document.createElement('option');
    option.value = party;
    option.textContent = party;
    candidates.appendChild(option);
  });
  if (currentPartys.includes(currentSelection)) {
    candidates.value = currentSelection;
  } else {
    selectedParty = currentPartys[0];
  }
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

// function removeEachLayer(zoneGroup) {
//   zoneGroup.eachLayer((layer) => {
//     map.removeLayer(layer);
//   });
// }

// function addEachLayer(zoneGroup) {
//   zoneGroup.eachLayer((layer) => {
//     console.log(layer);
//     map.addLayer(layer);
//   });
// }

function dynamicClearLayers(level) {
  regionLabelLayerGroup.clearLayers();
  departmentLabelLayerGroup.clearLayers();
  circoLabelLayerGroup.clearLayers();
  // removeEachLayer(regionLabelLayerGroup);
  // removeEachLayer(departmentLabelLayerGroup);
  // removeEachLayer(circoLabelLayerGroup);
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
    selectYear.options[selectYear.selectedIndex]?.value || availableYear[0]
  );
}

function getSelectedTour() {
  return selectedTurn.options[selectedTurn.selectedIndex]?.value || '1';
}

async function setDataPresidentielles() {
  const selectedYear = getSelectedYear();
  const selectedTour = getSelectedTour();
  presidentialData = await loadDataPresidentielles(selectedYear, selectedTour);
}

function selectedPartyListener() {
  candidates.addEventListener('click', function () {
    if (isWinning == 0) {
      selectedParty = candidates.options[candidates.selectedIndex]?.value;
    }
  });
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
  fillTitle('France');
  map.setView([47.0811658, 2.399125], 6);
  await setDataPresidentielles();
  currentPartys = getParty(presidentialData);
  fillCandidates();
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

// Function From https://interactively.info/
function darkenColor(color, percent) {
  // Strip the leading # if it's there
  color = color.replace(/^\s*#|\s*$/g, '');

  // Convert 3 char codes -> 6, e.g. `E0F` -> `EE00FF`
  if (color.length == 3) {
    color = color.replace(/(.)/g, '$1$1');
  }

  // Split HEX Color
  const hexR = color.substring(0, 2);
  const hexG = color.substring(2, 4);
  const hexB = color.substring(4, 6);

  // HEX to RGB
  let r = parseInt(hexR, 16);
  let g = parseInt(hexG, 16);
  let b = parseInt(hexB, 16);

  if (isNaN(r)) r = 0;
  if (isNaN(g)) g = 0;
  if (isNaN(b)) b = 0;

  // Manipulate
  // percent = 1 + (percent / 100);
  const newR = Math.min(255, Math.floor(r + (r * percent) / 100));
  const newG = Math.min(255, Math.floor(g + (g * percent) / 100));
  const newB = Math.min(255, Math.floor(b + (b * percent) / 100));

  // RGB to HEX
  const newHexRColor = `${newR.toString(16)}`.padStart(2, '0');
  const newHexGColor = `${newG.toString(16)}`.padStart(2, '0');
  const newHexBColor = `${newB.toString(16)}`.padStart(2, '0');

  return '#' + newHexRColor + newHexGColor + newHexBColor;
}

function colorByPercent(layer, color, percent) {
  if (percent < 5) {
    percent = percent * 50;
  } else if (percent < 20) {
    percent = percent * 5;
  } else if (percent < 35) {
    percent = percent * 2;
  }

  color = darkenColor(color, -percent);
  layer.setStyle({
    color: '#F1F1F1',
    fillOpacity: 0.6,
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
    colorByPercent(layer, color, percent);
  }
  setWeighByDepth(layer, depth);
  layerHover(layer, depth);
  layerOnClick(feature, data, layer, depth);
}

// -------------------------- MOVE TO LAYER

function restoreLastZone(lastZone) {
  if (lastZone) {
    if (isWinning) {
      lastZone.setStyle({ opacity: 1, fillOpacity: 0.2 });
    } else {
      lastZone.setStyle({ opacity: 1, fillOpacity: 0.6 });
    }
  }
}
function generateLayerByGeoJson() {
  fillTableWithData(getFranceResults(presidentialData));
  let geoJsonLayer = L.geoJSON(regionDataGeoJson, {
    onEachFeature: async function (feature, layer) {
      const regionCode = feature.properties.code;
      const regionData = await getByRegion(
        presidentialData,
        regionCode,
        depByRegionData[regionCode]
      );
      if (!regionData) {
        return;
      }
      eachFeatureWrapper(feature, layer, regionData, 1);
    },
  });
  geoJsonLayer.addTo(regionsLayerGroup);
}

async function moveToRegion(regionLayer) {
  map.fitBounds(regionLayer.getBounds());
  const regionCode = regionLayer.feature.properties.code;
  if (drom.includes(regionCode)) {
    return;
  }
  restoreLastZone(lastRegionLayer);
  dynamicClearLayers('region');

  const departements = depByRegionData[regionCode];

  // console.log(regionCode);
  // 01, 02, 03, 04

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
  lastRegionLayer.setStyle({ opacity: 0, fillOpacity: 0 });
}

async function moveToDepartments(departmentLayer) {
  restoreLastZone(lastDepLayer);

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
  lastDepLayer.setStyle({ opacity: 0, fillOpacity: 0 });
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
  // addEachLayer(regionLabelLayerGroup);
  fillTitle('France');
  restoreLastZone(lastRegionLayer);
  map.setView([47.0811658, 2.399125], 6);
}

function zoomToRegion(regionName) {
  dynamicClearLayers('departement');
  fillTitle(regionName);
  // addEachLayer(departmentLabelLayerGroup);
  map.addLayer(departementsLayerGroup);
  let regionLayer = layerByDepthName(regionDataGeoJson, regionName);
  if (!regionLayer) {
    return;
  }
  restoreLastZone(lastDepLayer);
  map.fitBounds(regionLayer.getBounds());
}

function zoomToDepartement(departementName) {
  fillTitle(departementName);
  // addEachLayer(circoLabelLayerGroup);
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

function getByDepartmentCode(data, departementCode) {
  const circos = data.filter((v) => v.code_departement == departementCode);
  return jsonReduceHelper(data, circos, departementCode, 'code_departement');
}

function getByDepartmentCodes(data, departementCodeArray) {
  return data.filter((v) => departementCodeArray.includes(v.code_departement));
}

function getByCirconscription(data, departementCode, circonscription) {
  return data.filter(
    (v) =>
      v.circonscription == circonscription &&
      v.code_departement == departementCode
  );
}

async function getByRegion(data, codeRegion, departements) {
  // let departements = await fetchData(
  //   `https://geo.api.gouv.fr/regions/${codeRegion}/departements`
  // );
  // if (departements == undefined) {
  //   return;
  // }

  dep_code_array = departements.map((dep) => dep.code);
  return getRegionByDepartmentArray(data, dep_code_array, codeRegion);
}

// -----------------------------------------------------------------------------------

async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    const json = await response.json();
    return json;
  } catch (error) {
    console.error(error.message);
  }
}

async function loadDataPresidentielles(year, tour) {
  if (!availableYear.includes(year) || !availableTour) {
    throw new Error(`year : ${year} or turn : ${tour} does not exist`);
  }
  let file_name = `presi${year}t${tour}.json`;
  let file = await fetchData('/ressources/presidentielles/' + file_name);
  return file;
}

function getRegionByDepartmentArray(data, dep_code_array, codeRegion) {
  const departements = getByDepartmentCodes(data, dep_code_array);
  if (departements.length == 0) {
    return;
  }
  return jsonReduceHelper(data, departements, codeRegion, 'code_region');
}

function getFranceResults(data) {
  return jsonReduceHelper(data, data, '', '');
}

function getParty(data) {
  let keys = Object.keys(data[0]);
  return keys.filter((v) => v.match(/^.*\)$/g));
}

// async function getPartyScoreForAllRegions(party) {
//   let val = [];
//   let reg;
//   // https://geo.api.gouv.fr/departements

//   await regionsList.forEach(r => {
//     reg = getByRegion(presidentialData, r);
//     val.push(reg[party]);
//   })
//   return val;
// }

function jsonReduceHelper(data, array, code, keyName) {
  const parties = getParty(data);
  let JSONtoReturn = array.reduce(
    (acc, dep) => {
      acc[keyName] = code;
      acc.inscrits += dep.inscrits;
      acc.blancs_et_nuls += dep.blancs_et_nuls;
      acc.exprimes += dep.exprimes;

      parties.forEach((partie) => {
        acc[partie] = (acc[partie] || 0) + (dep[partie] || 0);
      });

      return acc;
    },
    {
      [keyName]: code,
      inscrits: 0,
      exprimes: 0,
      blancs_et_nuls: 0,

      ...Object.fromEntries(parties.map((party) => [party, 0])),
    }
  );
  return JSONtoReturn;
}

// -----------------------------------------------------------------------------------
