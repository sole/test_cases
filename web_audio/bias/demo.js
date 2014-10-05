var ac = new AudioContext();
var osc = ac.createOscillator();
var analyser = ac.createAnalyser();
var dcbias = DCBias(ac);
var mixer = ac.createGain();

var oscilloscope = document.querySelector('openmusic-oscilloscope');
var slider = document.querySelector('input[type=range]');
var currentValue = document.querySelector('span');

osc.connect(mixer);

mixer.connect(analyser);
analyser.connect(ac.destination);

// By connecting it to the 'mixer', whatever value the DCBias node is emitting
// will be added to the overall output value of that node
// The visual representation shows the wave shifting upwards/downwards.
dcbias.connect(mixer);

oscilloscope.attachTo(analyser);

slider.addEventListener('input', updateBias);

function updateBias() {
	dcbias.gain.value = parseFloat(slider.value);
	currentValue.innerHTML = dcbias.gain.value;
}

updateBias();
osc.start();
