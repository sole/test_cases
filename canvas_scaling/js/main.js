window.onload = function() {

	var h1 = document.querySelector('h1');
	h1.textContent = document.title;
	var debug = document.getElementById('debug');
	
	var canvas = document.createElement('canvas');
	var ctx = canvas.getContext('2d');

	document.body.appendChild(canvas);

	// canvas scaling + crispiness + devicePixelRatio

	// make it portrait
	var srcWidth = 240;
	var srcHeight = 320;

	window.addEventListener('resize', onWindowResize);
	onWindowResize();

	function onWindowResize() {
		var winWidth = window.innerWidth;
		var winHeight = window.innerHeight;

		updateDebug(winWidth, winHeight);
	}

	function updateDebug(winWidth, winHeight) {
		debug.innerHTML = 'Win: ' + winWidth + 'x' + winHeight;
	}

};

