window.addEventListener('load', function() {
	var ac = new AudioContext();
	var currentTHX;
	var buttonsSpan = document.getElementById('buttons');

	for(var i = 0; i < 30; i++) {
		var btn = document.createElement('button');
		btn.innerHTML = i + 1;
		btn.addEventListener('click', triggerTHX);
		buttonsSpan.appendChild(btn);
	}

	function triggerTHX() {
		var numOscillators = this.innerHTML * 1.0;
		if(currentTHX) {
			currentTHX.stop();
			currentTHX.disconnect();
		}

		currentTHX = WebAudioTHX(ac, {
			numberOfOscillators: numOscillators
		});

		currentTHX.connect(ac.destination);
		currentTHX.start();
		
	}
});
