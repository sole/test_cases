(function() {
	var h1 = document.querySelector('h1');
	var p = document.querySelector('p');
	h1.textContent = document.title;

	setInterval(updateDPR, 50);

	function updateDPR() {
		p.textContent = window.devicePixelRatio;
	}
	
}).call(this);

