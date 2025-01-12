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

    // Initialisation des valeurs min/max pour le slider
    const minYear = Math.min(...availableYear);
    const maxYear = Math.max(...availableYear);

    rangeMin.min = 0;
    rangeMax.min = 0;
    rangeMin.max = availableYear.length - 1;
    rangeMax.max = availableYear.length - 1;

    rangeMin.value = 4;
    rangeMax.value = 6;

    minValueSpan.textContent = availableYear[rangeMin.value];
    maxValueSpan.textContent = availableYear[rangeMax.value];

    updateSliderTrack();

    // Fonction pour mettre à jour l'affichage des valeurs du slider
    function updateRange() {
        const minVal = parseInt(rangeMin.value);
        const maxVal = parseInt(rangeMax.value);

        if (minVal > maxVal - 1) {
            rangeMin.value = maxVal - 1;
        }
        if (maxVal < minVal + 1) {
            rangeMax.value = minVal + 1;
        }

        minValueSpan.textContent = availableYear[rangeMin.value];
        maxValueSpan.textContent = availableYear[rangeMax.value];

        updateSliderTrack();
    }

    // Fonction pour mettre à jour le tracé du slider
    function updateSliderTrack() {
        const minPercent = (rangeMin.value / rangeMin.max) * 100;
        const maxPercent = (rangeMax.value / rangeMax.max) * 100;

        sliderTrack.style.left = minPercent + '%';
        sliderTrack.style.right = (100 - maxPercent) + '%';
    }

    // Fonction pour afficher le selectYear et masquer le slider
    function showSelectYear() {
        selectYear.style.display = "block";
        sliderContainer.style.display = "none";
        btnYear.classList.add("selected");
        btnRangeYear.classList.remove("selected");
    }

    // Fonction pour afficher le slider et masquer le selectYear
    function showSlider() {
        selectYear.style.display = "none";
        sliderContainer.style.display = "block";
        btnYear.classList.remove("selected");
        btnRangeYear.classList.add("selected");
    }

    // Gestionnaire de clic pour le bouton "Année"
    btnYear.addEventListener('click', function () {
        if (btnYear.classList.contains("selected")) {
            showSlider();
        } else {
            showSelectYear();
        }
    });

    // Gestionnaire de clic pour le bouton "Plage d'années"
    btnRangeYear.addEventListener('click', function () {
        if (btnRangeYear.classList.contains("selected")) {
            showSelectYear();
        } else {
            showSlider();
        }
    });

    // Initialiser avec le bouton "Année" sélectionné
    showSelectYear();

    // Remplir le select avec les années disponibles
    availableYear.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        selectYear.appendChild(option);
    });

    // Ajouter des événements sur les sliders pour mettre à jour les valeurs
    rangeMin.addEventListener('input', updateRange);
    rangeMax.addEventListener('input', updateRange);

    // Appeler la fonction updateRange pour initialiser les valeurs
    updateRange();
});
