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
		var dpr = window.devicePixelRatio;

		// Make canvas fit as much space as possible
		// Try fit to width first
		var newWidth = winWidth;
		var newHeight = Math.round((winWidth / srcWidth) * srcHeight);

		// nah, the other way round
		if(newHeight > winHeight) {
			newHeight = winHeight;
			newWidth = Math.round((winHeight / srcHeight) * srcWidth);
		}

		canvas.width = newWidth;
		canvas.height = newHeight;

		updateDebug(winWidth, winHeight, newWidth, newHeight, srcWidth, srcHeight);
	}

	function updateDebug(winWidth, winHeight, newWidth, newHeight, srcWidth, srcHeight) {
		var newRatio = (newWidth / newHeight).toFixed(2);
		var srcRatio = (srcWidth / srcHeight).toFixed(2);
		debug.innerHTML = 'Win: ' + winWidth + 'x' + winHeight + ' Can: ' + newWidth + 'x' + newHeight + ' ' + newRatio + ' Src: ' + srcWidth + 'x' + srcHeight;
	}

};

