let divmap = document.getElementById("map")
let layer = L.tileLayer('https://tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token={accessToken}', {
	attribution: '<a href="https://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	minZoom: 0,
	maxZoom: 22,
	accessToken: 'H2h0Jx9SUlnTFKSvAuhqfplwTUpFMPQL7J35nEptiCKhwy776J7TTk8m5QR6IKyZ'
});
let map = L.map(divmap, {
    center: [47.0811658, 2.399125],
    zoom: 6,
    layers: [layer]
});