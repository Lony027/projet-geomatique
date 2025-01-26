// ----------------------------------- INIT DATA

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
const regionsList = {
  'Île-de-France': '11',
  'Centre-Val de Loire': '24',
  'Bourgogne-Franche-Comté': '27',
  Normandie: '28',
  'Hauts-de-France': '32',
  'Grand Est': '44',
  'Pays de la Loire': '52',
  Bretagne: '53',
  'Nouvelle-Aquitaine': '75',
  Occitanie: '76',
  'Auvergne-Rhône-Alpes': '84',
  "Provence-Alpes-Côte d'Azur": '93',
  Corse: '94',
  Guadeloupe: '01',
  Martinique: '02',
  Guyane: '03',
  'La Réunion': '04',
  Mayotte: '06',
};
const drom = ['01', '02', '03', '04'];
let map;
let regionsLayerGroup,
  departementsLayerGroup,
  circoLayerGroup,
  regionLabelLayerGroup,
  departmentLabelLayerGroup,
  circoLabelLayerGroup;
let breadcrumbElement, breadcrumb, isWinning;
const selectYear = document.getElementById('selectYear');
const btnWinning = document.getElementById('btn_winning');
const btnCandidat = document.getElementById('btn_candidate');
const selectedTurn = document.getElementById('turn');
const candidates = document.getElementById('slct_candidates');
let currentPartys;
let maxSelectedPartyRegion,
  minSelectedPartyRegion,
  maxSelectedPartyCirco,
  minSelectedPartyDep,
  maxSelectedPartyDep,
  minSelectedPartyCirco;

// ------------------------- INIT AND RELOAD

window.onload = async () => {
  await initData();
  initMap();
  definePane();
  defineLayerGroup();
  getHTMLElements();
  showLabelOnZoom();
  init();
};

async function reloadLayer() {
  resetTable();
  dynamicClearLayers();
  resetBreadcrumb();
  fillTitle('France');
  map.setView([47.0811658, 2.399125], 6);
  await setDataPresidentielles();
  currentPartys = getParty();
  fillCandidates();
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

function getWinningParty(data) {
  return currentPartys.reduce((maxKey, key) =>
    data[key] > data[maxKey] ? key : maxKey
  );
}

function getPercentByParty(data, party) {
  return ((data[party] * 100) / data.votants).toFixed(2);
}

function getNormalizedPercentage(value, min, max) {
  if (max === min) {
    return 100;
  }
  return ((value - min) / (max - min)) * 100;
}

function getMinAndMaxByDepth(depth) {
  switch (depth) {
    case 1:
      return [minSelectedPartyRegion, maxSelectedPartyRegion];
    case 2:
      return [minSelectedPartyDep, maxSelectedPartyDep];
    case 3:
      return [minSelectedPartyCirco, maxSelectedPartyCirco];
    default:
      return [0, 0];
  }
}

function restoreLastZone(lastZone) {
  if (lastZone) {
    if (isWinning) {
      lastZone.setStyle({ opacity: 1, fillOpacity: 0.2 });
    } else {
      lastZone.setStyle({ opacity: 1, fillOpacity: 0.6 });
    }
  }
}

function getFilteredDepartementsByRegionCode(regionCode) {
  const departements = depByRegionData[regionCode];
  return departmentDataGeoJson.features.filter((feature) =>
    departements.some((dep) => dep.code === feature.properties.code)
  );
}

function getDepartmentDataByPropertieCode(departmentCode) {
  return (departmentData = getByDepartmentCode(
    presidentialData,
    departmentCode
  ));
}
// ChatGPT
function darkenColor(color, percent) {
  color = color.replace(/^#/, '');

  if (color.length === 3) {
    color = color
      .split('')
      .map((c) => c + c)
      .join('');
  }

  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  percent = Math.min(100, Math.max(0, percent)) / 100;

  const adjust = (channel) => Math.round(channel * percent);

  const newR = adjust(r);
  const newG = adjust(g);
  const newB = adjust(b);

  return `#${[newR, newG, newB]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`;
}

function layerByDepthName(depthLayer, depthName) {
  let depthFeature = depthLayer.features.find(
    (feature) => feature.properties.nom.trim() === depthName
  );
  if (!depthFeature) {
    return;
  }
  return L.geoJSON(depthFeature);
}

function createRegionLabels() {
  regionDataGeoJson.features.forEach((feature) => {
    const regionCode = feature.properties.code;
    const regionData = getByRegion(regionCode, depByRegionData[regionCode]);
    if (!regionData) return;

    const center = L.geoJSON(feature).getBounds().getCenter();
    const winningParty = getWinningParty(regionData);
    addLabel(winningParty, center, 1);
  });
}

function createDepartmentsLabels(regionName) {
  // regionName
  //   .normalize('NFD')
  //   .replace(/[\u0300-\u036f]/g, '')
  //   .toUpperCase();

  regionCode = regionsList[regionName];
  const filteredDepartements = getFilteredDepartementsByRegionCode(regionCode);
  if (!filteredDepartements) {
    return;
  }

  filteredDepartements.forEach((feature) => {
    const departmentData = getDepartmentDataByPropertieCode(
      feature.properties.code
    );
    if (!departmentData) {
      return;
    }
    if (!departmentData) {
      return;
    }

    const center = L.geoJSON(feature).getBounds().getCenter();
    const winningParty = getWinningParty(departmentData);
    addLabel(winningParty, center, 1);
  });
}

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

function colorByParty(partyName) {
  return partysData[partyName];
}

function getParty() {
  let keys = Object.keys(presidentialData[0]);
  return keys.filter((v) => v.match(/^.*\)$/g));
}

function jsonReduceHelper(array, code, keyName) {
  const parties = getParty();
  let JSONtoReturn = array.reduce(
    (acc, dep) => {
      acc[keyName] = code;
      acc.inscrits += dep.inscrits;
      acc.blancs_et_nuls += dep.blancs_et_nuls;
      acc.exprimes += dep.exprimes;
      acc.votants += dep.votants;

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
      votants: 0,

      ...Object.fromEntries(parties.map((party) => [party, 0])),
    }
  );
  return JSONtoReturn;
}

function fillMinMaxCirco() {
  let values = presidentialData.map((v) =>
    v ? v[selectedParty] / v.exprimes : 0
  );
  minSelectedPartyCirco = Math.min(...values);
  maxSelectedPartyCirco = Math.max(...values);
}

function fillMinMaxDepartements() {
  const departmentsList = [
    ...new Set(presidentialData.map((item) => item.code_departement)),
  ];
  let values = departmentsList.reduce((acc, code) => {
    const departmentData = presidentialData.filter(
      (item) => item.code_departement === code
    );
    acc[code] = jsonReduceHelper(departmentData, code, 'code_departement');
    return acc;
  }, {});

  values = Object.values(values)
    .filter((v) => v !== undefined)
    .map((v) => v[selectedParty] / v.exprimes);

  minSelectedPartyDep = Math.min(...values);
  maxSelectedPartyDep = Math.max(...values);
}

function fillMinMaxRegion() {
  values = Object.values(regionsList).map((codeRegion) =>
    getByRegion(codeRegion, depByRegionData[codeRegion])
  );

  values = values.filter((v) => v !== undefined);
  values = values.map((v) => v[selectedParty] / v.exprimes);

  minSelectedPartyRegion = Math.min(...values);
  maxSelectedPartyRegion = Math.max(...values);
}

function fillMaxMinSelectedParty() {
  fillMinMaxCirco();
  fillMinMaxDepartements();
  fillMinMaxRegion();
}

// -------------------------- BREADCRUMB

function updateBreadcrumb(newLayerName, mapDepth) {
  if (
    mapDepth == undefined ||
    newLayerName == undefined ||
    mapDepth < 1 ||
    mapDepth > 3
  ) {
    return;
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

// -------------------------- INIT AND RELOAD FUNCTIONS

function init() {
  currentPartys = getParty();
  fillCandidates();
  selectedPartyListener();
  generateLayerByGeoJson();
}

async function initData() {
  try {
    let regionPromises = Object.values(regionsList).map((regionCode) =>
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
      ...regionPromises.map((p) => p.then((data) => data.departments)),
      setDataPresidentielles(),
    ]);

    partysData = promise[0];
    regionDataGeoJson = promise[1];
    departmentDataGeoJson = promise[2];
    circoDataGeoJson = promise[3];

    depByRegionData = {};
    const regionResults = await Promise.all(regionPromises);
    regionResults.forEach(({ regionCode, departments }) => {
      depByRegionData[regionCode] = departments;
    });
  } catch (e) {
    throw new Error('Error while fetching data');
  }
}

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
}

function getSelectedYear() {
  return (
    selectYear.options[selectYear.selectedIndex]?.value || availableYear[0]
  );
}

function getSelectedTurn() {
  return selectedTurn.options[selectedTurn.selectedIndex]?.value || '1';
}

async function setDataPresidentielles() {
  const selectedYear = getSelectedYear();
  const selectedTurn = getSelectedTurn();
  presidentialData = await loadDataPresidentielles(selectedYear, selectedTurn);
}

function selectedPartyListener() {
  candidates.addEventListener('click', function () {
    if (isWinning == 0) {
      selectedParty = candidates.options[candidates.selectedIndex]?.value;
      fillMaxMinSelectedParty();
    }
  });
}

async function loadDataPresidentielles(year, tour) {
  if (!availableYear.includes(year) || !availableTour) {
    throw new Error(`year : ${year} or turn : ${tour} does not exist`);
  }
  let file_name = `presi${year}t${tour}.json`;
  let file = await fetchData('/ressources/presidentielles/' + file_name);
  return file;
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
  fillMaxMinSelectedParty();
}

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

function definePane() {
  map.createPane('regionsPane');
  map.getPane('regionsPane').style.zIndex = 650;

  map.createPane('departmentsPane');
  map.getPane('departmentsPane').style.zIndex = 700;

  map.createPane('circoPane');
  map.getPane('circoPane').style.zIndex = 750;

  map.createPane('partyLabelPane');
  map.getPane('partyLabelPane').style.zIndex = 800;
  map.getPane('partyLabelPane').style.pointerEvents = 'none';
}

function defineLayerGroup() {
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

// -------------------------- LAYER MANAGEMENT

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

function addLabel(winningParty, center, depth) {
  const textLabel = L.divIcon({
    className: 'winning-party-label',
    html: `<div style="background-color: #090A0A; color: white; padding: 2px 5px; border-radius: 5px; opacity:0.7;">${winningParty}</div>`,
    iconSize: [100, 30],
  });
  const labelMarker = L.marker(center, {
    icon: textLabel,
    pane: 'partyLabelPane',
    interactive: false,
  });
  switch (depth) {
    case 1:
      labelMarker.addTo(regionLabelLayerGroup);
      break;
    case 2:
      labelMarker.addTo(departmentLabelLayerGroup);
      break;
    case 3:
      labelMarker.addTo(circoLabelLayerGroup);
      break;
  }
}

function showLabelOnZoom() {
  map.on('zoomend', function () {
    const zoom = map.getZoom();
    if (zoom <= 5) {
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

function colorByPercent(value, layer, color, depth) {
  minMax = getMinAndMaxByDepth(depth);
  const percent = getNormalizedPercentage(value, minMax[0], minMax[1]);
  color = darkenColor(color, percent);
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
    let percent_value = data[selectedParty] / data.exprimes;
    colorByPercent(percent_value, layer, color, depth);
  }
  setWeighByDepth(layer, depth);
  layerHover(layer, depth);
  layerOnClick(feature, data, layer, depth);
}

// -------------------------- RESULT TABLE

function partyDataInTable(data) {
  const partyData = currentPartys.map((party) => ({
    name: party,
    percentage: getPercentByParty(data, party),
    votes: data[party],
    color: colorByParty(party),
  }));

  partyData.push({
    name: 'BLANCS ET NULS',
    percentage: getPercentByParty(data, 'blancs_et_nuls'),
    votes: data['blancs_et_nuls'],
    color: '#FFFFFF',
  });

  partyData.sort((a, b) => b.votes - a.votes);

  return partyData;
}

function fillTableWithData(data) {
  const partyData = partyDataInTable(data);

  const table = document.getElementById('table_results');
  const tbody = table.querySelector('tbody');

  tbody.innerHTML =
    '<tr><th>Color</th><th>Party</th><th>Rate</th><th>Votes</th></tr>';

  partyData.forEach((party) => {
    const row = document.createElement('tr');

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
// -------------------------- MOVE TO ZONE

function generateLayerByGeoJson() {
  fillTableWithData(getFranceResults());
  let geoJsonLayer = L.geoJSON(regionDataGeoJson, {
    onEachFeature: async function (feature, layer) {
      const regionCode = feature.properties.code;
      const regionData = getByRegion(regionCode, depByRegionData[regionCode]);
      if (!regionData) {
        return;
      }
      eachFeatureWrapper(feature, layer, regionData, 1);
    },
  });
  geoJsonLayer.addTo(regionsLayerGroup);
}

function moveToRegion(regionLayer) {
  map.fitBounds(regionLayer.getBounds());
  const regionCode = regionLayer.feature.properties.code;
  if (drom.includes(regionCode)) {
    return;
  }
  restoreLastZone(lastRegionLayer);
  dynamicClearLayers('region');

  const filteredDepartements = getFilteredDepartementsByRegionCode(regionCode);
  if (!filteredDepartements) {
    return;
  }

  let departementLayer = L.geoJSON(filteredDepartements, {
    onEachFeature: function (feature, layer) {
      const departmentData = getDepartmentDataByPropertieCode(
        feature.properties.code
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

function moveToDepartments(departmentLayer) {
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
    onEachFeature: function (feature, layer) {
      const circoCode = feature.properties.codeCirconscription.slice(-2);
      const circoData = getByCirconscription(
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

function moveToCirco(circoLayer) {
  departmentLabelLayerGroup.clearLayers();
  map.fitBounds(circoLayer.getBounds());
}

// -------------------------- ZOOM TO LAYER

function zoomToFrance() {
  dynamicClearLayers('region');
  fillTitle('France');
  restoreLastZone(lastRegionLayer);
  map.setView([47.0811658, 2.399125], 6);
  if (isWinning) {
    createRegionLabels();
  }
}

function zoomToRegion(regionName) {
  dynamicClearLayers('departement');
  fillTitle(regionName);
  map.addLayer(departementsLayerGroup);
  let regionLayer = layerByDepthName(regionDataGeoJson, regionName);
  if (!regionLayer) {
    return;
  }
  restoreLastZone(lastDepLayer);
  const bounds = regionLayer.getBounds();
  map.fitBounds(bounds);
  if (isWinning) {
    createDepartmentsLabels(regionName);
  }
}

function zoomToDepartement(departementName) {
  fillTitle(departementName);
  let departmentLayer = layerByDepthName(
    departmentDataGeoJson,
    departementName
  );
  if (!departmentLayer) {
    return;
  }
  map.fitBounds(departmentLayer.getBounds());
}
// -------------------------- GET FILTERED DATA

function getByDepartmentCode(data, departementCode) {
  const circos = data.filter((v) => v.code_departement == departementCode);
  return jsonReduceHelper(circos, departementCode, 'code_departement');
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

function getByRegion(codeRegion, departements) {
  dep_code_array = departements.map((dep) => dep.code);
  return getRegionByDepartmentArray(dep_code_array, codeRegion);
}

function getRegionByDepartmentArray(dep_code_array, codeRegion) {
  const departements = getByDepartmentCodes(presidentialData, dep_code_array);
  if (departements.length == 0) {
    return;
  }
  return jsonReduceHelper(departements, codeRegion, 'code_region');
}

function getFranceResults() {
  return jsonReduceHelper(presidentialData, '', '');
}
