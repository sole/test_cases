(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"openmusic-white-noise":4}],2:[function(require,module,exports){
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


},{}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
module.exports = function(size) {

	var out = [];
	for(var i = 0; i < size; i++) {
		out.push(Math.random() * 2 - 1);
	}
	return out;

};

},{}],5:[function(require,module,exports){
// var EventDispatcher = require('eventdispatcher.js');

function ADSR(audioContext, param, attack, decay, sustain, release) {

	'use strict';

	var that = this;
	var values = {};

	//EventDispatcher.call(this);

	setParams({
		attack: attack,
		decay: decay,
		sustain: sustain,
		release: release
	});

	['attack', 'decay', 'sustain', 'release'].forEach(function(param) {
		Object.defineProperty(that, param, {
			get: makeGetter(param),
			set: makeSetter(param),
			enumerable: true
		});
	});

	//

	function makeGetter(param) {
		return function() {
			return values[param];
		};
	}

	function makeSetter(param) {
		var paramChanged = param + '_changed';
		return function(v) {
			values[param] = v;
//			that.dispatchEvent({ type: paramChanged, value: v });
		};
	}

	function setParams(params) {
		values.attack = params.attack !== undefined ? params.attack : 0.0;
		values.decay = params.decay !== undefined ? params.decay : 0.02;
		values.sustain = params.sustain !== undefined ? params.sustain : 0.5;
		values.release = params.release !== undefined ? params.release : 0.10;
	}
	
	// ~~~
	
	this.setParams = setParams;

	this.beginAttack = function(when) {
		when = when !== undefined ? when : audioContext.currentTime;
		
		var now = when;

		param.cancelScheduledValues(now);
		param.setValueAtTime(0, now);
		param.linearRampToValueAtTime(1, now + this.attack);
		param.linearRampToValueAtTime(this.sustain, now + this.attack + this.decay);
	};

	this.beginRelease = function(when) {
		
		when = when !== undefined ? when : audioContext.currentTime;
		var now = when;

		// this seemed to be too abrupt
		//param.cancelScheduledValues(now);

		param.linearRampToValueAtTime(0, now + this.release);
		//param.setTargetAtTime(0, now + this.release, 0.2);
		//^^^TODO not sure which one I prefer best
		
	};

}

module.exports = ADSR;


},{}],6:[function(require,module,exports){
function DeviceInfo() {
	return {
		// We're interested in the total browser window size,
		// not caring about whether devtools are open or not
		width: window.outerWidth,
		height: window.outerHeight,
		hasWebAudio: !! (window.AudioContext)
	};
}

module.exports = DeviceInfo;

},{}],7:[function(require,module,exports){
module.exports = function copyFunctions(origin, destination) {
	for(var k in origin) {
		var thing = origin[k];
		if(typeof(thing) === 'function') {
			destination[k] = thing;
		}
	}	
};

},{}],8:[function(require,module,exports){
require('openmusic-oscilloscope').register('openmusic-oscilloscope');

var info = require('./DeviceInfo')();
var SeaWave = require('./instruments/SeaWave');

console.log('hey there', info);

var oscilloscope = document.createElement('openmusic-oscilloscope');
document.body.appendChild(oscilloscope);

document.body.appendChild(document.createTextNode(JSON.stringify(info)));


var ac = new AudioContext();
var sw = SeaWave(ac);
var analyser = ac.createAnalyser();

oscilloscope.attachTo(analyser);

sw.connect(analyser);
analyser.connect(ac.destination);

document.getElementById('trigger').addEventListener('click', noteOn);
var pushButton = document.getElementById('pushbutton');

pushButton.addEventListener('mousedown', noteOn);
pushButton.addEventListener('mouseup', noteOff);

function noteOn() {
	sw.noteOn(44, 0.5);
}

function noteOff() {
	sw.noteOff(44);
}

},{"./DeviceInfo":6,"./instruments/SeaWave":10,"openmusic-oscilloscope":2}],9:[function(require,module,exports){
var copyFunctions = require('../copyFunctions');

function Instrument(ac) {

	var node = ac.createGain();
	
	copyFunctions(Instrument.prototype, node);

	return node;
	
}

Instrument.prototype.noteOn = function(noteNumber, velocity, when) {
	console.info('instrument noteON', noteNumber, velocity, when);
};

Instrument.prototype.noteOff = function(noteNumber, when) {
	console.info('instrument noteOFF', noteNumber, velocity, when);
};


module.exports = Instrument;

},{"../copyFunctions":7}],10:[function(require,module,exports){
var Instrument = require('./Instrument');
var copyFunctions = require('../copyFunctions');
var makeBuffer = require('../makeBuffer');
var ADSR = require('../ADSR');
var generateWhiteNoise = require('openmusic-white-noise');
var generateBrownNoise = require('openmusic-brown-noise');
var SamplePlayer = require('openmusic-sample-player');

function SeaWave(ac) {

	var node = Instrument(ac);
	
	var noiseLength = ac.sampleRate * 3;
	var noiseLeft = generateWhiteNoise(noiseLength);
	var noiseRight = generateWhiteNoise(noiseLength);
	var samplePlayer = SamplePlayer(ac);

	samplePlayer.buffer = makeBuffer({ context: ac, data: [ noiseLeft, noiseRight ], channels: 2 });
	samplePlayer.loop = true;
	samplePlayer.loopStart = 0;
	samplePlayer.loopEnd = 1;
	
	// Extra gain to control the volume of the noise loop;
	// we'll leave the outer gain node alone
	var gain = ac.createGain();
	var gainADSR = new ADSR(ac, gain.gain, 1, 1, 0.05, 1);

	samplePlayer.connect(gain);

	gain.connect(node);

	node.samplePlayer = samplePlayer;
	node.gainADSR = gainADSR;

	copyFunctions(SeaWave.prototype, node);
	
	return node;

}

SeaWave.prototype = Object.create(Instrument.prototype);

SeaWave.prototype.noteOn = function(noteNumber, velocity, when) {
	console.log('SeaWave note on', noteNumber, velocity, when);
	this.samplePlayer.start(when);
	this.gainADSR.beginAttack(when);
};

SeaWave.prototype.noteOff = function(noteNumber, when) {
	console.log('SeaWave note off', noteNumber, when);
	this.gainADSR.beginRelease(when);
	//this.samplePlayer.stop(when + this.gainADSR.release);
};

module.exports = SeaWave;

},{"../ADSR":5,"../copyFunctions":7,"../makeBuffer":11,"./Instrument":9,"openmusic-brown-noise":1,"openmusic-sample-player":3,"openmusic-white-noise":4}],11:[function(require,module,exports){
module.exports = function(options) {
	console.log(options);
	var context = options.context;
	var channels = options.channels !== undefined ? options.channels : 1;
	var sampleRate = options.sampleRate !== undefined ? options.sampleRate : context.sampleRate;
	var channelsData = channels === 1 ? [ options.data ] : options.data;
	var length = channels === 1 ? options.data.length : options.data[0].length;

	var buffer = context.createBuffer(channels, length, sampleRate);

	channelsData.forEach(function(channelData, channelIndex) {
		console.log('copying data for channel', channelIndex);
		console.log(channelData);
		var bufferChannelData = buffer.getChannelData(channelIndex);
		channelData.forEach(function(sample, i) {
			bufferChannelData[i] = sample;
		});
	});

	return buffer;
	
};

},{}]},{},[8])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9zb2xlL3BkYXRhL21hY2NoaW5hX2luZmluaXR5L25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9zb2xlL3BkYXRhL21hY2NoaW5hX2luZmluaXR5L25vZGVfbW9kdWxlcy9vcGVubXVzaWMtYnJvd24tbm9pc2UvaW5kZXguanMiLCIvVXNlcnMvc29sZS9wZGF0YS9tYWNjaGluYV9pbmZpbml0eS9ub2RlX21vZHVsZXMvb3Blbm11c2ljLW9zY2lsbG9zY29wZS9Pc2NpbGxvc2NvcGUuanMiLCIvVXNlcnMvc29sZS9wZGF0YS9tYWNjaGluYV9pbmZpbml0eS9ub2RlX21vZHVsZXMvb3Blbm11c2ljLXNhbXBsZS1wbGF5ZXIvaW5kZXguanMiLCIvVXNlcnMvc29sZS9wZGF0YS9tYWNjaGluYV9pbmZpbml0eS9ub2RlX21vZHVsZXMvb3Blbm11c2ljLXdoaXRlLW5vaXNlL2luZGV4LmpzIiwiL1VzZXJzL3NvbGUvcGRhdGEvbWFjY2hpbmFfaW5maW5pdHkvc3JjL2pzL0FEU1IuanMiLCIvVXNlcnMvc29sZS9wZGF0YS9tYWNjaGluYV9pbmZpbml0eS9zcmMvanMvRGV2aWNlSW5mby5qcyIsIi9Vc2Vycy9zb2xlL3BkYXRhL21hY2NoaW5hX2luZmluaXR5L3NyYy9qcy9jb3B5RnVuY3Rpb25zLmpzIiwiL1VzZXJzL3NvbGUvcGRhdGEvbWFjY2hpbmFfaW5maW5pdHkvc3JjL2pzL2Zha2VfMmU2ZWY3M2IuanMiLCIvVXNlcnMvc29sZS9wZGF0YS9tYWNjaGluYV9pbmZpbml0eS9zcmMvanMvaW5zdHJ1bWVudHMvSW5zdHJ1bWVudC5qcyIsIi9Vc2Vycy9zb2xlL3BkYXRhL21hY2NoaW5hX2luZmluaXR5L3NyYy9qcy9pbnN0cnVtZW50cy9TZWFXYXZlLmpzIiwiL1VzZXJzL3NvbGUvcGRhdGEvbWFjY2hpbmFfaW5maW5pdHkvc3JjL2pzL21ha2VCdWZmZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBnZW5lcmF0ZVdoaXRlTm9pc2UgPSByZXF1aXJlKCdvcGVubXVzaWMtd2hpdGUtbm9pc2UnKTtcblxuLy8gQWRhcHRlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS96YWNoYXJ5ZGVudG9uL25vaXNlLmpzL2Jsb2IvbWFzdGVyL25vaXNlLmpzXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNpemUpIHtcblxuXHR2YXIgb3V0ID0gZ2VuZXJhdGVXaGl0ZU5vaXNlKHNpemUpO1xuXHR2YXIgbGFzdE91dHB1dCA9IDAuMDtcblxuXHRmb3IodmFyIGkgPSAwOyBpIDwgc2l6ZTsgaSsrKSB7XG5cblx0XHR2YXIgd2hpdGUgPSBvdXRbaV07XG5cdFx0b3V0W2ldID0gKGxhc3RPdXRwdXQgKyAoMC4wMiAqIHdoaXRlKSkgLyAxLjAyO1xuXHRcdGxhc3RPdXRwdXQgPSBvdXRbaV07XG5cdFx0b3V0W2ldICo9IDMuNTsgLy8gKHJvdWdobHkpIGNvbXBlbnNhdGUgZm9yIGdhaW5cblx0XHRcblx0fVxuXG5cdHJldHVybiBvdXQ7XG5cdFxufTtcbiIsIihmdW5jdGlvbigpIHtcblx0dmFyIHByb3RvID0gT2JqZWN0LmNyZWF0ZShIVE1MRWxlbWVudC5wcm90b3R5cGUpO1xuXG5cdHZhciBkZWZhdWx0V2lkdGggPSAyMDA7XG5cdHZhciBkZWZhdWx0SGVpZ2h0ID0gMTAwO1xuXG5cdGZ1bmN0aW9uIHJlbmRlcldhdmVEYXRhKGNhbnZhcywgYnVmZmVyKSB7XG5cdFx0dmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdHZhciBjYW52YXNXaWR0aCA9IGNhbnZhcy53aWR0aDtcblx0XHR2YXIgY2FudmFzSGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcblx0XHR2YXIgY2FudmFzSGFsZkhlaWdodCA9IGNhbnZhc0hlaWdodCAqIDAuNTtcblx0XHR2YXIgYnVmZmVyTGVuZ3RoID0gYnVmZmVyLmxlbmd0aDtcblx0XHRcblx0XHRjdHgubGluZVdpZHRoID0gMTtcblx0XHRjdHguc3Ryb2tlU3R5bGUgPSAncmdiKDAsIDI1NSwgMCknO1xuXHRcdGN0eC5iZWdpblBhdGgoKTtcblx0XHR2YXIgc2xpY2VXaWR0aCA9IGNhbnZhc1dpZHRoICogMS4wIC8gYnVmZmVyTGVuZ3RoO1xuXHRcdHZhciB4ID0gMDtcblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgYnVmZmVyTGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciB2ID0gMSAtIGJ1ZmZlcltpXTtcblx0XHRcdHZhciB5ID0gdiAqIGNhbnZhc0hhbGZIZWlnaHQ7XG5cdFx0XHRpZihpID09PSAwKSB7XG5cdFx0XHRcdGN0eC5tb3ZlVG8oeCwgeSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjdHgubGluZVRvKHgsIHkpO1xuXHRcdFx0fVxuXHRcdFx0eCArPSBzbGljZVdpZHRoO1xuXHRcdH1cblx0XHRjdHgubGluZVRvKGNhbnZhc1dpZHRoLCBjYW52YXNIYWxmSGVpZ2h0KTtcblx0XHRjdHguc3Ryb2tlKCk7XG5cdH1cblxuXHRwcm90by5jcmVhdGVkQ2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0Y2FudmFzLndpZHRoID0gZGVmYXVsdFdpZHRoO1xuXHRcdGNhbnZhcy5oZWlnaHQgPSBkZWZhdWx0SGVpZ2h0O1xuXHRcdHRoaXMuY2FudmFzID0gY2FudmFzO1xuXHRcdHRoaXMuY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXHRcdHRoaXMuYXBwZW5kQ2hpbGQoY2FudmFzKTtcblxuXHRcdHRoaXMucmVzZXRDYW52YXModGhpcy5jb250ZXh0KTtcblxuXHR9O1xuXG5cdHByb3RvLmF0dGFjaFRvID0gZnVuY3Rpb24oYW5hbHlzZXIpIHtcblx0XHRjb25zb2xlLmxvZygnYXR0YWNoZWQgdG8gYW5hbHlzZXIgbm9kZScsIGFuYWx5c2VyKTtcblxuXHRcdHZhciBidWZmZXJMZW5ndGggPSBhbmFseXNlci5mcmVxdWVuY3lCaW5Db3VudDtcblx0XHR2YXIgcmVzdWx0c0FycmF5ID0gbmV3IEZsb2F0MzJBcnJheShidWZmZXJMZW5ndGgpO1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdGFuaW1hdGUoKTtcblxuXHRcdGZ1bmN0aW9uIGFuaW1hdGUoKSB7XG5cblx0XHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZShhbmltYXRlKTtcblxuXHRcdFx0YW5hbHlzZXIuZ2V0RmxvYXRUaW1lRG9tYWluRGF0YShyZXN1bHRzQXJyYXkpO1xuXG5cdFx0XHRzZWxmLnJlc2V0Q2FudmFzKCk7XG5cdFx0XHRyZW5kZXJXYXZlRGF0YShzZWxmLmNhbnZhcywgcmVzdWx0c0FycmF5KTtcblx0XHRcdFxuXHRcdH1cblxuXHR9O1xuXG5cdHByb3RvLnJlc2V0Q2FudmFzID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGN0eCA9IHRoaXMuY29udGV4dDtcblx0XHR2YXIgY2FudmFzID0gdGhpcy5jYW52YXM7XG5cblx0XHRjdHguZmlsbFN0eWxlID0gJ3JnYmEoMCwgNTAsIDAsIDEpJztcblx0XHRjdHguZmlsbFJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcblx0fTtcblxuXHQvL1xuXG5cdHZhciBjb21wb25lbnQgPSB7fTtcblx0Y29tcG9uZW50LnByb3RvdHlwZSA9IHByb3RvO1xuXHRjb21wb25lbnQucmVnaXN0ZXIgPSBmdW5jdGlvbihuYW1lKSB7XG5cdFx0ZG9jdW1lbnQucmVnaXN0ZXJFbGVtZW50KG5hbWUsIHtcblx0XHRcdHByb3RvdHlwZTogcHJvdG9cblx0XHR9KTtcblx0fTtcblxuXHRpZih0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcblx0XHRkZWZpbmUoZnVuY3Rpb24oKSB7IHJldHVybiBjb21wb25lbnQ7IH0pO1xuXHR9IGVsc2UgaWYodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGNvbXBvbmVudDtcblx0fSBlbHNlIHtcblx0XHRjb21wb25lbnQucmVnaXN0ZXIoJ29wZW5tdXNpYy1vc2NpbGxvc2NvcGUnKTsgLy8gYXV0b21hdGljIHJlZ2lzdHJhdGlvblxuXHR9XG5cbn0pLmNhbGwodGhpcyk7XG5cbiIsImZ1bmN0aW9uIFNhbXBsZVBsYXllcihjb250ZXh0KSB7XG5cdHZhciBub2RlID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG5cdHZhciBidWZmZXJTb3VyY2U7XG5cdHZhciBidWZmZXJTb3VyY2VQcm9wZXJ0aWVzID0ge307XG5cblx0WydidWZmZXInLCAnbG9vcCcsICdsb29wU3RhcnQnLCAnbG9vcEVuZCddLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShub2RlLCBuYW1lLCBtYWtlQnVmZmVyU291cmNlR2V0dGVyU2V0dGVyKG5hbWUpKTtcblx0fSk7XG5cblx0Ly8gVE9ETzogcGxheWJhY2tSYXRlIHdoaWNoIG5lZWRzIHRvIGJlIGFuIEF1ZGlvUGFyYW1cblxuXHRub2RlLnN0YXJ0ID0gZnVuY3Rpb24od2hlbiwgb2Zmc2V0LCBkdXJhdGlvbikge1xuXHRcdC8vIGNvbnNvbGUubG9nKCdzdGFydCcsICd3aGVuJywgd2hlbiwgJ29mZnNldCcsIG9mZnNldCwgJ2R1cmF0aW9uJywgZHVyYXRpb24pO1xuXG5cdFx0dmFyIGJ1ZmZlciA9IGJ1ZmZlclNvdXJjZVByb3BlcnRpZXNbJ2J1ZmZlciddO1xuXHRcdGlmKCFidWZmZXIpIHtcblx0XHRcdGNvbnNvbGUuaW5mbygnbm8gYnVmZmVyIHRvIHBsYXkgc28gYnllZWUnKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR3aGVuID0gd2hlbiAhPT0gdW5kZWZpbmVkID8gd2hlbiA6IDA7XG5cdFx0b2Zmc2V0ID0gb2Zmc2V0ICE9PSB1bmRlZmluZWQgPyBvZmZzZXQgOiAwO1xuXHRcdFxuXHRcdC8vIFRPRE8gVGhpcyBpcyBtZWdhIHVnbHkgYnV0IHVyZ2ggd2hhdCBpcyBnb2luZyBvbiB1cmdoXG5cdFx0Ly8gaWYgSSBqdXN0IHBhc3MgJ3VuZGVmaW5lZCcgYXMgZHVyYXRpb24gQ2hyb21lIGRvZXNuJ3QgcGxheSBhbnl0aGluZ1xuXHRcdGlmKHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdjb3JyZWN0aW5nIGZvciBjaHJvbWUgYWdoaCcpO1xuXHRcdFx0dmFyIHNhbXBsZUxlbmd0aCA9IGJ1ZmZlci5sZW5ndGg7XG5cdFx0XHRkdXJhdGlvbiA9IGR1cmF0aW9uICE9PSB1bmRlZmluZWQgPyBkdXJhdGlvbiA6IHNhbXBsZUxlbmd0aCAtIG9mZnNldDtcblx0XHR9XG5cblx0XHQvLyBEaXNjb25uZWN0IGlmIGV4aXN0aW5nLCByZW1vdmUgZXZlbnRzIGxpc3RlbmVyc1xuXHRcdGlmKGJ1ZmZlclNvdXJjZSkge1xuXHRcdFx0YnVmZmVyU291cmNlLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgb25FbmRlZCk7XG5cdFx0XHRidWZmZXJTb3VyY2UuZGlzY29ubmVjdChub2RlKTtcblx0XHRcdGJ1ZmZlclNvdXJjZSA9IG51bGw7XG5cdFx0fVxuXG5cdFx0aW5pdGlhbGlzZUJ1ZmZlclNvdXJjZSgpO1xuXG5cdFx0YnVmZmVyU291cmNlLnN0YXJ0KHdoZW4sIG9mZnNldCwgZHVyYXRpb24pO1xuXG5cdH07XG5cblx0bm9kZS5zdG9wID0gZnVuY3Rpb24od2hlbikge1xuXHRcdGJ1ZmZlclNvdXJjZS5zdG9wKHdoZW4pO1xuXHR9O1xuXG5cdG5vZGUuY2FuY2VsU2NoZWR1bGVkRXZlbnRzID0gZnVuY3Rpb24od2hlbikge1xuXHRcdC8vIFRPRE86IHdoZW4gdGhlcmUgaXMgYXV0b21hdGlvblxuXHR9O1xuXG5cdGZ1bmN0aW9uIGluaXRpYWxpc2VCdWZmZXJTb3VyY2UoKSB7XG5cdFx0XG5cdFx0YnVmZmVyU291cmNlID0gY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcblx0XHRidWZmZXJTb3VyY2UuYWRkRXZlbnRMaXN0ZW5lcignZW5kZWQnLCBvbkVuZGVkKTtcblx0XHRidWZmZXJTb3VyY2UuY29ubmVjdChub2RlKTtcblxuXHRcdE9iamVjdC5rZXlzKGJ1ZmZlclNvdXJjZVByb3BlcnRpZXMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuXHRcdFx0YnVmZmVyU291cmNlW25hbWVdID0gYnVmZmVyU291cmNlUHJvcGVydGllc1tuYW1lXTtcblx0XHR9KTtcblxuXHR9XG5cblx0ZnVuY3Rpb24gb25FbmRlZChlKSB7XG5cdFx0dmFyIHQgPSBlLnRhcmdldDtcblx0XHR0LmRpc2Nvbm5lY3Qobm9kZSk7XG5cdFx0aW5pdGlhbGlzZUJ1ZmZlclNvdXJjZSgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gbWFrZUJ1ZmZlclNvdXJjZUdldHRlclNldHRlcihwcm9wZXJ0eSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRnZXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gZ2V0QnVmZmVyU291cmNlUHJvcGVydHkocHJvcGVydHkpO1xuXHRcdFx0fSxcblx0XHRcdHNldDogZnVuY3Rpb24odikge1xuXHRcdFx0XHRzZXRCdWZmZXJTb3VyY2VQcm9wZXJ0eShwcm9wZXJ0eSwgdik7XG5cdFx0XHR9LFxuXHRcdFx0ZW51bWVyYWJsZTogdHJ1ZVxuXHRcdH07XG5cdH1cblxuXHRmdW5jdGlvbiBnZXRCdWZmZXJTb3VyY2VQcm9wZXJ0eShuYW1lKSB7XG5cdFx0cmV0dXJuIGJ1ZmZlclNvdXJjZVByb3BlcnRpZXNbbmFtZV07XG5cdH1cblxuXHRmdW5jdGlvbiBzZXRCdWZmZXJTb3VyY2VQcm9wZXJ0eShuYW1lLCB2YWx1ZSkge1xuXG5cdFx0YnVmZmVyU291cmNlUHJvcGVydGllc1tuYW1lXSA9IHZhbHVlO1xuXG5cdFx0aWYoYnVmZmVyU291cmNlKSB7XG5cdFx0XHRidWZmZXJTb3VyY2VbbmFtZV0gPSB2YWx1ZTtcblx0XHR9XG5cblx0fVxuXG5cdHJldHVybiBub2RlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNhbXBsZVBsYXllcjtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2l6ZSkge1xuXG5cdHZhciBvdXQgPSBbXTtcblx0Zm9yKHZhciBpID0gMDsgaSA8IHNpemU7IGkrKykge1xuXHRcdG91dC5wdXNoKE1hdGgucmFuZG9tKCkgKiAyIC0gMSk7XG5cdH1cblx0cmV0dXJuIG91dDtcblxufTtcbiIsIi8vIHZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCdldmVudGRpc3BhdGNoZXIuanMnKTtcblxuZnVuY3Rpb24gQURTUihhdWRpb0NvbnRleHQsIHBhcmFtLCBhdHRhY2ssIGRlY2F5LCBzdXN0YWluLCByZWxlYXNlKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciB0aGF0ID0gdGhpcztcblx0dmFyIHZhbHVlcyA9IHt9O1xuXG5cdC8vRXZlbnREaXNwYXRjaGVyLmNhbGwodGhpcyk7XG5cblx0c2V0UGFyYW1zKHtcblx0XHRhdHRhY2s6IGF0dGFjayxcblx0XHRkZWNheTogZGVjYXksXG5cdFx0c3VzdGFpbjogc3VzdGFpbixcblx0XHRyZWxlYXNlOiByZWxlYXNlXG5cdH0pO1xuXG5cdFsnYXR0YWNrJywgJ2RlY2F5JywgJ3N1c3RhaW4nLCAncmVsZWFzZSddLmZvckVhY2goZnVuY3Rpb24ocGFyYW0pIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhhdCwgcGFyYW0sIHtcblx0XHRcdGdldDogbWFrZUdldHRlcihwYXJhbSksXG5cdFx0XHRzZXQ6IG1ha2VTZXR0ZXIocGFyYW0pLFxuXHRcdFx0ZW51bWVyYWJsZTogdHJ1ZVxuXHRcdH0pO1xuXHR9KTtcblxuXHQvL1xuXG5cdGZ1bmN0aW9uIG1ha2VHZXR0ZXIocGFyYW0pIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdmFsdWVzW3BhcmFtXTtcblx0XHR9O1xuXHR9XG5cblx0ZnVuY3Rpb24gbWFrZVNldHRlcihwYXJhbSkge1xuXHRcdHZhciBwYXJhbUNoYW5nZWQgPSBwYXJhbSArICdfY2hhbmdlZCc7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKHYpIHtcblx0XHRcdHZhbHVlc1twYXJhbV0gPSB2O1xuLy9cdFx0XHR0aGF0LmRpc3BhdGNoRXZlbnQoeyB0eXBlOiBwYXJhbUNoYW5nZWQsIHZhbHVlOiB2IH0pO1xuXHRcdH07XG5cdH1cblxuXHRmdW5jdGlvbiBzZXRQYXJhbXMocGFyYW1zKSB7XG5cdFx0dmFsdWVzLmF0dGFjayA9IHBhcmFtcy5hdHRhY2sgIT09IHVuZGVmaW5lZCA/IHBhcmFtcy5hdHRhY2sgOiAwLjA7XG5cdFx0dmFsdWVzLmRlY2F5ID0gcGFyYW1zLmRlY2F5ICE9PSB1bmRlZmluZWQgPyBwYXJhbXMuZGVjYXkgOiAwLjAyO1xuXHRcdHZhbHVlcy5zdXN0YWluID0gcGFyYW1zLnN1c3RhaW4gIT09IHVuZGVmaW5lZCA/IHBhcmFtcy5zdXN0YWluIDogMC41O1xuXHRcdHZhbHVlcy5yZWxlYXNlID0gcGFyYW1zLnJlbGVhc2UgIT09IHVuZGVmaW5lZCA/IHBhcmFtcy5yZWxlYXNlIDogMC4xMDtcblx0fVxuXHRcblx0Ly8gfn5+XG5cdFxuXHR0aGlzLnNldFBhcmFtcyA9IHNldFBhcmFtcztcblxuXHR0aGlzLmJlZ2luQXR0YWNrID0gZnVuY3Rpb24od2hlbikge1xuXHRcdHdoZW4gPSB3aGVuICE9PSB1bmRlZmluZWQgPyB3aGVuIDogYXVkaW9Db250ZXh0LmN1cnJlbnRUaW1lO1xuXHRcdFxuXHRcdHZhciBub3cgPSB3aGVuO1xuXG5cdFx0cGFyYW0uY2FuY2VsU2NoZWR1bGVkVmFsdWVzKG5vdyk7XG5cdFx0cGFyYW0uc2V0VmFsdWVBdFRpbWUoMCwgbm93KTtcblx0XHRwYXJhbS5saW5lYXJSYW1wVG9WYWx1ZUF0VGltZSgxLCBub3cgKyB0aGlzLmF0dGFjayk7XG5cdFx0cGFyYW0ubGluZWFyUmFtcFRvVmFsdWVBdFRpbWUodGhpcy5zdXN0YWluLCBub3cgKyB0aGlzLmF0dGFjayArIHRoaXMuZGVjYXkpO1xuXHR9O1xuXG5cdHRoaXMuYmVnaW5SZWxlYXNlID0gZnVuY3Rpb24od2hlbikge1xuXHRcdFxuXHRcdHdoZW4gPSB3aGVuICE9PSB1bmRlZmluZWQgPyB3aGVuIDogYXVkaW9Db250ZXh0LmN1cnJlbnRUaW1lO1xuXHRcdHZhciBub3cgPSB3aGVuO1xuXG5cdFx0Ly8gdGhpcyBzZWVtZWQgdG8gYmUgdG9vIGFicnVwdFxuXHRcdC8vcGFyYW0uY2FuY2VsU2NoZWR1bGVkVmFsdWVzKG5vdyk7XG5cblx0XHRwYXJhbS5saW5lYXJSYW1wVG9WYWx1ZUF0VGltZSgwLCBub3cgKyB0aGlzLnJlbGVhc2UpO1xuXHRcdC8vcGFyYW0uc2V0VGFyZ2V0QXRUaW1lKDAsIG5vdyArIHRoaXMucmVsZWFzZSwgMC4yKTtcblx0XHQvL15eXlRPRE8gbm90IHN1cmUgd2hpY2ggb25lIEkgcHJlZmVyIGJlc3Rcblx0XHRcblx0fTtcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEFEU1I7XG5cbiIsImZ1bmN0aW9uIERldmljZUluZm8oKSB7XG5cdHJldHVybiB7XG5cdFx0Ly8gV2UncmUgaW50ZXJlc3RlZCBpbiB0aGUgdG90YWwgYnJvd3NlciB3aW5kb3cgc2l6ZSxcblx0XHQvLyBub3QgY2FyaW5nIGFib3V0IHdoZXRoZXIgZGV2dG9vbHMgYXJlIG9wZW4gb3Igbm90XG5cdFx0d2lkdGg6IHdpbmRvdy5vdXRlcldpZHRoLFxuXHRcdGhlaWdodDogd2luZG93Lm91dGVySGVpZ2h0LFxuXHRcdGhhc1dlYkF1ZGlvOiAhISAod2luZG93LkF1ZGlvQ29udGV4dClcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBEZXZpY2VJbmZvO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjb3B5RnVuY3Rpb25zKG9yaWdpbiwgZGVzdGluYXRpb24pIHtcblx0Zm9yKHZhciBrIGluIG9yaWdpbikge1xuXHRcdHZhciB0aGluZyA9IG9yaWdpbltrXTtcblx0XHRpZih0eXBlb2YodGhpbmcpID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRkZXN0aW5hdGlvbltrXSA9IHRoaW5nO1xuXHRcdH1cblx0fVx0XG59O1xuIiwicmVxdWlyZSgnb3Blbm11c2ljLW9zY2lsbG9zY29wZScpLnJlZ2lzdGVyKCdvcGVubXVzaWMtb3NjaWxsb3Njb3BlJyk7XG5cbnZhciBpbmZvID0gcmVxdWlyZSgnLi9EZXZpY2VJbmZvJykoKTtcbnZhciBTZWFXYXZlID0gcmVxdWlyZSgnLi9pbnN0cnVtZW50cy9TZWFXYXZlJyk7XG5cbmNvbnNvbGUubG9nKCdoZXkgdGhlcmUnLCBpbmZvKTtcblxudmFyIG9zY2lsbG9zY29wZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29wZW5tdXNpYy1vc2NpbGxvc2NvcGUnKTtcbmRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQob3NjaWxsb3Njb3BlKTtcblxuZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShKU09OLnN0cmluZ2lmeShpbmZvKSkpO1xuXG5cbnZhciBhYyA9IG5ldyBBdWRpb0NvbnRleHQoKTtcbnZhciBzdyA9IFNlYVdhdmUoYWMpO1xudmFyIGFuYWx5c2VyID0gYWMuY3JlYXRlQW5hbHlzZXIoKTtcblxub3NjaWxsb3Njb3BlLmF0dGFjaFRvKGFuYWx5c2VyKTtcblxuc3cuY29ubmVjdChhbmFseXNlcik7XG5hbmFseXNlci5jb25uZWN0KGFjLmRlc3RpbmF0aW9uKTtcblxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RyaWdnZXInKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIG5vdGVPbik7XG52YXIgcHVzaEJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwdXNoYnV0dG9uJyk7XG5cbnB1c2hCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgbm90ZU9uKTtcbnB1c2hCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIG5vdGVPZmYpO1xuXG5mdW5jdGlvbiBub3RlT24oKSB7XG5cdHN3Lm5vdGVPbig0NCwgMC41KTtcbn1cblxuZnVuY3Rpb24gbm90ZU9mZigpIHtcblx0c3cubm90ZU9mZig0NCk7XG59XG4iLCJ2YXIgY29weUZ1bmN0aW9ucyA9IHJlcXVpcmUoJy4uL2NvcHlGdW5jdGlvbnMnKTtcblxuZnVuY3Rpb24gSW5zdHJ1bWVudChhYykge1xuXG5cdHZhciBub2RlID0gYWMuY3JlYXRlR2FpbigpO1xuXHRcblx0Y29weUZ1bmN0aW9ucyhJbnN0cnVtZW50LnByb3RvdHlwZSwgbm9kZSk7XG5cblx0cmV0dXJuIG5vZGU7XG5cdFxufVxuXG5JbnN0cnVtZW50LnByb3RvdHlwZS5ub3RlT24gPSBmdW5jdGlvbihub3RlTnVtYmVyLCB2ZWxvY2l0eSwgd2hlbikge1xuXHRjb25zb2xlLmluZm8oJ2luc3RydW1lbnQgbm90ZU9OJywgbm90ZU51bWJlciwgdmVsb2NpdHksIHdoZW4pO1xufTtcblxuSW5zdHJ1bWVudC5wcm90b3R5cGUubm90ZU9mZiA9IGZ1bmN0aW9uKG5vdGVOdW1iZXIsIHdoZW4pIHtcblx0Y29uc29sZS5pbmZvKCdpbnN0cnVtZW50IG5vdGVPRkYnLCBub3RlTnVtYmVyLCB2ZWxvY2l0eSwgd2hlbik7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gSW5zdHJ1bWVudDtcbiIsInZhciBJbnN0cnVtZW50ID0gcmVxdWlyZSgnLi9JbnN0cnVtZW50Jyk7XG52YXIgY29weUZ1bmN0aW9ucyA9IHJlcXVpcmUoJy4uL2NvcHlGdW5jdGlvbnMnKTtcbnZhciBtYWtlQnVmZmVyID0gcmVxdWlyZSgnLi4vbWFrZUJ1ZmZlcicpO1xudmFyIEFEU1IgPSByZXF1aXJlKCcuLi9BRFNSJyk7XG52YXIgZ2VuZXJhdGVXaGl0ZU5vaXNlID0gcmVxdWlyZSgnb3Blbm11c2ljLXdoaXRlLW5vaXNlJyk7XG52YXIgZ2VuZXJhdGVCcm93bk5vaXNlID0gcmVxdWlyZSgnb3Blbm11c2ljLWJyb3duLW5vaXNlJyk7XG52YXIgU2FtcGxlUGxheWVyID0gcmVxdWlyZSgnb3Blbm11c2ljLXNhbXBsZS1wbGF5ZXInKTtcblxuZnVuY3Rpb24gU2VhV2F2ZShhYykge1xuXG5cdHZhciBub2RlID0gSW5zdHJ1bWVudChhYyk7XG5cdFxuXHR2YXIgbm9pc2VMZW5ndGggPSBhYy5zYW1wbGVSYXRlICogMztcblx0dmFyIG5vaXNlTGVmdCA9IGdlbmVyYXRlV2hpdGVOb2lzZShub2lzZUxlbmd0aCk7XG5cdHZhciBub2lzZVJpZ2h0ID0gZ2VuZXJhdGVXaGl0ZU5vaXNlKG5vaXNlTGVuZ3RoKTtcblx0dmFyIHNhbXBsZVBsYXllciA9IFNhbXBsZVBsYXllcihhYyk7XG5cblx0c2FtcGxlUGxheWVyLmJ1ZmZlciA9IG1ha2VCdWZmZXIoeyBjb250ZXh0OiBhYywgZGF0YTogWyBub2lzZUxlZnQsIG5vaXNlUmlnaHQgXSwgY2hhbm5lbHM6IDIgfSk7XG5cdHNhbXBsZVBsYXllci5sb29wID0gdHJ1ZTtcblx0c2FtcGxlUGxheWVyLmxvb3BTdGFydCA9IDA7XG5cdHNhbXBsZVBsYXllci5sb29wRW5kID0gMTtcblx0XG5cdC8vIEV4dHJhIGdhaW4gdG8gY29udHJvbCB0aGUgdm9sdW1lIG9mIHRoZSBub2lzZSBsb29wO1xuXHQvLyB3ZSdsbCBsZWF2ZSB0aGUgb3V0ZXIgZ2FpbiBub2RlIGFsb25lXG5cdHZhciBnYWluID0gYWMuY3JlYXRlR2FpbigpO1xuXHR2YXIgZ2FpbkFEU1IgPSBuZXcgQURTUihhYywgZ2Fpbi5nYWluLCAxLCAxLCAwLjA1LCAxKTtcblxuXHRzYW1wbGVQbGF5ZXIuY29ubmVjdChnYWluKTtcblxuXHRnYWluLmNvbm5lY3Qobm9kZSk7XG5cblx0bm9kZS5zYW1wbGVQbGF5ZXIgPSBzYW1wbGVQbGF5ZXI7XG5cdG5vZGUuZ2FpbkFEU1IgPSBnYWluQURTUjtcblxuXHRjb3B5RnVuY3Rpb25zKFNlYVdhdmUucHJvdG90eXBlLCBub2RlKTtcblx0XG5cdHJldHVybiBub2RlO1xuXG59XG5cblNlYVdhdmUucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShJbnN0cnVtZW50LnByb3RvdHlwZSk7XG5cblNlYVdhdmUucHJvdG90eXBlLm5vdGVPbiA9IGZ1bmN0aW9uKG5vdGVOdW1iZXIsIHZlbG9jaXR5LCB3aGVuKSB7XG5cdGNvbnNvbGUubG9nKCdTZWFXYXZlIG5vdGUgb24nLCBub3RlTnVtYmVyLCB2ZWxvY2l0eSwgd2hlbik7XG5cdHRoaXMuc2FtcGxlUGxheWVyLnN0YXJ0KHdoZW4pO1xuXHR0aGlzLmdhaW5BRFNSLmJlZ2luQXR0YWNrKHdoZW4pO1xufTtcblxuU2VhV2F2ZS5wcm90b3R5cGUubm90ZU9mZiA9IGZ1bmN0aW9uKG5vdGVOdW1iZXIsIHdoZW4pIHtcblx0Y29uc29sZS5sb2coJ1NlYVdhdmUgbm90ZSBvZmYnLCBub3RlTnVtYmVyLCB3aGVuKTtcblx0dGhpcy5nYWluQURTUi5iZWdpblJlbGVhc2Uod2hlbik7XG5cdC8vdGhpcy5zYW1wbGVQbGF5ZXIuc3RvcCh3aGVuICsgdGhpcy5nYWluQURTUi5yZWxlYXNlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU2VhV2F2ZTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHRjb25zb2xlLmxvZyhvcHRpb25zKTtcblx0dmFyIGNvbnRleHQgPSBvcHRpb25zLmNvbnRleHQ7XG5cdHZhciBjaGFubmVscyA9IG9wdGlvbnMuY2hhbm5lbHMgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMuY2hhbm5lbHMgOiAxO1xuXHR2YXIgc2FtcGxlUmF0ZSA9IG9wdGlvbnMuc2FtcGxlUmF0ZSAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5zYW1wbGVSYXRlIDogY29udGV4dC5zYW1wbGVSYXRlO1xuXHR2YXIgY2hhbm5lbHNEYXRhID0gY2hhbm5lbHMgPT09IDEgPyBbIG9wdGlvbnMuZGF0YSBdIDogb3B0aW9ucy5kYXRhO1xuXHR2YXIgbGVuZ3RoID0gY2hhbm5lbHMgPT09IDEgPyBvcHRpb25zLmRhdGEubGVuZ3RoIDogb3B0aW9ucy5kYXRhWzBdLmxlbmd0aDtcblxuXHR2YXIgYnVmZmVyID0gY29udGV4dC5jcmVhdGVCdWZmZXIoY2hhbm5lbHMsIGxlbmd0aCwgc2FtcGxlUmF0ZSk7XG5cblx0Y2hhbm5lbHNEYXRhLmZvckVhY2goZnVuY3Rpb24oY2hhbm5lbERhdGEsIGNoYW5uZWxJbmRleCkge1xuXHRcdGNvbnNvbGUubG9nKCdjb3B5aW5nIGRhdGEgZm9yIGNoYW5uZWwnLCBjaGFubmVsSW5kZXgpO1xuXHRcdGNvbnNvbGUubG9nKGNoYW5uZWxEYXRhKTtcblx0XHR2YXIgYnVmZmVyQ2hhbm5lbERhdGEgPSBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoY2hhbm5lbEluZGV4KTtcblx0XHRjaGFubmVsRGF0YS5mb3JFYWNoKGZ1bmN0aW9uKHNhbXBsZSwgaSkge1xuXHRcdFx0YnVmZmVyQ2hhbm5lbERhdGFbaV0gPSBzYW1wbGU7XG5cdFx0fSk7XG5cdH0pO1xuXG5cdHJldHVybiBidWZmZXI7XG5cdFxufTtcbiJdfQ==
