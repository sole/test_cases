(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var SamplePlayer = require('../index');
var generateBrownNoise = require('openmusic-brown-noise');

// register the oscilloscope component so we can use it
require('openmusic-oscilloscope').register('openmusic-oscilloscope');
require('openmusic-slider').register('openmusic-slider');

var ac = new AudioContext();
var player = SamplePlayer(ac);
var analyser = ac.createAnalyser();
var oscilloscope = document.querySelector('openmusic-oscilloscope');

player.connect(analyser);
analyser.connect(ac.destination);

oscilloscope.attachTo(analyser);

document.querySelector('button').addEventListener('click', onStartPressed);
document.querySelector('input[type=checkbox]').addEventListener('change', onLoopChanged);

var loopStart = document.getElementById('loopStart');
var loopEnd = document.getElementById('loopEnd');

loopStart.addEventListener('input', ensureLoopSanity);
loopEnd.addEventListener('input', ensureLoopSanity);

var request = new XMLHttpRequest();
request.open('GET', 'data/amen.ogg', true);
request.responseType = 'arraybuffer';

request.onload = function() {
	ac.decodeAudioData(request.response, onBufferLoaded, onBufferLoadError);
};

request.send();

function onBufferLoaded(buffer) {
	player.buffer = buffer;
}

function onBufferLoadError(err) {
	console.error('oh no', err);
}

function onStartPressed() {
	player.start();
}

function onLoopChanged() {
	player.loop = this.checked;
}

function ensureLoopSanity(e) {
	// don't let loopEnd be < loopStart, and the opposite
	var startValue = loopStart.value * 1;
	var endValue = loopEnd.value * 1;

	if(this === loopStart && ( startValue >= endValue )) {
		e.preventDefault();
		e.stopPropagation();
		loopStart.value = endValue - 0.01;
	} else if(this === loopEnd && ( endValue <= startValue )) {
		e.preventDefault();
		e.stopPropagation();
		loopEnd.value = startValue + 0.01;
	}

	// The loop points are in seconds
	// Interestingly Chrome won't play anything at all if the loop points are 'outside' the sample duration
	var sampleLength = player.buffer.length / ac.sampleRate;

	player.loopStart = sampleLength * loopStart.value;
	player.loopEnd = sampleLength * loopEnd.value;

}

},{"../index":2,"openmusic-brown-noise":3,"openmusic-oscilloscope":5,"openmusic-slider":6}],2:[function(require,module,exports){
function SamplePlayer(context) {
	var node = context.createGain();
	var bufferSource;
	var bufferSourceProperties = {};

	['buffer', 'loop', 'loopStart', 'loopEnd'].forEach(function(name) {
		Object.defineProperty(node, name, makeBufferSourceGetterSetter(name));
	});

	// TODO: playbackRate which needs to be an AudioParam

	node.start = function(when, offset, duration) {
		// console.log('start', 'when', when, 'offset', offset, 'duration', duration);

		var buffer = bufferSourceProperties['buffer'];
		if(!buffer) {
			console.info('no buffer to play so byeee');
			return;
		}

		when = when !== undefined ? when : 0;
		offset = offset !== undefined ? offset : 0;
		
		// TODO This is mega ugly but urgh what is going on urgh
		// if I just pass 'undefined' as duration Chrome doesn't play anything
		if(window.webkitAudioContext) {
			console.log('correcting for chrome aghh');
			var sampleLength = buffer.length;
			duration = duration !== undefined ? duration : sampleLength - offset;
		}

		// Disconnect if existing, remove events listeners
		if(bufferSource) {
			bufferSource.removeEventListener('ended', onEnded);
			bufferSource.disconnect(node);
			bufferSource = null;
		}

		initialiseBufferSource();

		bufferSource.start(when, offset, duration);

	};

	node.stop = function(when) {
		bufferSource.stop(when);
	};

	node.cancelScheduledEvents = function(when) {
		// TODO: when there is automation
	};

	function initialiseBufferSource() {
		
		bufferSource = context.createBufferSource();
		bufferSource.addEventListener('ended', onEnded);
		bufferSource.connect(node);

		Object.keys(bufferSourceProperties).forEach(function(name) {
			bufferSource[name] = bufferSourceProperties[name];
		});

	}

	function onEnded(e) {
		var t = e.target;
		t.disconnect(node);
		initialiseBufferSource();
	}

	function makeBufferSourceGetterSetter(property) {
		return {
			get: function() {
				return getBufferSourceProperty(property);
			},
			set: function(v) {
				setBufferSourceProperty(property, v);
			},
			enumerable: true
		};
	}

	function getBufferSourceProperty(name) {
		return bufferSourceProperties[name];
	}

	function setBufferSourceProperty(name, value) {

		bufferSourceProperties[name] = value;

		if(bufferSource) {
			bufferSource[name] = value;
		}

	}

	return node;
}

module.exports = SamplePlayer;

},{}],3:[function(require,module,exports){
var generateWhiteNoise = require('openmusic-white-noise');

// Adapted from https://github.com/zacharydenton/noise.js/blob/master/noise.js
module.exports = function(size) {

	var out = generateWhiteNoise(size);
	var lastOutput = 0.0;

	for(var i = 0; i < size; i++) {

		var white = out[i];
		out[i] = (lastOutput + (0.02 * white)) / 1.02;
		lastOutput = out[i];
		out[i] *= 3.5; // (roughly) compensate for gain
		
	}

	return out;
	
};

},{"openmusic-white-noise":4}],4:[function(require,module,exports){
module.exports = function(size) {

	var out = [];
	for(var i = 0; i < size; i++) {
		out.push(Math.random() * 2 - 1);
	}
	return out;

};

},{}],5:[function(require,module,exports){
(function() {
	var proto = Object.create(HTMLElement.prototype);

	var defaultWidth = 200;
	var defaultHeight = 100;

	function renderWaveData(canvas, buffer) {
		var ctx = canvas.getContext('2d');
		var canvasWidth = canvas.width;
		var canvasHeight = canvas.height;
		var canvasHalfHeight = canvasHeight * 0.5;
		var bufferLength = buffer.length;
		
		ctx.lineWidth = 1;
		ctx.strokeStyle = 'rgb(0, 255, 0)';
		ctx.beginPath();
		var sliceWidth = canvasWidth * 1.0 / bufferLength;
		var x = 0;
		for(var i = 0; i < bufferLength; i++) {
			var v = 1 - buffer[i];
			var y = v * canvasHalfHeight;
			if(i === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
			x += sliceWidth;
		}
		ctx.lineTo(canvasWidth, canvasHalfHeight);
		ctx.stroke();
	}

	proto.createdCallback = function() {
		var canvas = document.createElement('canvas');
		canvas.width = defaultWidth;
		canvas.height = defaultHeight;
		this.canvas = canvas;
		this.context = canvas.getContext('2d');
		this.appendChild(canvas);

		this.resetCanvas(this.context);

	};

	proto.attachTo = function(analyser) {
		console.log('attached to analyser node', analyser);

		var bufferLength = analyser.frequencyBinCount;
		var resultsArray = new Float32Array(bufferLength);
		var self = this;

		animate();

		function animate() {

			requestAnimationFrame(animate);

			analyser.getFloatTimeDomainData(resultsArray);

			self.resetCanvas();
			renderWaveData(self.canvas, resultsArray);
			
		}

	};

	proto.resetCanvas = function() {
		var ctx = this.context;
		var canvas = this.canvas;

		ctx.fillStyle = 'rgba(0, 50, 0, 1)';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	};

	//

	var component = {};
	component.prototype = proto;
	component.register = function(name) {
		document.registerElement(name, {
			prototype: proto
		});
	};

	if(typeof define === 'function' && define.amd) {
		define(function() { return component; });
	} else if(typeof module !== 'undefined' && module.exports) {
		module.exports = component;
	} else {
		component.register('openmusic-oscilloscope'); // automatic registration
	}

}).call(this);


},{}],6:[function(require,module,exports){
(function() {
	// Ideally it would be better to extend the HTMLInputElement prototype but
	// it doesn't seem to be working and I don't get any distinct element at all
	// or I get an "TypeError: 'type' setter called on an object that does not implement interface HTMLInputElement."
	// ... so using just HTMLElement for now
	var proto = Object.create(HTMLElement.prototype);

	proto.createdCallback = function() {
	
		var slider = document.createElement('input');
		slider.type = 'range';

		var valueSpan = document.createElement('span');

		this._slider = slider;
		this._valueSpan = valueSpan;

		this.appendChild(slider);
		this.appendChild(valueSpan);

		var self = this;
		slider.addEventListener('input', function() {
			updateDisplay(self);
		});

		Object.defineProperty(this, 'value', {
			get: function() {
				return slider.value;
			},
			set: function(v) {
				slider.value = v;
				updateDisplay(self);
			}
		});

	};

	var sliderAttributes = [ 'min', 'max', 'value', 'step' ];

	proto.attachedCallback = function() {

		var attrs = this.attributes;
	
		for(var i = 0; i < attrs.length; i++) {
			var attr = attrs[i];
			// Just sending sensible attributes to the slider itself
			if(sliderAttributes.indexOf(attr.name) !== -1) {
				this._slider.setAttribute(attr.name, attr.value);
			}
		}

		updateDisplay(this);

	};

	function updateDisplay(compo) {
		compo._valueSpan.innerHTML = compo._slider.value;
	}

	//

	var component = {};
	component.prototype = proto;
	component.register = function(name) {
		document.registerElement(name, {
			prototype: proto
		});
	};

	if(typeof define === 'function' && define.amd) {
		define(function() { return component; });
	} else if(typeof module !== 'undefined' && module.exports) {
		module.exports = component;
	} else {
		component.register('openmusic-slider'); // automatic registration
	}

}).call(this);



},{}]},{},[1])