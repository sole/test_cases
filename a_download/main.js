var aLinked = document.getElementById('gradientLink');
var btnLinked = document.getElementById('btnLinked');
var btnLinkedTimeout = document.getElementById('btnLinkedTimeout');

btnLinked.addEventListener('click', triggerLinkedDownload);
btnLinkedTimeout.addEventListener('click', function() {
	setTimeout(triggerLinkedDownload, 1000);
});

function triggerLinkedDownload() {
	aLinked.setAttribute('download', 'linkedgradient.png');
	aLinked.click();
}

var btnCanvas = document.getElementById('btnCanvas');
var canvas = document.querySelector('canvas');
var context = canvas.getContext('2d');
context.fillStyle = 'red';
context.fillRect(0, 0, canvas.width, canvas.height);

btnCanvas.addEventListener('click', triggerCanvasDownload);

function triggerCanvasDownload() {
	canvas.toBlob(downloadBlob, 'image/png');
}

function downloadBlob(blob) {
	var blobURL = window.URL.createObjectURL(blob);

	var a = document.createElement('a');
	a.setAttribute('href', blobURL);
	a.setAttribute('download', 'canvas.png');

	// Appending image for debugging purposes
	var testImg = document.createElement('img');
	testImg.src = blobURL;
	document.body.appendChild(testImg);

	// the anchor has to be in the DOM for the click to work
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}
