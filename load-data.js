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

async function getByRegion(data, codeRegion) {
  let departements = await fetchData(
    `https://geo.api.gouv.fr/regions/${codeRegion}/departements`
  );
  if (departements == undefined) {
    return;
  }

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
