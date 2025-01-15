document.addEventListener("DOMContentLoaded", function () {
    const rangeMin = document.getElementById('range-min');
    const rangeMax = document.getElementById('range-max');
    const minValueSpan = document.getElementById('min-value');
    const maxValueSpan = document.getElementById('max-value');
    const sliderTrack = document.querySelector('.slider-range');
    const selectYear = document.getElementById('selectYear');

    const btnYear = document.getElementById('btnYear');
    const btnRangeYear = document.getElementById('btnRangeYear');
    const sliderContainer = document.querySelector('.slider-container');

    // Remplir le select avec les années disponibles
    availableYear.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        selectYear.appendChild(option);
    });

    // Réinitialiser les calques et les étiquettes lorsque l'année change
    selectYear.addEventListener('change', function () {
        console.log("Année sélectionnée :", selectYear.value);
        dynamicClearLayers(0); // Effacer toutes les couches
        departmentLabelsLayer.clearLayers(); // Supprimer les anciennes étiquettes
        map.setView([47.0811658, 2.399125], 6); // Recentrer la carte sur les régions

        // Recharger les régions avec la nouvelle année
        generateLayerByGeoJson("ressources/geojson/regions.geojson", regionsLayerGroup);
    });
});
