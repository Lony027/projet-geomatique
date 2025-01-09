const rangeMin = document.getElementById('range-min');
const rangeMax = document.getElementById('range-max');
const minValueSpan = document.getElementById('min-value');
const maxValueSpan = document.getElementById('max-value');
const sliderTrack = document.querySelector('.slider-range');

const btnYear = document.getElementById('btn_year');
const btnRangeYear = document.getElementById('btnRangeYear');


function updateRange() {
    const minVal = parseInt(rangeMin.value);
    const maxVal = parseInt(rangeMax.value);

    if (minVal > maxVal - 1) {
        rangeMin.value = maxVal - 1;
    }
    if (maxVal < minVal + 1) {
        rangeMax.value = minVal + 1;
    }

    minValueSpan.textContent = rangeMin.value;
    maxValueSpan.textContent = rangeMax.value;

    const minPercent = (rangeMin.value / rangeMin.max) * 100;
    const maxPercent = (rangeMax.value / rangeMax.max) * 100;

    sliderTrack.style.left = minPercent + '%';
    sliderTrack.style.right = (100 - maxPercent) + '%';
}

rangeMin.addEventListener('input', updateRange);
rangeMax.addEventListener('input', updateRange);

updateRange();



