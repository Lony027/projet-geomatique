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

// return votes by party
function calculateTotalVotes(results) {
  let totalVotesByParty = {};
  results.forEach((result) => {
    for (let [party, votes] of Object.entries(result)) {
      if (party.match(/^.*\)$/g)) {
        totalVotesByParty[party] = (totalVotesByParty[party] || 0) + votes;
      }
    }
  });
  return totalVotesByParty;
}

// function getWinningParty(votesByParty) {
//   return Object.keys(votesByParty).reduce(
//     (maxParty, currentParty) =>
//       votesByParty[currentParty] > (votesByParty[maxParty] || 0)
//         ? currentParty
//         : maxParty,
//     Object.keys(votesByParty)[0] || ''
//   );
// }

// -----------------------------------------------------------------------------------

// Extract the party abbreviation from the full party name using regex
function extractPartyAbbreviation(fullName) {
  const match = fullName.match(/\((.*?)\)/); // Matches text within parentheses
  return match ? match[1] : null; // Returns the abbreviation or null if not found
}

async function getVictoryPercentageByRegion(data, partyAbbreviation) {
  const regions = await fetchData('https://geo.api.gouv.fr/regions');
  if (!regions) return;

  const results = {};

  for (const region of regions) {
    const regionCode = region.code;
    const regionName = region.nom;

    // Fetch departments for the current region
    const departements = await fetchData(
      `https://geo.api.gouv.fr/regions/${regionCode}/departements`
    );
    if (!departements) continue;

    const depCodes = departements.map((dep) => dep.code);

    // Filter data for the departments in this region
    const regionalData = getByDepartmentCodes(data, depCodes);

    // Calculate total votes for the party abbreviation and total expressed votes
    const totalVotes = regionalData.reduce((sum, entry) => {
      for (const key of Object.keys(entry)) {
        if (extractPartyAbbreviation(key) === partyAbbreviation) {
          return sum + (entry[key] || 0);
        }
      }
      return sum;
    }, 0);

    const totalExprimes = regionalData.reduce(
      (sum, entry) => sum + entry.exprimes,
      0
    );

    // Calculate the percentage of votes
    const percentage =
      totalExprimes > 0 ? (totalVotes / totalExprimes) * 100 : 0;

    results[regionName] = `${percentage.toFixed(2)}%`;
  }

  return results;
}

// function getVictoryPercentageByDepartment(data, partyAbbreviation) {
//   const departements = [...new Set(data.map(entry => entry.departement))];

//   const results = {};

//   for (const dep of departements) {
//       // Filter data for the current department
//       const departmentData = getByDepartementName(data, dep);

//       // Calculate total votes for the party abbreviation and total expressed votes
//       const totalVotes = departmentData.reduce((sum, entry) => {
//           for (const key of Object.keys(entry)) {
//               if (extractPartyAbbreviation(key) === partyAbbreviation) {
//                   return sum + (entry[key] || 0);
//               }
//           }
//           return sum;
//       }, 0);

//       const totalExprimes = departmentData.reduce((sum, entry) => sum + entry.exprimes, 0);

//       // Calculate the percentage of votes
//       const percentage = totalExprimes > 0 ? (totalVotes / totalExprimes) * 100 : 0;

//       results[dep] = `${percentage.toFixed(2)}%`;
//   }

//   return results;
// }

// function getVictoryPercentageByConstituency(data, partyAbbreviation) {
//   const constituencies = [...new Set(data.map(entry => entry.circonscription))];

//   const results = {};

//   for (const constituency of constituencies) {
//       // Filter data for the current constituency
//       const constituencyData = data.filter(entry => entry.circonscription === constituency);

//       // Calculate total votes for the party abbreviation and total expressed votes
//       const totalVotes = constituencyData.reduce((sum, entry) => {
//           for (const key of Object.keys(entry)) {
//               if (extractPartyAbbreviation(key) === partyAbbreviation) {
//                   return sum + (entry[key] || 0);
//               }
//           }
//           return sum;
//       }, 0);

//       const totalExprimes = constituencyData.reduce((sum, entry) => sum + entry.exprimes, 0);

//       // Calculate the percentage of votes
//       const percentage = totalExprimes > 0 ? (totalVotes / totalExprimes) * 100 : 0;

//       results[`Circonscription ${constituency}`] = `${percentage.toFixed(2)}%`;
//   }

//   return results;
// }

/*
971 = ZA
972 = ZB
973 = ZC
974 = ZD
975 = ZS
985 = ZM
*/
