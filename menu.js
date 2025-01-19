const selectYear = document.getElementById('selectYear');

availableYear.forEach((year) => {
  const option = document.createElement('option');
  option.value = year;
  option.textContent = year;
  selectYear.appendChild(option);
});

selectYear.addEventListener('change', reloadLayer);

const selectedTurn = document.getElementById('tour');
selectedTurn.addEventListener('change', reloadLayer);

// // Dynamically populate the color picker section
// function populateColorSection() {
//     const leftDiv = document.querySelector(".div-color-left");
//     const rightDiv = document.querySelector(".div-color-right");

//     // Split parties into two columns
//     const partyEntries = Object.entries(partyColors);
//     const half = Math.ceil(partyEntries.length / 2);

//     const leftParties = partyEntries.slice(0, half);
//     const rightParties = partyEntries.slice(half);

//     // Helper function to create color picker elements
//     function createColorPickerElements(parties) {
//         return parties.map(([abbreviation, color]) => {
//             const fullName = partyFullNames[abbreviation] || abbreviation;

//             // Create an aside element with color picker
//             const aside = document.createElement("aside");
//             aside.className = abbreviation;
//             aside.innerHTML = `
//                 <span>
//                     <input type="color" class="color-picker" data-party="${abbreviation}" value="${color}">
//                 </span>
//                 ${abbreviation} (${fullName})
//             `;
//             return aside;
//         });
//     }

//     // Populate the left and right divs
//     createColorPickerElements(leftParties).forEach(aside => leftDiv.appendChild(aside));
//     createColorPickerElements(rightParties).forEach(aside => rightDiv.appendChild(aside));
// }

// // Add event listeners to handle color changes
// function handleColorChanges() {
//     const colorPickers = document.querySelectorAll(".color-picker");

//     colorPickers.forEach(picker => {
//         picker.addEventListener("change", event => {
//             const party = event.target.dataset.party;
//             const newColor = event.target.value;

//             // Update the color in the partyColors object
//             if (party in partyColors) {
//                 partyColors[party] = newColor;
//                 console.log(`Updated color for ${party}: ${newColor}`);
//             }
//         });
//     });
// }

// // Initialize the color picker section
// function initColorPicker() {
//     populateColorSection();
//     handleColorChanges();
// }

// // Call the initialization function after DOM is fully loaded
// document.addEventListener("DOMContentLoaded", initColorPicker);

// function updateLayerColors() {
//     console.log("updateLayerColors called");

//     // Supprimer toutes les couches existantes
//     dynamicClearLayers(0); // Supprime toutes les couches (régions, départements, etc.)
//     departmentLabelsLayer.clearLayers(); // Supprime les étiquettes si nécessaire

//     // Recharger les régions avec les nouvelles couleurs
//     generateLayerByGeoJson();
// }

// function handleColorChanges() {
//     console.log("Initializing color change handlers");

//     const colorPickers = document.querySelectorAll(".color-picker");

//     // Débouncer l'appel à updateLayerColors
//     const debouncedUpdateLayerColors = debounce(updateLayerColors, 200); // 200ms de délai

//     colorPickers.forEach(picker => {
//         picker.addEventListener("input", event => {
//             const party = event.target.dataset.party;
//             const newColor = event.target.value;

//             if (party in partyColors) {
//                 // Met à jour le tableau des couleurs
//                 partyColors[party] = newColor;
//                 console.log(`Updated color for ${party}: ${newColor}`);

//                 // Rafraîchir la carte (avec debounce)
//                 debouncedUpdateLayerColors();
//             }
//         });
//     });
// }

// function debounce(func, delay) {
//     let timeout;
//     return (...args) => {
//         clearTimeout(timeout); // Clear le timeout précédent
//         timeout = setTimeout(() => func(...args), delay); // Exécuter après un délai
//     };
// }
