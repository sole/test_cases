(function() {
	var h1 = document.querySelector('h1');
	var p = document.querySelector('p');
	h1.textContent = document.title;

	// There is no event for when the pixel ratio changes (maybe because you moved the window to a monitor with different density)
	// So we'll use this interval and listen for changes somewhat often.
	setInterval(updateDPR, 50);

	function updateDPR() {
		p.textContent = window.devicePixelRatio;
	}
	
}).call(this);

