(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
require('webcomponents-lite');
require('openmusic-oscilloscope').register('openmusic-oscilloscope');
require('openmusic-transport').register('openmusic-transport');
require('../').register('openmusic-drum-machine-ui');

var ac = new AudioContext();
var masterVolume = ac.createGain();
masterVolume.gain.value = 0.05;
masterVolume.connect(ac.destination);

var limiter = ac.createDynamicsCompressor();
limiter.connect(masterVolume);

var analyser = ac.createAnalyser();
var oscilloscope = document.querySelector('openmusic-oscilloscope');
oscilloscope.attachTo(analyser);

analyser.connect(limiter);

var DrumMachine = require('openmusic-drum-machine');
var drumMachineNode = DrumMachine(ac);
drumMachineNode.connect(analyser);

var drumMachineElement = document.querySelector('openmusic-drum-machine-ui');

drumMachineNode.ready().then(function() {
	drumMachineElement.attachTo(drumMachineNode);
}).catch(function(horror) {
	console.error('OMG', horror);
});

var transport = document.querySelector('openmusic-transport');
transport.addEventListener('play', function() {
	drumMachineNode.start();
});

transport.addEventListener('stop', function() {
	drumMachineNode.stop();
});

transport.addEventListener('bpm', function(ev) {
	drumMachineNode.bpm = ev.detail.value;
});


},{"../":2,"openmusic-drum-machine":8,"openmusic-oscilloscope":12,"openmusic-transport":13,"webcomponents-lite":16}],2:[function(require,module,exports){
(function() {
	var proto = Object.create(HTMLElement.prototype);
	
	proto.createdCallback = function() {
		
		this.values = {};
		this.attachedNode = null;

		// making web components MWC framework proof.
		this.innerHTML = '';

		var div = document.createElement('div');
		// Current pattern [ 001 ] < > [ + ] [ - ] // <-- Not for this iteration
		// Pattern
		// Drum       x o
		// Snare      x o
		// Closed Hat x o ...
		// step       . O . ....
		div.innerHTML = 'Drum Machine';
		this.appendChild(div);
		
		this.readAttributes();
		
	};

	
	proto.attachedCallback = function() {
		// Setup input listeners, perhaps start requestAnimationFrame here
	};


	proto.detachedCallback = function() {
	};


	proto.readAttributes = function() {
		var that = this;
		[].forEach(function(attr) {
			that.setValue(attr, that.getAttribute(attr));		
		});
	};

	
	proto.setValue = function(name, value) {

		if(value !== undefined && value !== null) {
			this.values[name] = value;
		}

		// TODO: Potential re-draw or DOM update in reaction to these values
	};


	proto.getValue = function(name) {
		return this.values[name];
	};

	
	proto.attributeChangedCallback = function(attr, oldValue, newValue, namespace) {
		
		this.setValue(attr, newValue);
		
		// var e = new CustomEvent('change', { detail: this.values } });
		// this.dispatchEvent(e);
		
	};


	proto.attachTo = function(audioNode) {

		var that = this;

		audioNode.addEventListener('step', function(e) {
			var step = e.detail.value;
			that._highlightStep(step);
		});

		this.attachedNode = audioNode;

		this.setupDOM();
		
	};

	proto.setupDOM = function() {
		var dm = this.attachedNode;
		
		if(dm === null) {
			return;
		}

		var numSteps = dm.steps;
		var numTracks = dm.tracks;
		
		if(numTracks === 0) {
			console.error('No tracks in the machine-perhaps you did not use ready()?');
		}

		this.innerHTML = '';

		var matrix = this._makeMatrix(numSteps, numTracks);
		this._matrixTable = matrix.table;
		this._matrixInputs = matrix.inputs;
		this.appendChild(matrix.table);

		this._readCurrentPattern();

	};


	proto._makeMatrix = function(numSteps, numTracks) {
		var inputs = [];
		var table = document.createElement('table');
		var onInput = onPatternCellInput.bind(this);
		for(var i = 0; i < numTracks; i++) {
			var row = table.insertRow();
			var inputRow = [];
			for(var j = 0; j < numSteps; j++) {
				var cell = row.insertCell();
				cell.classList.add('step' + j);
				var checkbox = document.createElement('input');
				checkbox.type = 'checkbox';
				checkbox.dataset.track = i;
				checkbox.dataset.step = j;
				checkbox.addEventListener('change', onInput);
				cell.appendChild(checkbox);
				inputRow.push(checkbox);
			}
			inputs.push(inputRow);
		}
		return { table: table, inputs: inputs };
	};


	function onPatternCellInput(ev) {
		var target = ev.target;
		var track = target.dataset.track;
		var step = target.dataset.step;
		var trigger = target.checked ? 1 : 0;
		
		this._setPatternStep(track, step, trigger);
	}


	proto._highlightStep = function(step) {
		var classToHighlight = 'step' + step;
		var highlightClass = 'highlight';
		var existingHighlight = this.querySelectorAll('[class*=' + highlightClass + ']');
		for(var i = 0; i < existingHighlight.length; i++) {
			var el = existingHighlight[i];
			el.classList.remove(highlightClass);
		}

		var toHighlight = this.querySelectorAll('[class=' + classToHighlight + ']');
		for(var j = 0; j < toHighlight.length; j++) {
			var el2 = toHighlight[j];
			el2.classList.add(highlightClass);
		}
	};


	proto._readCurrentPattern = function() {
		
		var inputs = this._matrixInputs;
		var pattern = this.attachedNode.currentPattern;
		pattern.forEach(function(track, i) {
			var trackInputs = inputs[i];
			for(var j = 0; j < track.length; j++) {
				var trigger = track[j];
				var input = trackInputs[j];
				input.checked = (trigger === 1);
			}
		});
		
	};


	proto._setPatternStep = function(track, step, trigger) {
		this.attachedNode.setStep(track, step, trigger);
		this._readCurrentPattern();
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
		component.register('openmusic-drum-machine-ui'); // automatic registration
	}

}).call(this);


},{}],3:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff
var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  this.length = 0
  this.parent = undefined

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined' && object.buffer instanceof ArrayBuffer) {
    return fromTypedArray(that, object)
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
    that._isBuffer = true
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = String(string)

  if (string.length === 0) return 0

  switch (encoding || 'utf8') {
    case 'ascii':
    case 'binary':
    case 'raw':
      return string.length
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return string.length * 2
    case 'hex':
      return string.length >>> 1
    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(string).length
    case 'base64':
      return base64ToBytes(string).length
    default:
      return string.length
  }
}
Buffer.byteLength = byteLength

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function toString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), targetStart)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z\-]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []
  var i = 0

  for (; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (leadSurrogate) {
        // 2 leads in a row
        if (codePoint < 0xDC00) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          leadSurrogate = codePoint
          continue
        } else {
          // valid surrogate pair
          codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
          leadSurrogate = null
        }
      } else {
        // no lead yet

        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else {
          // valid lead
          leadSurrogate = codePoint
          continue
        }
      }
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
      leadSurrogate = null
    }

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x200000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

},{"base64-js":4,"ieee754":5,"is-array":6}],4:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],5:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],6:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],7:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],8:[function(require,module,exports){
(function (Buffer){

var setterGetterify = require('setter-getterify');
var SamplePlayer = require('openmusic-sample-player');
var Promise = require('es6-promise').Promise;

module.exports = function(context) {

	var node = context.createGain();
	var nodeProperties = {
		tracks: 0,
		steps: 16,
		resolution: 16, // although it's actually the inverse 1/16
		bpm: 125,
		currentPattern: []
	};

	setterGetterify(node, nodeProperties);

	var patterns = [
		[
			[ 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0 ],
			[ 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0 ],
			[ 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1 ]
		]
	];
	var currentPatternIndex = 0; // TODO not used yet
	var currentStep = 0;
	var stepTime;
	var startTime;
	
	var scheduleTimeout = null;

	var samplePlayers = [];


	// Sigh that we need to do it this way but it's the best we can do with
	// browserify brfs transforms
	var bassDrum = Buffer("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XQFgAWIBZQFnAWsBbQFwAXIBdQF3AXoBfAF/AYABgwGFAYcBigGMAY8BkAGTAZUBlwGZAZsBngGfAaIBowGlAacBqQGrAa0BrwGxAbIBtAG2AbgBuQG7Ab0BvgHAAcEBwgHFAcYBxwHJAcoBzAHNAc4B0AHRAdMB0wHUAdYB1wHZAdkB2gHcAdwB3gHeAd8B4QHhAeIB4wHkAeUB5QHnAecB6AHpAekB6gHqAesB6wHsAe0B7QHuAe4B7wHvAe8B7wHvAfAB8AHwAfAB8QHwAfEB8QHxAfEB8QHxAfEB8QHxAfEB8QHwAfEB8AHwAe8B8AHvAe8B7gHuAe4B7QHtAewB7AHrAesB6gHpAekB6AHoAecB5gHmAeUB5AHkAeIB4gHhAeAB3wHfAd0B3AHcAdoB2QHYAdcB1gHVAdQB0wHRAdABzwHOAc0BzAHKAckBxwHGAcUBxAHCAcEBvwG9AbwBuwG5AbgBtgG0AbIBsQGvAa4BrAGrAakBpwGmAaQBogGgAZ8BnQGbAZkBlwGVAZMBkQGPAY0BiwGJAYcBhQGEAYIBgAF9AXsBeQF3AXUBcwFxAW4BbAFqAWgBZgFjAWEBXwFdAVoBWAFWAVQBUQFPAU0BSgFIAUUBQwFBAT4BPAE5ATcBNQEyATABLQErASgBJQEjASABHgEbARkBFgEUAREBDwEMAQkBBwEEAQIB/wD8APoA9wD1APIA7wDtAOoA5wDlAOIA3wDcANoA1wDUANIAzwDMAMkAxwDEAMIAvwC8ALkAtwC0ALEArgCrAKgApgCjAKAAngCbAJgAlgCTAJAAjQCKAIcAhACCAH8AfAB5AHcAdABxAG8AbABpAGcAZABhAF4AWwBZAFYAUwBQAE4ASwBJAEYAQwBAAD0AOwA4ADYAMwAwAC0AKwAoACUAIwAgAB4AGwAYABYAEwAQAA4ACwAIAAYAAwABAP///P/6//f/9P/y//D/7f/q/+j/5f/j/+D/3v/c/9n/1v/U/9H/z//N/8r/yP/F/8P/wf++/7z/uf+4/7X/s/+w/67/rP+p/6j/pf+j/6H/n/+c/5r/mP+W/5T/kf+P/43/i/+J/4f/hf+D/4D/f/98/3v/eP93/3X/c/9x/2//bf9r/2n/Z/9l/2P/Yv9g/17/XP9b/1j/V/9V/1T/Uv9Q/07/Tf9L/0n/SP9G/0X/Q/9C/0D/Pv88/zv/Of84/zf/Nf80/zL/Mf8v/y7/Lf8r/yr/KP8n/yb/Jf8k/yL/If8g/x7/Hv8c/xv/Gv8Z/xj/F/8W/xT/FP8S/xH/EP8Q/w7/Df8N/wz/Cv8K/wn/CP8H/wb/Bv8F/wT/A/8C/wL/Af8A///+//7+/v7+/f78/vz++/76/vr++v75/vn++P74/vf+9/72/vb+9f71/vX+9f70/vT+9P7z/vP+8/7y/vL+8v7y/vL+8v7x/vH+8f7x/vH+8f7x/vD+8f7x/vH+8P7x/vH+8f7x/vH+8f7x/vH+8f7x/vL+8v7y/vL+8v7z/vP+8/70/vT+9P70/vX+9f72/vb+9v73/vf+9/74/vj++f75/vn++v77/vv++/78/v3+/f7+/v7+//4A/wH/Af8C/wL/A/8D/wT/Bf8G/wb/B/8I/wn/Cf8K/wv/DP8N/w7/D/8P/xD/Ef8S/xP/FP8U/xX/Fv8X/xj/Gf8a/xv/HP8d/x7/H/8g/yH/Iv8j/yT/Jf8m/yf/Kf8p/yv/LP8t/y7/L/8w/zH/Mv80/zX/Nv83/zn/Ov87/zz/Pf8//0D/Qf9C/0P/Rf9G/0f/SP9K/0v/TP9N/0//UP9R/1P/VP9V/1f/WP9Z/1r/XP9d/1//YP9h/2L/ZP9l/2f/aP9p/2v/bP9t/2//cP9y/3P/dP92/3f/ef96/3v/ff9+/3//gf+C/4T/hf+H/4j/if+L/4z/jv+P/5D/kv+T/5X/lv+X/5n/mv+c/53/nv+g/6L/o/+k/6b/p/+p/6r/q/+t/67/sP+x/7L/tP+1/7b/uP+5/7v/vP+9/7//wP/C/8P/xP/G/8f/yf/K/8v/zf/O/8//0f/S/9P/1f/W/9f/2f/a/9z/3f/e/9//4f/i/+P/5P/m/+f/6P/q/+v/7P/t/+//8P/x//P/9P/1//b/9//5//r/+//8//7///8AAAEAAgADAAQABQAGAAgACQAKAAsADAANAA4AEAAQABIAEwAUABUAFgAXABgAGQAaABsAHAAdAB4AHwAgACEAIgAjACQAJQAmACcAKAApACoAKwAsAC0ALQAuAC8AMAAxADIAMwAzADQANQA2ADcAOAA4ADkAOgA7ADwAPAA9AD4APwA/AEAAQQBBAEIAQwBDAEQARQBGAEYARwBHAEgASQBJAEoASgBLAEwATABNAE0ATgBOAE8ATwBQAFAAUQBRAFIAUgBTAFMAVABUAFQAVQBVAFYAVgBWAFcAVwBXAFgAWABZAFkAWQBaAFoAWgBaAFsAWwBbAFsAXABcAFwAXABdAF0AXQBdAF4AXgBeAF4AXgBeAF8AXwBfAF8AXwBfAF8AXwBfAF8AXwBgAF8AYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAXwBfAF8AXwBfAF8AXwBfAF8AXwBeAF4AXgBeAF4AXgBeAF0AXQBdAF0AXQBdAFwAXABcAFwAWwBbAFsAWwBaAFoAWgBaAFoAWQBZAFkAWABYAFgAVwBXAFcAVwBWAFYAVgBVAFUAVABUAFQAVABTAFMAUgBSAFIAUQBRAFAAUABQAE8ATwBOAE4ATgBNAE0ATABMAEwASwBLAEoASgBJAEkASQBIAEgARwBHAEYARgBFAEUARABEAEMAQwBDAEIAQgBBAEEAQABAAD8APwA+AD4APQA9ADwAPAA7ADsAOgA6ADkAOQA4ADgANwA3ADYANgA1ADUANAA0ADMAMwAyADIAMQAwADAAMAAvAC8ALgAtAC0ALQAsACsAKwAqACoAKQApACkAKAAoACcAJwAmACYAJQAkACQAJAAjACMAIgAiACEAIQAgACAAHwAfAB4AHgAdAB0AHAAcABwAGwAbABoAGgAZABkAGAAYABgAFwAXABYAFgAVABUAFQAUABQAEwATABMAEgASABEAEQARABAAEAAQAA8ADwAOAA4ADgANAA0ADQAMAAwADAALAAsACwAKAAoACgAKAAkACQAJAAgACAAIAAgABwAHAAcABgAGAAYABgAFAAUABQAFAAUABAAEAAQABAAEAAMAAwADAAMAAwACAAIAAgACAAIAAgACAAEAAQABAAEAAQABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==","base64");
	var clap = Buffer("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4P4K/x//NP9W/3f/pf/c/wQAEgApAFYAgACzAO8AJQFZAW0BTQExARABAAH5AM8AmwCKAHYAVQAzACcAEgDx/+X/0v/G/8T/tP+j/5n/mP+X/6P/vf/W//X/JgBiAG4AVgBRAGwAeABvAIEAqQDPANsA4QDvAA4BOQFLAUIBKgEGAd0A0QDgAM8AowCCAFYAKQAKAOn/zv+v/5//pf+d/57/nf+z/+v/LgBgAGkAbwBvAHkAgwB4AG8AZQBHABQA2/+k/47/kv+C/3X/d/9+/5T/m/+z/9H//f9JAIMAnQCxAN4AAwEDAd0AyQDAANMA7wDhALwAjQBdADoAKgAwAC4ANgBbAHMAfQCAAJAAsgDhAPcA6QDNAKgAiAB4AIoAlwCQAJgAoACbAIYAfACHAJEAgABaADUAIQAFAOP/t/+D/1r/Mv8N/wL/Ff8v/z7/RP9B/1D/b/+d/8n/7/8uAIMA4gAjAWQBmQGVAXoBVwE4AQoB0wCXAFcAJAD4/8r/rv+t/6T/nP+S/5T/uf/c/wgAPQBkAIkAsQDVAAEBBQHiAK4AfQByAGAATgBAADsANwAiABUABgARACYAJAAyAE0AYQBsAGUAWwBTAF4AfACPAKkAuQC3ALMAtwC+ALUAnACBAG8AeQB1AF0ATwBEACQA9//i/8n/sv+h/5T/hf+A/4T/hv+R/6r/xf/U/93/3f/i/wEALQBYAHAAfQCiANEA/wAXARIBBwH9ANQAmQBrAFoAYABVADcAPQBLAFkAaABlAF4ATgAvAA0A8v/h/9j/4//x/wwAJQA0AEkAVgBUAEkARABKAGEAcACAAIYAgwCLAJkAowC8AOIA8ADsAN0AtQCHAGYAaABWADAAEQDw/9D/wv+1/7H/wP/a//L/+/8bAB8AFwAdADcAVQBMAEcAPgBAAE4APQA6AD4ANgA0ABsA/f/+//n/2v+x/5j/lv+h/7P/xP/k/wgAOwBgAG4AeQCbAMoA7gAYAUQBZAFiAVABNAESAd8AnwB1AFAAJwAKAO3/2v/a//P/CAAAAO3/4v/X/9n/1v/r/yYAWwCUAMcA/wAgASMBIwEJAeQAsQB7AE4AIgADAOX/1P/K/7r/qv+g/63/yf/g//P/BQAsAF0AeACIAIAAggCVAJwAlACHAIcAgwCPAKMAoACPAHgAXwA0AAkABQAVACEAHAAdABsA/P/f/8z/w//J/9L/4P/p/+b/5//1/wwAEgAaAC0AMAA0ADoAUABqAG8AaQB/AJgArQDTAPAA+gD4AO8A4QDpAOcA1ADXAOIA5gDnAO8A8wDVAK0AegA6AAcA9//b/7f/tP+y/7D/qP+Y/33/dP+E/4z/n/+6/8v/z//i/xAAMABYAG4AWgBMAFEAaQCIAJEAlQCPAHwAdwBzAIkAuQDYAOIA3wDiAMoAkwBsAE0ATABfAGYAdQByAGsAbQBvAF8ASgA6ACYADgD4/9X/uP+n/6L/pf+l/7v/4f8CABkAEgDz/+L/6v/y//D/6f/7/wgADAAXACQAIAAPAA0AEwAZABgALQA2AEUAXwB1AHkAhACRAJwAogCtANAA8AAHAfYA2wDQAMcAtQCaAIQAcwByAHEAUQATAM3/oP+E/3D/Vf9V/2X/gP+t/9T/7//6//j/7v/j/9P/2v/5/xMAOwB3AKQAugDKAPQADAEkAV8BqgHxARoCIwIFAswBdgEUAbQAXAAhAOn/t/+e/4//gv91/2P/UP9I/0P/SP9Y/3T/jf+Z/67/vP+//83/4v/v//n/CAAiADoAXwCLALEAxAC+AK0AowCUAH4AcgB+AIQAcABbAFwAXwBTAFkAagCEAJAAewBjAEkAMgAhABAACQAFAB4ANABJAFkAUABFADoAMgAqACUAIQALAP7/AAAQADAASwBTAD0ALQAnACUAIwAlADEARgBYAGYAdgCEAJ0AnwCRAH8AcQBgAEwAPgA4ADYAGwD0/8r/sP+j/57/rf+t/7H/uP/L/97/6v/8//r/6//j/+j/4f/a/93/3v/q/wEAHwA/AG4AnwDGAPYACAEPARgBHgEvAToBPgE/AT8BHQHmAK0AeQBOACgAGAAIAP3/+P/e/7//qv+e/5b/hf96/3b/d/+B/4f/fv96/4P/lf+w/8X/2v/z/wcAHgAsADMARABUAGcAhwC+APAACgEuAVkBYwFIASEB9wDaAMQAtACRAFUAHgDy/9L/sv+V/4v/hf+H/4j/jf+c/6j/tv/M/+X/9/8IABgAIwAmACsAMgAzADgANwA5AEAAPgA4AC4AJQAoAEMAaQCGAJIAnACtAKEAjgB+AHMAbQBjAFsASwA2ABsABQDv/+P/1v+8/7T/r/+n/6T/qf+0/8r/8/8MABEAHwA0AFUAZwBZAEAAIwAJAPv/7v/n/+j/7//+/wcAEwAfADIARwBfAHIAegB7AH0AigCeAKwArwC0ALEAngCKAHgAbQBhAEsAOQAsACgAMwA8ADYAIQASAA4ADQAJAAAA7//o/+X/6P/i/87/v/+5/8L/1P/p/wIAFgAkACoAIAAgACgAIQAhACwAOwBHAEsATABTAFoAVAA+ACsAJAAgAB8AHQAgACgAOQBIAE8AVQBpAHUAdAB4AHYAcwBsAGAAUwA7ACUAEwD8/+z/3f/Q/8H/sv+o/6T/o/+o/7D/uP++/8P/yf/R/9//7/8HACUAPgBWAHUAjQCVAKAAnwCWAI8AfgBwAF8ASwA+ADIAKgAfABsAEgAKAAcA/v/3//L/9P/5//v/9v/w//X//P8DAA0AFgAeACEAIwAjABwAGgAdABkAHgAlACMAIgAmACMAHAAeACcAOQBJAE0ASgBIAEIAMwAjABIAAwD2/+r/4v/g/+j/9v8EABIAHgAoACkAJAAkACcALwA2AD4ARQBIAE8ATABKAEYAPwA+ADcALgAmACUAIgAfAB8AGwAdAB4AHgAcABMAAgD2/+3/5P/b/9L/zf/L/8n/yv/P/9r/5P/r//X/AAAOABoAIwAxAD0ARgBRAFoAYABiAFwASwA7ADcALwAmACMAHgATAAoAAADy/+f/4P/b/9j/2v/g/+H/5f/y/wIAEQAfACsAOgBJAFYAYwBmAGIAWABPAEIANgAsACAAGQAZABYAEgANAAAA8v/m/+D/3f/a/9j/2f/e/+f/7P/t//D/9v/8/wEACQAVAB8AMABHAFgAYQBqAHEAcQBqAGEAWABSAEwAOwAkABQACQD///T/6v/g/9n/1//a/97/4f/j/+X/6//t/+n/5v/n/+n/7v/z//v/AgAIAA4AFQAXABgAHgAgACMAKgAvAC4AJgAgABgADwAJAAQA///5//X/8v/v/+7/8P/y//b/+f/7/wAABwAKAAsADAAKAAcABQAHAA4AFQAWABcAFwAbACAAJQAoACYAJAAkACIAHwAZABUAEQALAAQAAAABAAUACQAKAAoACQAIAAgABgAGAAgABwAGAAUAAQD///z/+v/4//j/+f/6//v///8CAAYACAAJAAoADgARABQAFgAWABMAEAANAAkABwAFAAIAAAAAAAAA///9//3//v////7//f/8//z//P/8//z//v8AAAEAAwAEAAUABwAKAAwADQAMAAwACgAJAAgABgAEAAIAAQAAAP/////////////+//7//v/+//7/////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAA=","base64");
	var closedHat = Buffer("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","base64");

	var samples = [
		bassDrum,
		clap,
		closedHat
	];

	// Makes sure the machine is ready to play
	node.ready = function() {
		var samplesLoaded = [];
		
		// disconnect existing samplers just in case
		samplePlayers.forEach(function(s) {
			s.disconnect();
		});

		// dump them, and let's start again
		samplePlayers = [];
		
		samples.forEach(function(sample, index) {
			var samplePlayer = new SamplePlayer(context);
			var arrayBuffer = sample.toArrayBuffer();
		
			samplePlayers.push(samplePlayer);
			samplePlayer.connect(node);
		
			var sampleLoaded = new Promise(function(resolve, reject) {
				context.decodeAudioData(arrayBuffer, function(buffer) {
					samplePlayer.buffer = buffer;
					resolve(buffer);
				}, function(err) {
					reject(err);
				});
			});

			samplesLoaded.push(sampleLoaded);
		});

		// Kinda hacks for the time being
		nodeProperties.currentPattern = patterns[currentPatternIndex];
		nodeProperties.tracks = samplePlayers.length;
		
		return Promise.all(samplesLoaded);
	};

	node.start = function() {
		stepTime = 0.0;
		startTime = context.currentTime + 0.005;
		samplePlayers.forEach(function(sampler) {
			sampler.stop();
		});
		schedule();
	};

	node.stop = function(when) {
		clearTimeout(scheduleTimeout);
	};

	node.cancelScheduledEvents = function(when) {
		// TODO cancel scheduled events on the 'child' sample players
	};

	node.setStep = function(track, step, trigger) {
		var currentPattern = this.currentPattern;
		currentPattern[track][step] = trigger;
	};

	function schedule() {
		
		var currentPattern = patterns[currentPatternIndex];
		var numTracks = samplePlayers.length;

		var currentTime = context.currentTime;

		currentTime -= startTime;

		// TODO also why 0.2
		while(stepTime < currentTime + 0.2) {

			var contextPlayTime = stepTime + startTime;

			for(var track = 0; track < numTracks; track++) {
				var sampler = samplePlayers[track];
				var trigger = currentPattern[track][currentStep];
				if(trigger) {
					sampler.start(contextPlayTime);
				}
			}

			var oldStep = currentStep;
			advanceStep();

			// Dispatch event for drawing if step != oldStep
			if(oldStep !== currentStep) {
				var ev = new CustomEvent('step', { detail: { value: currentStep } });
				node.dispatchEvent(ev);
			}
		}

		// TODO: Chris's example has the timeout at 0 but it seems excessive?
		scheduleTimeout = setTimeout(schedule, 10);

	}

	function advanceStep() {
		
		// Advance time by a 16th note...
	    var secondsPerBeat = 60.0 / nodeProperties.bpm;
		
		currentStep++;

		if(currentStep === nodeProperties.steps) {
			currentStep = 0;
		}

		// TODO something something swing which I'm ignoring
		// TODO also why 0.25 - maybe because it's a black note so 1/4 of bar?
		stepTime += 0.25 * secondsPerBeat;

	}

	return node;

};


}).call(this,require("buffer").Buffer)

},{"buffer":3,"es6-promise":9,"openmusic-sample-player":10,"setter-getterify":11}],9:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/jakearchibald/es6-promise/master/LICENSE
 * @version   2.1.1
 */

(function() {
    "use strict";
    function lib$es6$promise$utils$$objectOrFunction(x) {
      return typeof x === 'function' || (typeof x === 'object' && x !== null);
    }

    function lib$es6$promise$utils$$isFunction(x) {
      return typeof x === 'function';
    }

    function lib$es6$promise$utils$$isMaybeThenable(x) {
      return typeof x === 'object' && x !== null;
    }

    var lib$es6$promise$utils$$_isArray;
    if (!Array.isArray) {
      lib$es6$promise$utils$$_isArray = function (x) {
        return Object.prototype.toString.call(x) === '[object Array]';
      };
    } else {
      lib$es6$promise$utils$$_isArray = Array.isArray;
    }

    var lib$es6$promise$utils$$isArray = lib$es6$promise$utils$$_isArray;
    var lib$es6$promise$asap$$len = 0;
    var lib$es6$promise$asap$$toString = {}.toString;
    var lib$es6$promise$asap$$vertxNext;
    function lib$es6$promise$asap$$asap(callback, arg) {
      lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len] = callback;
      lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len + 1] = arg;
      lib$es6$promise$asap$$len += 2;
      if (lib$es6$promise$asap$$len === 2) {
        // If len is 2, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        lib$es6$promise$asap$$scheduleFlush();
      }
    }

    var lib$es6$promise$asap$$default = lib$es6$promise$asap$$asap;

    var lib$es6$promise$asap$$browserWindow = (typeof window !== 'undefined') ? window : undefined;
    var lib$es6$promise$asap$$browserGlobal = lib$es6$promise$asap$$browserWindow || {};
    var lib$es6$promise$asap$$BrowserMutationObserver = lib$es6$promise$asap$$browserGlobal.MutationObserver || lib$es6$promise$asap$$browserGlobal.WebKitMutationObserver;
    var lib$es6$promise$asap$$isNode = typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

    // test for web worker but not in IE10
    var lib$es6$promise$asap$$isWorker = typeof Uint8ClampedArray !== 'undefined' &&
      typeof importScripts !== 'undefined' &&
      typeof MessageChannel !== 'undefined';

    // node
    function lib$es6$promise$asap$$useNextTick() {
      var nextTick = process.nextTick;
      // node version 0.10.x displays a deprecation warning when nextTick is used recursively
      // setImmediate should be used instead instead
      var version = process.versions.node.match(/^(?:(\d+)\.)?(?:(\d+)\.)?(\*|\d+)$/);
      if (Array.isArray(version) && version[1] === '0' && version[2] === '10') {
        nextTick = setImmediate;
      }
      return function() {
        nextTick(lib$es6$promise$asap$$flush);
      };
    }

    // vertx
    function lib$es6$promise$asap$$useVertxTimer() {
      return function() {
        lib$es6$promise$asap$$vertxNext(lib$es6$promise$asap$$flush);
      };
    }

    function lib$es6$promise$asap$$useMutationObserver() {
      var iterations = 0;
      var observer = new lib$es6$promise$asap$$BrowserMutationObserver(lib$es6$promise$asap$$flush);
      var node = document.createTextNode('');
      observer.observe(node, { characterData: true });

      return function() {
        node.data = (iterations = ++iterations % 2);
      };
    }

    // web worker
    function lib$es6$promise$asap$$useMessageChannel() {
      var channel = new MessageChannel();
      channel.port1.onmessage = lib$es6$promise$asap$$flush;
      return function () {
        channel.port2.postMessage(0);
      };
    }

    function lib$es6$promise$asap$$useSetTimeout() {
      return function() {
        setTimeout(lib$es6$promise$asap$$flush, 1);
      };
    }

    var lib$es6$promise$asap$$queue = new Array(1000);
    function lib$es6$promise$asap$$flush() {
      for (var i = 0; i < lib$es6$promise$asap$$len; i+=2) {
        var callback = lib$es6$promise$asap$$queue[i];
        var arg = lib$es6$promise$asap$$queue[i+1];

        callback(arg);

        lib$es6$promise$asap$$queue[i] = undefined;
        lib$es6$promise$asap$$queue[i+1] = undefined;
      }

      lib$es6$promise$asap$$len = 0;
    }

    function lib$es6$promise$asap$$attemptVertex() {
      try {
        var r = require;
        var vertx = r('vertx');
        lib$es6$promise$asap$$vertxNext = vertx.runOnLoop || vertx.runOnContext;
        return lib$es6$promise$asap$$useVertxTimer();
      } catch(e) {
        return lib$es6$promise$asap$$useSetTimeout();
      }
    }

    var lib$es6$promise$asap$$scheduleFlush;
    // Decide what async method to use to triggering processing of queued callbacks:
    if (lib$es6$promise$asap$$isNode) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useNextTick();
    } else if (lib$es6$promise$asap$$BrowserMutationObserver) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMutationObserver();
    } else if (lib$es6$promise$asap$$isWorker) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMessageChannel();
    } else if (lib$es6$promise$asap$$browserWindow === undefined && typeof require === 'function') {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$attemptVertex();
    } else {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useSetTimeout();
    }

    function lib$es6$promise$$internal$$noop() {}

    var lib$es6$promise$$internal$$PENDING   = void 0;
    var lib$es6$promise$$internal$$FULFILLED = 1;
    var lib$es6$promise$$internal$$REJECTED  = 2;

    var lib$es6$promise$$internal$$GET_THEN_ERROR = new lib$es6$promise$$internal$$ErrorObject();

    function lib$es6$promise$$internal$$selfFullfillment() {
      return new TypeError("You cannot resolve a promise with itself");
    }

    function lib$es6$promise$$internal$$cannotReturnOwn() {
      return new TypeError('A promises callback cannot return that same promise.');
    }

    function lib$es6$promise$$internal$$getThen(promise) {
      try {
        return promise.then;
      } catch(error) {
        lib$es6$promise$$internal$$GET_THEN_ERROR.error = error;
        return lib$es6$promise$$internal$$GET_THEN_ERROR;
      }
    }

    function lib$es6$promise$$internal$$tryThen(then, value, fulfillmentHandler, rejectionHandler) {
      try {
        then.call(value, fulfillmentHandler, rejectionHandler);
      } catch(e) {
        return e;
      }
    }

    function lib$es6$promise$$internal$$handleForeignThenable(promise, thenable, then) {
       lib$es6$promise$asap$$default(function(promise) {
        var sealed = false;
        var error = lib$es6$promise$$internal$$tryThen(then, thenable, function(value) {
          if (sealed) { return; }
          sealed = true;
          if (thenable !== value) {
            lib$es6$promise$$internal$$resolve(promise, value);
          } else {
            lib$es6$promise$$internal$$fulfill(promise, value);
          }
        }, function(reason) {
          if (sealed) { return; }
          sealed = true;

          lib$es6$promise$$internal$$reject(promise, reason);
        }, 'Settle: ' + (promise._label || ' unknown promise'));

        if (!sealed && error) {
          sealed = true;
          lib$es6$promise$$internal$$reject(promise, error);
        }
      }, promise);
    }

    function lib$es6$promise$$internal$$handleOwnThenable(promise, thenable) {
      if (thenable._state === lib$es6$promise$$internal$$FULFILLED) {
        lib$es6$promise$$internal$$fulfill(promise, thenable._result);
      } else if (thenable._state === lib$es6$promise$$internal$$REJECTED) {
        lib$es6$promise$$internal$$reject(promise, thenable._result);
      } else {
        lib$es6$promise$$internal$$subscribe(thenable, undefined, function(value) {
          lib$es6$promise$$internal$$resolve(promise, value);
        }, function(reason) {
          lib$es6$promise$$internal$$reject(promise, reason);
        });
      }
    }

    function lib$es6$promise$$internal$$handleMaybeThenable(promise, maybeThenable) {
      if (maybeThenable.constructor === promise.constructor) {
        lib$es6$promise$$internal$$handleOwnThenable(promise, maybeThenable);
      } else {
        var then = lib$es6$promise$$internal$$getThen(maybeThenable);

        if (then === lib$es6$promise$$internal$$GET_THEN_ERROR) {
          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$GET_THEN_ERROR.error);
        } else if (then === undefined) {
          lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
        } else if (lib$es6$promise$utils$$isFunction(then)) {
          lib$es6$promise$$internal$$handleForeignThenable(promise, maybeThenable, then);
        } else {
          lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
        }
      }
    }

    function lib$es6$promise$$internal$$resolve(promise, value) {
      if (promise === value) {
        lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$selfFullfillment());
      } else if (lib$es6$promise$utils$$objectOrFunction(value)) {
        lib$es6$promise$$internal$$handleMaybeThenable(promise, value);
      } else {
        lib$es6$promise$$internal$$fulfill(promise, value);
      }
    }

    function lib$es6$promise$$internal$$publishRejection(promise) {
      if (promise._onerror) {
        promise._onerror(promise._result);
      }

      lib$es6$promise$$internal$$publish(promise);
    }

    function lib$es6$promise$$internal$$fulfill(promise, value) {
      if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }

      promise._result = value;
      promise._state = lib$es6$promise$$internal$$FULFILLED;

      if (promise._subscribers.length !== 0) {
        lib$es6$promise$asap$$default(lib$es6$promise$$internal$$publish, promise);
      }
    }

    function lib$es6$promise$$internal$$reject(promise, reason) {
      if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }
      promise._state = lib$es6$promise$$internal$$REJECTED;
      promise._result = reason;

      lib$es6$promise$asap$$default(lib$es6$promise$$internal$$publishRejection, promise);
    }

    function lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection) {
      var subscribers = parent._subscribers;
      var length = subscribers.length;

      parent._onerror = null;

      subscribers[length] = child;
      subscribers[length + lib$es6$promise$$internal$$FULFILLED] = onFulfillment;
      subscribers[length + lib$es6$promise$$internal$$REJECTED]  = onRejection;

      if (length === 0 && parent._state) {
        lib$es6$promise$asap$$default(lib$es6$promise$$internal$$publish, parent);
      }
    }

    function lib$es6$promise$$internal$$publish(promise) {
      var subscribers = promise._subscribers;
      var settled = promise._state;

      if (subscribers.length === 0) { return; }

      var child, callback, detail = promise._result;

      for (var i = 0; i < subscribers.length; i += 3) {
        child = subscribers[i];
        callback = subscribers[i + settled];

        if (child) {
          lib$es6$promise$$internal$$invokeCallback(settled, child, callback, detail);
        } else {
          callback(detail);
        }
      }

      promise._subscribers.length = 0;
    }

    function lib$es6$promise$$internal$$ErrorObject() {
      this.error = null;
    }

    var lib$es6$promise$$internal$$TRY_CATCH_ERROR = new lib$es6$promise$$internal$$ErrorObject();

    function lib$es6$promise$$internal$$tryCatch(callback, detail) {
      try {
        return callback(detail);
      } catch(e) {
        lib$es6$promise$$internal$$TRY_CATCH_ERROR.error = e;
        return lib$es6$promise$$internal$$TRY_CATCH_ERROR;
      }
    }

    function lib$es6$promise$$internal$$invokeCallback(settled, promise, callback, detail) {
      var hasCallback = lib$es6$promise$utils$$isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        value = lib$es6$promise$$internal$$tryCatch(callback, detail);

        if (value === lib$es6$promise$$internal$$TRY_CATCH_ERROR) {
          failed = true;
          error = value.error;
          value = null;
        } else {
          succeeded = true;
        }

        if (promise === value) {
          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$cannotReturnOwn());
          return;
        }

      } else {
        value = detail;
        succeeded = true;
      }

      if (promise._state !== lib$es6$promise$$internal$$PENDING) {
        // noop
      } else if (hasCallback && succeeded) {
        lib$es6$promise$$internal$$resolve(promise, value);
      } else if (failed) {
        lib$es6$promise$$internal$$reject(promise, error);
      } else if (settled === lib$es6$promise$$internal$$FULFILLED) {
        lib$es6$promise$$internal$$fulfill(promise, value);
      } else if (settled === lib$es6$promise$$internal$$REJECTED) {
        lib$es6$promise$$internal$$reject(promise, value);
      }
    }

    function lib$es6$promise$$internal$$initializePromise(promise, resolver) {
      try {
        resolver(function resolvePromise(value){
          lib$es6$promise$$internal$$resolve(promise, value);
        }, function rejectPromise(reason) {
          lib$es6$promise$$internal$$reject(promise, reason);
        });
      } catch(e) {
        lib$es6$promise$$internal$$reject(promise, e);
      }
    }

    function lib$es6$promise$enumerator$$Enumerator(Constructor, input) {
      var enumerator = this;

      enumerator._instanceConstructor = Constructor;
      enumerator.promise = new Constructor(lib$es6$promise$$internal$$noop);

      if (enumerator._validateInput(input)) {
        enumerator._input     = input;
        enumerator.length     = input.length;
        enumerator._remaining = input.length;

        enumerator._init();

        if (enumerator.length === 0) {
          lib$es6$promise$$internal$$fulfill(enumerator.promise, enumerator._result);
        } else {
          enumerator.length = enumerator.length || 0;
          enumerator._enumerate();
          if (enumerator._remaining === 0) {
            lib$es6$promise$$internal$$fulfill(enumerator.promise, enumerator._result);
          }
        }
      } else {
        lib$es6$promise$$internal$$reject(enumerator.promise, enumerator._validationError());
      }
    }

    lib$es6$promise$enumerator$$Enumerator.prototype._validateInput = function(input) {
      return lib$es6$promise$utils$$isArray(input);
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._validationError = function() {
      return new Error('Array Methods must be provided an Array');
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._init = function() {
      this._result = new Array(this.length);
    };

    var lib$es6$promise$enumerator$$default = lib$es6$promise$enumerator$$Enumerator;

    lib$es6$promise$enumerator$$Enumerator.prototype._enumerate = function() {
      var enumerator = this;

      var length  = enumerator.length;
      var promise = enumerator.promise;
      var input   = enumerator._input;

      for (var i = 0; promise._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
        enumerator._eachEntry(input[i], i);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._eachEntry = function(entry, i) {
      var enumerator = this;
      var c = enumerator._instanceConstructor;

      if (lib$es6$promise$utils$$isMaybeThenable(entry)) {
        if (entry.constructor === c && entry._state !== lib$es6$promise$$internal$$PENDING) {
          entry._onerror = null;
          enumerator._settledAt(entry._state, i, entry._result);
        } else {
          enumerator._willSettleAt(c.resolve(entry), i);
        }
      } else {
        enumerator._remaining--;
        enumerator._result[i] = entry;
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._settledAt = function(state, i, value) {
      var enumerator = this;
      var promise = enumerator.promise;

      if (promise._state === lib$es6$promise$$internal$$PENDING) {
        enumerator._remaining--;

        if (state === lib$es6$promise$$internal$$REJECTED) {
          lib$es6$promise$$internal$$reject(promise, value);
        } else {
          enumerator._result[i] = value;
        }
      }

      if (enumerator._remaining === 0) {
        lib$es6$promise$$internal$$fulfill(promise, enumerator._result);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._willSettleAt = function(promise, i) {
      var enumerator = this;

      lib$es6$promise$$internal$$subscribe(promise, undefined, function(value) {
        enumerator._settledAt(lib$es6$promise$$internal$$FULFILLED, i, value);
      }, function(reason) {
        enumerator._settledAt(lib$es6$promise$$internal$$REJECTED, i, reason);
      });
    };
    function lib$es6$promise$promise$all$$all(entries) {
      return new lib$es6$promise$enumerator$$default(this, entries).promise;
    }
    var lib$es6$promise$promise$all$$default = lib$es6$promise$promise$all$$all;
    function lib$es6$promise$promise$race$$race(entries) {
      /*jshint validthis:true */
      var Constructor = this;

      var promise = new Constructor(lib$es6$promise$$internal$$noop);

      if (!lib$es6$promise$utils$$isArray(entries)) {
        lib$es6$promise$$internal$$reject(promise, new TypeError('You must pass an array to race.'));
        return promise;
      }

      var length = entries.length;

      function onFulfillment(value) {
        lib$es6$promise$$internal$$resolve(promise, value);
      }

      function onRejection(reason) {
        lib$es6$promise$$internal$$reject(promise, reason);
      }

      for (var i = 0; promise._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
        lib$es6$promise$$internal$$subscribe(Constructor.resolve(entries[i]), undefined, onFulfillment, onRejection);
      }

      return promise;
    }
    var lib$es6$promise$promise$race$$default = lib$es6$promise$promise$race$$race;
    function lib$es6$promise$promise$resolve$$resolve(object) {
      /*jshint validthis:true */
      var Constructor = this;

      if (object && typeof object === 'object' && object.constructor === Constructor) {
        return object;
      }

      var promise = new Constructor(lib$es6$promise$$internal$$noop);
      lib$es6$promise$$internal$$resolve(promise, object);
      return promise;
    }
    var lib$es6$promise$promise$resolve$$default = lib$es6$promise$promise$resolve$$resolve;
    function lib$es6$promise$promise$reject$$reject(reason) {
      /*jshint validthis:true */
      var Constructor = this;
      var promise = new Constructor(lib$es6$promise$$internal$$noop);
      lib$es6$promise$$internal$$reject(promise, reason);
      return promise;
    }
    var lib$es6$promise$promise$reject$$default = lib$es6$promise$promise$reject$$reject;

    var lib$es6$promise$promise$$counter = 0;

    function lib$es6$promise$promise$$needsResolver() {
      throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
    }

    function lib$es6$promise$promise$$needsNew() {
      throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
    }

    var lib$es6$promise$promise$$default = lib$es6$promise$promise$$Promise;
    /**
      Promise objects represent the eventual result of an asynchronous operation. The
      primary way of interacting with a promise is through its `then` method, which
      registers callbacks to receive either a promise’s eventual value or the reason
      why the promise cannot be fulfilled.

      Terminology
      -----------

      - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
      - `thenable` is an object or function that defines a `then` method.
      - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
      - `exception` is a value that is thrown using the throw statement.
      - `reason` is a value that indicates why a promise was rejected.
      - `settled` the final resting state of a promise, fulfilled or rejected.

      A promise can be in one of three states: pending, fulfilled, or rejected.

      Promises that are fulfilled have a fulfillment value and are in the fulfilled
      state.  Promises that are rejected have a rejection reason and are in the
      rejected state.  A fulfillment value is never a thenable.

      Promises can also be said to *resolve* a value.  If this value is also a
      promise, then the original promise's settled state will match the value's
      settled state.  So a promise that *resolves* a promise that rejects will
      itself reject, and a promise that *resolves* a promise that fulfills will
      itself fulfill.


      Basic Usage:
      ------------

      ```js
      var promise = new Promise(function(resolve, reject) {
        // on success
        resolve(value);

        // on failure
        reject(reason);
      });

      promise.then(function(value) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Advanced Usage:
      ---------------

      Promises shine when abstracting away asynchronous interactions such as
      `XMLHttpRequest`s.

      ```js
      function getJSON(url) {
        return new Promise(function(resolve, reject){
          var xhr = new XMLHttpRequest();

          xhr.open('GET', url);
          xhr.onreadystatechange = handler;
          xhr.responseType = 'json';
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.send();

          function handler() {
            if (this.readyState === this.DONE) {
              if (this.status === 200) {
                resolve(this.response);
              } else {
                reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
              }
            }
          };
        });
      }

      getJSON('/posts.json').then(function(json) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Unlike callbacks, promises are great composable primitives.

      ```js
      Promise.all([
        getJSON('/posts'),
        getJSON('/comments')
      ]).then(function(values){
        values[0] // => postsJSON
        values[1] // => commentsJSON

        return values;
      });
      ```

      @class Promise
      @param {function} resolver
      Useful for tooling.
      @constructor
    */
    function lib$es6$promise$promise$$Promise(resolver) {
      this._id = lib$es6$promise$promise$$counter++;
      this._state = undefined;
      this._result = undefined;
      this._subscribers = [];

      if (lib$es6$promise$$internal$$noop !== resolver) {
        if (!lib$es6$promise$utils$$isFunction(resolver)) {
          lib$es6$promise$promise$$needsResolver();
        }

        if (!(this instanceof lib$es6$promise$promise$$Promise)) {
          lib$es6$promise$promise$$needsNew();
        }

        lib$es6$promise$$internal$$initializePromise(this, resolver);
      }
    }

    lib$es6$promise$promise$$Promise.all = lib$es6$promise$promise$all$$default;
    lib$es6$promise$promise$$Promise.race = lib$es6$promise$promise$race$$default;
    lib$es6$promise$promise$$Promise.resolve = lib$es6$promise$promise$resolve$$default;
    lib$es6$promise$promise$$Promise.reject = lib$es6$promise$promise$reject$$default;

    lib$es6$promise$promise$$Promise.prototype = {
      constructor: lib$es6$promise$promise$$Promise,

    /**
      The primary way of interacting with a promise is through its `then` method,
      which registers callbacks to receive either a promise's eventual value or the
      reason why the promise cannot be fulfilled.

      ```js
      findUser().then(function(user){
        // user is available
      }, function(reason){
        // user is unavailable, and you are given the reason why
      });
      ```

      Chaining
      --------

      The return value of `then` is itself a promise.  This second, 'downstream'
      promise is resolved with the return value of the first promise's fulfillment
      or rejection handler, or rejected if the handler throws an exception.

      ```js
      findUser().then(function (user) {
        return user.name;
      }, function (reason) {
        return 'default name';
      }).then(function (userName) {
        // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
        // will be `'default name'`
      });

      findUser().then(function (user) {
        throw new Error('Found user, but still unhappy');
      }, function (reason) {
        throw new Error('`findUser` rejected and we're unhappy');
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
        // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
      });
      ```
      If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.

      ```js
      findUser().then(function (user) {
        throw new PedagogicalException('Upstream error');
      }).then(function (value) {
        // never reached
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // The `PedgagocialException` is propagated all the way down to here
      });
      ```

      Assimilation
      ------------

      Sometimes the value you want to propagate to a downstream promise can only be
      retrieved asynchronously. This can be achieved by returning a promise in the
      fulfillment or rejection handler. The downstream promise will then be pending
      until the returned promise is settled. This is called *assimilation*.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // The user's comments are now available
      });
      ```

      If the assimliated promise rejects, then the downstream promise will also reject.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // If `findCommentsByAuthor` fulfills, we'll have the value here
      }, function (reason) {
        // If `findCommentsByAuthor` rejects, we'll have the reason here
      });
      ```

      Simple Example
      --------------

      Synchronous Example

      ```javascript
      var result;

      try {
        result = findResult();
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js
      findResult(function(result, err){
        if (err) {
          // failure
        } else {
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findResult().then(function(result){
        // success
      }, function(reason){
        // failure
      });
      ```

      Advanced Example
      --------------

      Synchronous Example

      ```javascript
      var author, books;

      try {
        author = findAuthor();
        books  = findBooksByAuthor(author);
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js

      function foundBooks(books) {

      }

      function failure(reason) {

      }

      findAuthor(function(author, err){
        if (err) {
          failure(err);
          // failure
        } else {
          try {
            findBoooksByAuthor(author, function(books, err) {
              if (err) {
                failure(err);
              } else {
                try {
                  foundBooks(books);
                } catch(reason) {
                  failure(reason);
                }
              }
            });
          } catch(error) {
            failure(err);
          }
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findAuthor().
        then(findBooksByAuthor).
        then(function(books){
          // found books
      }).catch(function(reason){
        // something went wrong
      });
      ```

      @method then
      @param {Function} onFulfilled
      @param {Function} onRejected
      Useful for tooling.
      @return {Promise}
    */
      then: function(onFulfillment, onRejection) {
        var parent = this;
        var state = parent._state;

        if (state === lib$es6$promise$$internal$$FULFILLED && !onFulfillment || state === lib$es6$promise$$internal$$REJECTED && !onRejection) {
          return this;
        }

        var child = new this.constructor(lib$es6$promise$$internal$$noop);
        var result = parent._result;

        if (state) {
          var callback = arguments[state - 1];
          lib$es6$promise$asap$$default(function(){
            lib$es6$promise$$internal$$invokeCallback(state, child, callback, result);
          });
        } else {
          lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection);
        }

        return child;
      },

    /**
      `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
      as the catch block of a try/catch statement.

      ```js
      function findAuthor(){
        throw new Error('couldn't find that author');
      }

      // synchronous
      try {
        findAuthor();
      } catch(reason) {
        // something went wrong
      }

      // async with promises
      findAuthor().catch(function(reason){
        // something went wrong
      });
      ```

      @method catch
      @param {Function} onRejection
      Useful for tooling.
      @return {Promise}
    */
      'catch': function(onRejection) {
        return this.then(null, onRejection);
      }
    };
    function lib$es6$promise$polyfill$$polyfill() {
      var local;

      if (typeof global !== 'undefined') {
          local = global;
      } else if (typeof self !== 'undefined') {
          local = self;
      } else {
          try {
              local = Function('return this')();
          } catch (e) {
              throw new Error('polyfill failed because global object is unavailable in this environment');
          }
      }

      var P = local.Promise;

      if (P && Object.prototype.toString.call(P.resolve()) === '[object Promise]' && !P.cast) {
        return;
      }

      local.Promise = lib$es6$promise$promise$$default;
    }
    var lib$es6$promise$polyfill$$default = lib$es6$promise$polyfill$$polyfill;

    var lib$es6$promise$umd$$ES6Promise = {
      'Promise': lib$es6$promise$promise$$default,
      'polyfill': lib$es6$promise$polyfill$$default
    };

    /* global define:true module:true window: true */
    if (typeof define === 'function' && define['amd']) {
      define(function() { return lib$es6$promise$umd$$ES6Promise; });
    } else if (typeof module !== 'undefined' && module['exports']) {
      module['exports'] = lib$es6$promise$umd$$ES6Promise;
    } else if (typeof this !== 'undefined') {
      this['ES6Promise'] = lib$es6$promise$umd$$ES6Promise;
    }

    lib$es6$promise$polyfill$$default();
}).call(this);


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":7}],10:[function(require,module,exports){
var setterGetterify = require('setter-getterify');

function SamplePlayer(context) {
	var node = context.createGain();
	var nodeProperties = {
		buffer: null,
		loop: false,
		loopStart: 0,
		loopEnd: 0
	};

	var bufferSourcesCount = 0;
	var bufferSources = {};
	var bufferSourceProperties = {};

	setterGetterify(node, nodeProperties);

	// TODO: playbackRate which needs to be an AudioParam
	// TODO: player can be mono or poly i.e. only one buffer can play at a given time or many can overlap

	node.start = function(when, offset, duration) {
		
		var buffer = nodeProperties['buffer'];
		if(!buffer) {
			console.info('OpenMusic SamplePlayer: no buffer to play, so byeee!');
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

		// Mono: invalidate all scheduled bufferSources to make sure only one is played (retrig mode)
		// TODO implement invalidation code ...

		// Poly: it's fine, just add a new one to the list
		var bs = makeBufferSource();

		// console.log('start', 'when', when, 'offset', offset, 'duration', duration);
		bs.start(when, offset, duration);
		
	};

	node.stop = function(when) {
		// For ease of development, we'll just stop to all the sources and empty the queue
		// If you need to re-schedule them, you'll need to call start() again.
		var keys = Object.keys(bufferSources);
		keys.forEach(function(k) {
			var source = bufferSources[k];
			source.stop(when);
			removeFromQueue(source);
		});
	};

	node.cancelScheduledEvents = function(when) {
		// TODO: when/if there is automation
	};

	return node;
	
	//~~~

	function makeBufferSource() {

		var source = context.createBufferSource();
		source.addEventListener('ended', onBufferEnded);
		source.connect(node);
		source.id = bufferSourcesCount++;
		bufferSources[source.id] = source;

		Object.keys(nodeProperties).forEach(function(name) {
			source[name] = nodeProperties[name];
		});

		return source;
		
	}

	function onBufferEnded(e) {
		var source = e.target;
		source.disconnect();
		// also remove from list
		removeFromQueue(source);
	}

	function removeFromQueue(source) {
		delete bufferSources[source.id];
	}

}

module.exports = SamplePlayer;

},{"setter-getterify":11}],11:[function(require,module,exports){
module.exports = setterGetterify;


function setterGetterify(object, properties, callbacks) {
	callbacks = callbacks || {};
	var keys = Object.keys(properties);
	keys.forEach(function(key) {
		Object.defineProperty(object, key, makeGetterSetter(properties, key, callbacks));
	});
}


function makeGetterSetter(properties, property, callbacks) {
	var afterSetting = callbacks.afterSetting || function() {};
	return {
		get: function() {
			return getProperty(properties, property);
		},
		set: function(value) {
			setProperty(properties, property, value);
			afterSetting(property, value);
		},
		enumerable: true
	};
}


function getProperty(properties, name) {
	return properties[name];
}


function setProperty(properties, name, value) {
	properties[name] = value;
}



},{}],12:[function(require,module,exports){
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


},{}],13:[function(require,module,exports){
(function() {
	var proto = Object.create(HTMLElement.prototype);

	var OpenMusicSlider = require('openmusic-slider');

	try {
		OpenMusicSlider.register('openmusic-slider');
	} catch(e) {
		// The slider might have been registered already, but if we register again
		// it will throw. So let's catch it and silently shut up.
	}
	
	proto.createdCallback = function() {
		
		var that = this;
		this.values = {};

		// making web components MWC framework proof.
		this.innerHTML = '';

		var templateContents = 
			'<button class="play">Play</button>' +
			'<button class="stop" disabled>Stop</button>' +
			'<label>BPM <openmusic-slider min="1" max="300" value="125"></openmusic-slider></label>';
		var template = document.createElement('template');
		template.innerHTML = templateContents;

		var liveHTML = document.importNode(template.content, true);
		var div = document.createElement('div');
		div.appendChild(liveHTML);
		
		var playButton = div.querySelector('[class=play]');
		var stopButton = div.querySelector('[class=stop]');

		playButton.addEventListener('click', function() {
			setEnabled(playButton, false);
			setEnabled(stopButton, true);
			dispatchEvent('play', that);
		});

		stopButton.addEventListener('click', function() {
			setEnabled(playButton, true);
			setEnabled(stopButton, false);
			dispatchEvent('stop', that);
		});

		var slider = div.querySelector('openmusic-slider');
		slider.addEventListener('input', function() {
			dispatchEvent('bpm', that, { value: slider.value * 1.0 });
		});

		this.appendChild(div);
		this.readAttributes();
		
	};

	
	function dispatchEvent(type, element, detail) {
		detail = detail || {};
		
		var ev = new CustomEvent(type, { detail: detail });
		element.dispatchEvent(ev);
	}

	function setEnabled(button, enabled) {
		if(!enabled) {
			button.setAttribute('disabled', 'disabled');
		} else {
			button.removeAttribute('disabled');
		}
	}

	
	proto.attachedCallback = function() {
	};


	proto.detachedCallback = function() {
	};


	proto.readAttributes = function() {
		var that = this;
		[].forEach(function(attr) {
			that.setValue(attr, that.getAttribute(attr));		
		});
	};

	
	proto.setValue = function(name, value) {

		if(value !== undefined && value !== null) {
			this.values[name] = value;
		}

		// TODO: Potential re-draw or DOM update in reaction to these values
	};


	proto.getValue = function(name) {
		return this.values[name];
	};

	
	proto.attributeChangedCallback = function(attr, oldValue, newValue, namespace) {
		
		this.setValue(attr, newValue);
		
		// var e = new CustomEvent('change', { detail: this.values } });
		// this.dispatchEvent(e);
		
	};


	// Optional: for components that represent an audio node
	proto.attachTo = function(audioNode) {
		audioNode.addEventListener('someevent', function(e) {
			// ...
		});
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
		component.register('openmusic-web-component-template'); // automatic registration
	}

}).call(this);


},{"openmusic-slider":14}],14:[function(require,module,exports){
(function() {

	var setterGetterify = require('setter-getterify');

	// Ideally it would be better to extend the HTMLInputElement prototype but
	// it doesn't seem to be working and I don't get any distinct element at all
	// or I get an "TypeError: 'type' setter called on an object that does not implement interface HTMLInputElement."
	// ... so using just HTMLElement for now
	var proto = Object.create(HTMLElement.prototype);

	proto.createdCallback = function() {

		var that = this;

		// Values
		var properties = {
			min: 0,
			max: 100,
			value: 50,
			step: 1
		};

		setterGetterify(this, properties, {
			afterSetting: function(property, value) {
				updateDisplay(that);
			}
		});
	
		this._properties = properties;

		// Markup
		var slider = document.createElement('input');
		slider.type = 'range';

		var valueSpan = document.createElement('span');

		this._slider = slider;
		this._valueSpan = valueSpan;

		this.appendChild(slider);
		this.appendChild(valueSpan);

		slider.addEventListener('input', function() {
			that.value = slider.value * 1.0;
		});

	};

	
	var sliderAttributes = [ 'min', 'max', 'value', 'step' ];

	proto.attachedCallback = function() {

		var attrs = this.attributes;
		var valueIsThere = false;
	
		for(var i = 0; i < attrs.length; i++) {
			var attr = attrs[i];

			if(attr.name === 'value') {
				valueIsThere = true;
			}

			// Just sending sensible attributes to the slider itself
			if(sliderAttributes.indexOf(attr.name) !== -1) {
				this._properties[attr.name] = attr.value;
			}
		}

		// If not specified, the default value has to be 
		// (min + max) / 2 as the normal slider would do as well.
		if(!valueIsThere) {
			var calculatedValue = (this._properties.min * 1.0 + this._properties.max * 1.0) / 2.0;
			this._properties.value = calculatedValue;
		}

		updateDisplay(this);

	};


	function updateDisplay(compo) {
		compo._valueSpan.innerHTML = compo._properties.value;
		compo._slider.value = compo._properties.value;
		compo._slider.min = compo._properties.min;
		compo._slider.max = compo._properties.max;
		compo._slider.step = compo._properties.step;
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



},{"setter-getterify":15}],15:[function(require,module,exports){
arguments[4][11][0].apply(exports,arguments)
},{"dup":11}],16:[function(require,module,exports){
/**
 * @license
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */
// @version 0.6.0-58c8709
window.WebComponents = window.WebComponents || {};

(function(scope) {
  var flags = scope.flags || {};
  var file = "webcomponents.js";
  var script = document.querySelector('script[src*="' + file + '"]');
  if (!flags.noOpts) {
    location.search.slice(1).split("&").forEach(function(o) {
      o = o.split("=");
      o[0] && (flags[o[0]] = o[1] || true);
    });
    if (script) {
      for (var i = 0, a; a = script.attributes[i]; i++) {
        if (a.name !== "src") {
          flags[a.name] = a.value || true;
        }
      }
    }
    if (flags.log) {
      var parts = flags.log.split(",");
      flags.log = {};
      parts.forEach(function(f) {
        flags.log[f] = true;
      });
    } else {
      flags.log = {};
    }
  }
  flags.shadow = flags.shadow || flags.shadowdom || flags.polyfill;
  if (flags.shadow === "native") {
    flags.shadow = false;
  } else {
    flags.shadow = flags.shadow || !HTMLElement.prototype.createShadowRoot;
  }
  if (flags.register) {
    window.CustomElements = window.CustomElements || {
      flags: {}
    };
    window.CustomElements.flags.register = flags.register;
  }
  scope.flags = flags;
})(WebComponents);

(function(scope) {
  "use strict";
  var hasWorkingUrl = false;
  if (!scope.forceJURL) {
    try {
      var u = new URL("b", "http://a");
      u.pathname = "c%20d";
      hasWorkingUrl = u.href === "http://a/c%20d";
    } catch (e) {}
  }
  if (hasWorkingUrl) return;
  var relative = Object.create(null);
  relative["ftp"] = 21;
  relative["file"] = 0;
  relative["gopher"] = 70;
  relative["http"] = 80;
  relative["https"] = 443;
  relative["ws"] = 80;
  relative["wss"] = 443;
  var relativePathDotMapping = Object.create(null);
  relativePathDotMapping["%2e"] = ".";
  relativePathDotMapping[".%2e"] = "..";
  relativePathDotMapping["%2e."] = "..";
  relativePathDotMapping["%2e%2e"] = "..";
  function isRelativeScheme(scheme) {
    return relative[scheme] !== undefined;
  }
  function invalid() {
    clear.call(this);
    this._isInvalid = true;
  }
  function IDNAToASCII(h) {
    if ("" == h) {
      invalid.call(this);
    }
    return h.toLowerCase();
  }
  function percentEscape(c) {
    var unicode = c.charCodeAt(0);
    if (unicode > 32 && unicode < 127 && [ 34, 35, 60, 62, 63, 96 ].indexOf(unicode) == -1) {
      return c;
    }
    return encodeURIComponent(c);
  }
  function percentEscapeQuery(c) {
    var unicode = c.charCodeAt(0);
    if (unicode > 32 && unicode < 127 && [ 34, 35, 60, 62, 96 ].indexOf(unicode) == -1) {
      return c;
    }
    return encodeURIComponent(c);
  }
  var EOF = undefined, ALPHA = /[a-zA-Z]/, ALPHANUMERIC = /[a-zA-Z0-9\+\-\.]/;
  function parse(input, stateOverride, base) {
    function err(message) {
      errors.push(message);
    }
    var state = stateOverride || "scheme start", cursor = 0, buffer = "", seenAt = false, seenBracket = false, errors = [];
    loop: while ((input[cursor - 1] != EOF || cursor == 0) && !this._isInvalid) {
      var c = input[cursor];
      switch (state) {
       case "scheme start":
        if (c && ALPHA.test(c)) {
          buffer += c.toLowerCase();
          state = "scheme";
        } else if (!stateOverride) {
          buffer = "";
          state = "no scheme";
          continue;
        } else {
          err("Invalid scheme.");
          break loop;
        }
        break;

       case "scheme":
        if (c && ALPHANUMERIC.test(c)) {
          buffer += c.toLowerCase();
        } else if (":" == c) {
          this._scheme = buffer;
          buffer = "";
          if (stateOverride) {
            break loop;
          }
          if (isRelativeScheme(this._scheme)) {
            this._isRelative = true;
          }
          if ("file" == this._scheme) {
            state = "relative";
          } else if (this._isRelative && base && base._scheme == this._scheme) {
            state = "relative or authority";
          } else if (this._isRelative) {
            state = "authority first slash";
          } else {
            state = "scheme data";
          }
        } else if (!stateOverride) {
          buffer = "";
          cursor = 0;
          state = "no scheme";
          continue;
        } else if (EOF == c) {
          break loop;
        } else {
          err("Code point not allowed in scheme: " + c);
          break loop;
        }
        break;

       case "scheme data":
        if ("?" == c) {
          query = "?";
          state = "query";
        } else if ("#" == c) {
          this._fragment = "#";
          state = "fragment";
        } else {
          if (EOF != c && "	" != c && "\n" != c && "\r" != c) {
            this._schemeData += percentEscape(c);
          }
        }
        break;

       case "no scheme":
        if (!base || !isRelativeScheme(base._scheme)) {
          err("Missing scheme.");
          invalid.call(this);
        } else {
          state = "relative";
          continue;
        }
        break;

       case "relative or authority":
        if ("/" == c && "/" == input[cursor + 1]) {
          state = "authority ignore slashes";
        } else {
          err("Expected /, got: " + c);
          state = "relative";
          continue;
        }
        break;

       case "relative":
        this._isRelative = true;
        if ("file" != this._scheme) this._scheme = base._scheme;
        if (EOF == c) {
          this._host = base._host;
          this._port = base._port;
          this._path = base._path.slice();
          this._query = base._query;
          break loop;
        } else if ("/" == c || "\\" == c) {
          if ("\\" == c) err("\\ is an invalid code point.");
          state = "relative slash";
        } else if ("?" == c) {
          this._host = base._host;
          this._port = base._port;
          this._path = base._path.slice();
          this._query = "?";
          state = "query";
        } else if ("#" == c) {
          this._host = base._host;
          this._port = base._port;
          this._path = base._path.slice();
          this._query = base._query;
          this._fragment = "#";
          state = "fragment";
        } else {
          var nextC = input[cursor + 1];
          var nextNextC = input[cursor + 2];
          if ("file" != this._scheme || !ALPHA.test(c) || nextC != ":" && nextC != "|" || EOF != nextNextC && "/" != nextNextC && "\\" != nextNextC && "?" != nextNextC && "#" != nextNextC) {
            this._host = base._host;
            this._port = base._port;
            this._path = base._path.slice();
            this._path.pop();
          }
          state = "relative path";
          continue;
        }
        break;

       case "relative slash":
        if ("/" == c || "\\" == c) {
          if ("\\" == c) {
            err("\\ is an invalid code point.");
          }
          if ("file" == this._scheme) {
            state = "file host";
          } else {
            state = "authority ignore slashes";
          }
        } else {
          if ("file" != this._scheme) {
            this._host = base._host;
            this._port = base._port;
          }
          state = "relative path";
          continue;
        }
        break;

       case "authority first slash":
        if ("/" == c) {
          state = "authority second slash";
        } else {
          err("Expected '/', got: " + c);
          state = "authority ignore slashes";
          continue;
        }
        break;

       case "authority second slash":
        state = "authority ignore slashes";
        if ("/" != c) {
          err("Expected '/', got: " + c);
          continue;
        }
        break;

       case "authority ignore slashes":
        if ("/" != c && "\\" != c) {
          state = "authority";
          continue;
        } else {
          err("Expected authority, got: " + c);
        }
        break;

       case "authority":
        if ("@" == c) {
          if (seenAt) {
            err("@ already seen.");
            buffer += "%40";
          }
          seenAt = true;
          for (var i = 0; i < buffer.length; i++) {
            var cp = buffer[i];
            if ("	" == cp || "\n" == cp || "\r" == cp) {
              err("Invalid whitespace in authority.");
              continue;
            }
            if (":" == cp && null === this._password) {
              this._password = "";
              continue;
            }
            var tempC = percentEscape(cp);
            null !== this._password ? this._password += tempC : this._username += tempC;
          }
          buffer = "";
        } else if (EOF == c || "/" == c || "\\" == c || "?" == c || "#" == c) {
          cursor -= buffer.length;
          buffer = "";
          state = "host";
          continue;
        } else {
          buffer += c;
        }
        break;

       case "file host":
        if (EOF == c || "/" == c || "\\" == c || "?" == c || "#" == c) {
          if (buffer.length == 2 && ALPHA.test(buffer[0]) && (buffer[1] == ":" || buffer[1] == "|")) {
            state = "relative path";
          } else if (buffer.length == 0) {
            state = "relative path start";
          } else {
            this._host = IDNAToASCII.call(this, buffer);
            buffer = "";
            state = "relative path start";
          }
          continue;
        } else if ("	" == c || "\n" == c || "\r" == c) {
          err("Invalid whitespace in file host.");
        } else {
          buffer += c;
        }
        break;

       case "host":
       case "hostname":
        if (":" == c && !seenBracket) {
          this._host = IDNAToASCII.call(this, buffer);
          buffer = "";
          state = "port";
          if ("hostname" == stateOverride) {
            break loop;
          }
        } else if (EOF == c || "/" == c || "\\" == c || "?" == c || "#" == c) {
          this._host = IDNAToASCII.call(this, buffer);
          buffer = "";
          state = "relative path start";
          if (stateOverride) {
            break loop;
          }
          continue;
        } else if ("	" != c && "\n" != c && "\r" != c) {
          if ("[" == c) {
            seenBracket = true;
          } else if ("]" == c) {
            seenBracket = false;
          }
          buffer += c;
        } else {
          err("Invalid code point in host/hostname: " + c);
        }
        break;

       case "port":
        if (/[0-9]/.test(c)) {
          buffer += c;
        } else if (EOF == c || "/" == c || "\\" == c || "?" == c || "#" == c || stateOverride) {
          if ("" != buffer) {
            var temp = parseInt(buffer, 10);
            if (temp != relative[this._scheme]) {
              this._port = temp + "";
            }
            buffer = "";
          }
          if (stateOverride) {
            break loop;
          }
          state = "relative path start";
          continue;
        } else if ("	" == c || "\n" == c || "\r" == c) {
          err("Invalid code point in port: " + c);
        } else {
          invalid.call(this);
        }
        break;

       case "relative path start":
        if ("\\" == c) err("'\\' not allowed in path.");
        state = "relative path";
        if ("/" != c && "\\" != c) {
          continue;
        }
        break;

       case "relative path":
        if (EOF == c || "/" == c || "\\" == c || !stateOverride && ("?" == c || "#" == c)) {
          if ("\\" == c) {
            err("\\ not allowed in relative path.");
          }
          var tmp;
          if (tmp = relativePathDotMapping[buffer.toLowerCase()]) {
            buffer = tmp;
          }
          if (".." == buffer) {
            this._path.pop();
            if ("/" != c && "\\" != c) {
              this._path.push("");
            }
          } else if ("." == buffer && "/" != c && "\\" != c) {
            this._path.push("");
          } else if ("." != buffer) {
            if ("file" == this._scheme && this._path.length == 0 && buffer.length == 2 && ALPHA.test(buffer[0]) && buffer[1] == "|") {
              buffer = buffer[0] + ":";
            }
            this._path.push(buffer);
          }
          buffer = "";
          if ("?" == c) {
            this._query = "?";
            state = "query";
          } else if ("#" == c) {
            this._fragment = "#";
            state = "fragment";
          }
        } else if ("	" != c && "\n" != c && "\r" != c) {
          buffer += percentEscape(c);
        }
        break;

       case "query":
        if (!stateOverride && "#" == c) {
          this._fragment = "#";
          state = "fragment";
        } else if (EOF != c && "	" != c && "\n" != c && "\r" != c) {
          this._query += percentEscapeQuery(c);
        }
        break;

       case "fragment":
        if (EOF != c && "	" != c && "\n" != c && "\r" != c) {
          this._fragment += c;
        }
        break;
      }
      cursor++;
    }
  }
  function clear() {
    this._scheme = "";
    this._schemeData = "";
    this._username = "";
    this._password = null;
    this._host = "";
    this._port = "";
    this._path = [];
    this._query = "";
    this._fragment = "";
    this._isInvalid = false;
    this._isRelative = false;
  }
  function jURL(url, base) {
    if (base !== undefined && !(base instanceof jURL)) base = new jURL(String(base));
    this._url = url;
    clear.call(this);
    var input = url.replace(/^[ \t\r\n\f]+|[ \t\r\n\f]+$/g, "");
    parse.call(this, input, null, base);
  }
  jURL.prototype = {
    toString: function() {
      return this.href;
    },
    get href() {
      if (this._isInvalid) return this._url;
      var authority = "";
      if ("" != this._username || null != this._password) {
        authority = this._username + (null != this._password ? ":" + this._password : "") + "@";
      }
      return this.protocol + (this._isRelative ? "//" + authority + this.host : "") + this.pathname + this._query + this._fragment;
    },
    set href(href) {
      clear.call(this);
      parse.call(this, href);
    },
    get protocol() {
      return this._scheme + ":";
    },
    set protocol(protocol) {
      if (this._isInvalid) return;
      parse.call(this, protocol + ":", "scheme start");
    },
    get host() {
      return this._isInvalid ? "" : this._port ? this._host + ":" + this._port : this._host;
    },
    set host(host) {
      if (this._isInvalid || !this._isRelative) return;
      parse.call(this, host, "host");
    },
    get hostname() {
      return this._host;
    },
    set hostname(hostname) {
      if (this._isInvalid || !this._isRelative) return;
      parse.call(this, hostname, "hostname");
    },
    get port() {
      return this._port;
    },
    set port(port) {
      if (this._isInvalid || !this._isRelative) return;
      parse.call(this, port, "port");
    },
    get pathname() {
      return this._isInvalid ? "" : this._isRelative ? "/" + this._path.join("/") : this._schemeData;
    },
    set pathname(pathname) {
      if (this._isInvalid || !this._isRelative) return;
      this._path = [];
      parse.call(this, pathname, "relative path start");
    },
    get search() {
      return this._isInvalid || !this._query || "?" == this._query ? "" : this._query;
    },
    set search(search) {
      if (this._isInvalid || !this._isRelative) return;
      this._query = "?";
      if ("?" == search[0]) search = search.slice(1);
      parse.call(this, search, "query");
    },
    get hash() {
      return this._isInvalid || !this._fragment || "#" == this._fragment ? "" : this._fragment;
    },
    set hash(hash) {
      if (this._isInvalid) return;
      this._fragment = "#";
      if ("#" == hash[0]) hash = hash.slice(1);
      parse.call(this, hash, "fragment");
    },
    get origin() {
      var host;
      if (this._isInvalid || !this._scheme) {
        return "";
      }
      switch (this._scheme) {
       case "data":
       case "file":
       case "javascript":
       case "mailto":
        return "null";
      }
      host = this.host;
      if (!host) {
        return "";
      }
      return this._scheme + "://" + host;
    }
  };
  var OriginalURL = scope.URL;
  if (OriginalURL) {
    jURL.createObjectURL = function(blob) {
      return OriginalURL.createObjectURL.apply(OriginalURL, arguments);
    };
    jURL.revokeObjectURL = function(url) {
      OriginalURL.revokeObjectURL(url);
    };
  }
  scope.URL = jURL;
})(this);

if (typeof WeakMap === "undefined") {
  (function() {
    var defineProperty = Object.defineProperty;
    var counter = Date.now() % 1e9;
    var WeakMap = function() {
      this.name = "__st" + (Math.random() * 1e9 >>> 0) + (counter++ + "__");
    };
    WeakMap.prototype = {
      set: function(key, value) {
        var entry = key[this.name];
        if (entry && entry[0] === key) entry[1] = value; else defineProperty(key, this.name, {
          value: [ key, value ],
          writable: true
        });
        return this;
      },
      get: function(key) {
        var entry;
        return (entry = key[this.name]) && entry[0] === key ? entry[1] : undefined;
      },
      "delete": function(key) {
        var entry = key[this.name];
        if (!entry || entry[0] !== key) return false;
        entry[0] = entry[1] = undefined;
        return true;
      },
      has: function(key) {
        var entry = key[this.name];
        if (!entry) return false;
        return entry[0] === key;
      }
    };
    window.WeakMap = WeakMap;
  })();
}

(function(global) {
  var registrationsTable = new WeakMap();
  var setImmediate;
  if (/Trident|Edge/.test(navigator.userAgent)) {
    setImmediate = setTimeout;
  } else if (window.setImmediate) {
    setImmediate = window.setImmediate;
  } else {
    var setImmediateQueue = [];
    var sentinel = String(Math.random());
    window.addEventListener("message", function(e) {
      if (e.data === sentinel) {
        var queue = setImmediateQueue;
        setImmediateQueue = [];
        queue.forEach(function(func) {
          func();
        });
      }
    });
    setImmediate = function(func) {
      setImmediateQueue.push(func);
      window.postMessage(sentinel, "*");
    };
  }
  var isScheduled = false;
  var scheduledObservers = [];
  function scheduleCallback(observer) {
    scheduledObservers.push(observer);
    if (!isScheduled) {
      isScheduled = true;
      setImmediate(dispatchCallbacks);
    }
  }
  function wrapIfNeeded(node) {
    return window.ShadowDOMPolyfill && window.ShadowDOMPolyfill.wrapIfNeeded(node) || node;
  }
  function dispatchCallbacks() {
    isScheduled = false;
    var observers = scheduledObservers;
    scheduledObservers = [];
    observers.sort(function(o1, o2) {
      return o1.uid_ - o2.uid_;
    });
    var anyNonEmpty = false;
    observers.forEach(function(observer) {
      var queue = observer.takeRecords();
      removeTransientObserversFor(observer);
      if (queue.length) {
        observer.callback_(queue, observer);
        anyNonEmpty = true;
      }
    });
    if (anyNonEmpty) dispatchCallbacks();
  }
  function removeTransientObserversFor(observer) {
    observer.nodes_.forEach(function(node) {
      var registrations = registrationsTable.get(node);
      if (!registrations) return;
      registrations.forEach(function(registration) {
        if (registration.observer === observer) registration.removeTransientObservers();
      });
    });
  }
  function forEachAncestorAndObserverEnqueueRecord(target, callback) {
    for (var node = target; node; node = node.parentNode) {
      var registrations = registrationsTable.get(node);
      if (registrations) {
        for (var j = 0; j < registrations.length; j++) {
          var registration = registrations[j];
          var options = registration.options;
          if (node !== target && !options.subtree) continue;
          var record = callback(options);
          if (record) registration.enqueue(record);
        }
      }
    }
  }
  var uidCounter = 0;
  function JsMutationObserver(callback) {
    this.callback_ = callback;
    this.nodes_ = [];
    this.records_ = [];
    this.uid_ = ++uidCounter;
  }
  JsMutationObserver.prototype = {
    observe: function(target, options) {
      target = wrapIfNeeded(target);
      if (!options.childList && !options.attributes && !options.characterData || options.attributeOldValue && !options.attributes || options.attributeFilter && options.attributeFilter.length && !options.attributes || options.characterDataOldValue && !options.characterData) {
        throw new SyntaxError();
      }
      var registrations = registrationsTable.get(target);
      if (!registrations) registrationsTable.set(target, registrations = []);
      var registration;
      for (var i = 0; i < registrations.length; i++) {
        if (registrations[i].observer === this) {
          registration = registrations[i];
          registration.removeListeners();
          registration.options = options;
          break;
        }
      }
      if (!registration) {
        registration = new Registration(this, target, options);
        registrations.push(registration);
        this.nodes_.push(target);
      }
      registration.addListeners();
    },
    disconnect: function() {
      this.nodes_.forEach(function(node) {
        var registrations = registrationsTable.get(node);
        for (var i = 0; i < registrations.length; i++) {
          var registration = registrations[i];
          if (registration.observer === this) {
            registration.removeListeners();
            registrations.splice(i, 1);
            break;
          }
        }
      }, this);
      this.records_ = [];
    },
    takeRecords: function() {
      var copyOfRecords = this.records_;
      this.records_ = [];
      return copyOfRecords;
    }
  };
  function MutationRecord(type, target) {
    this.type = type;
    this.target = target;
    this.addedNodes = [];
    this.removedNodes = [];
    this.previousSibling = null;
    this.nextSibling = null;
    this.attributeName = null;
    this.attributeNamespace = null;
    this.oldValue = null;
  }
  function copyMutationRecord(original) {
    var record = new MutationRecord(original.type, original.target);
    record.addedNodes = original.addedNodes.slice();
    record.removedNodes = original.removedNodes.slice();
    record.previousSibling = original.previousSibling;
    record.nextSibling = original.nextSibling;
    record.attributeName = original.attributeName;
    record.attributeNamespace = original.attributeNamespace;
    record.oldValue = original.oldValue;
    return record;
  }
  var currentRecord, recordWithOldValue;
  function getRecord(type, target) {
    return currentRecord = new MutationRecord(type, target);
  }
  function getRecordWithOldValue(oldValue) {
    if (recordWithOldValue) return recordWithOldValue;
    recordWithOldValue = copyMutationRecord(currentRecord);
    recordWithOldValue.oldValue = oldValue;
    return recordWithOldValue;
  }
  function clearRecords() {
    currentRecord = recordWithOldValue = undefined;
  }
  function recordRepresentsCurrentMutation(record) {
    return record === recordWithOldValue || record === currentRecord;
  }
  function selectRecord(lastRecord, newRecord) {
    if (lastRecord === newRecord) return lastRecord;
    if (recordWithOldValue && recordRepresentsCurrentMutation(lastRecord)) return recordWithOldValue;
    return null;
  }
  function Registration(observer, target, options) {
    this.observer = observer;
    this.target = target;
    this.options = options;
    this.transientObservedNodes = [];
  }
  Registration.prototype = {
    enqueue: function(record) {
      var records = this.observer.records_;
      var length = records.length;
      if (records.length > 0) {
        var lastRecord = records[length - 1];
        var recordToReplaceLast = selectRecord(lastRecord, record);
        if (recordToReplaceLast) {
          records[length - 1] = recordToReplaceLast;
          return;
        }
      } else {
        scheduleCallback(this.observer);
      }
      records[length] = record;
    },
    addListeners: function() {
      this.addListeners_(this.target);
    },
    addListeners_: function(node) {
      var options = this.options;
      if (options.attributes) node.addEventListener("DOMAttrModified", this, true);
      if (options.characterData) node.addEventListener("DOMCharacterDataModified", this, true);
      if (options.childList) node.addEventListener("DOMNodeInserted", this, true);
      if (options.childList || options.subtree) node.addEventListener("DOMNodeRemoved", this, true);
    },
    removeListeners: function() {
      this.removeListeners_(this.target);
    },
    removeListeners_: function(node) {
      var options = this.options;
      if (options.attributes) node.removeEventListener("DOMAttrModified", this, true);
      if (options.characterData) node.removeEventListener("DOMCharacterDataModified", this, true);
      if (options.childList) node.removeEventListener("DOMNodeInserted", this, true);
      if (options.childList || options.subtree) node.removeEventListener("DOMNodeRemoved", this, true);
    },
    addTransientObserver: function(node) {
      if (node === this.target) return;
      this.addListeners_(node);
      this.transientObservedNodes.push(node);
      var registrations = registrationsTable.get(node);
      if (!registrations) registrationsTable.set(node, registrations = []);
      registrations.push(this);
    },
    removeTransientObservers: function() {
      var transientObservedNodes = this.transientObservedNodes;
      this.transientObservedNodes = [];
      transientObservedNodes.forEach(function(node) {
        this.removeListeners_(node);
        var registrations = registrationsTable.get(node);
        for (var i = 0; i < registrations.length; i++) {
          if (registrations[i] === this) {
            registrations.splice(i, 1);
            break;
          }
        }
      }, this);
    },
    handleEvent: function(e) {
      e.stopImmediatePropagation();
      switch (e.type) {
       case "DOMAttrModified":
        var name = e.attrName;
        var namespace = e.relatedNode.namespaceURI;
        var target = e.target;
        var record = new getRecord("attributes", target);
        record.attributeName = name;
        record.attributeNamespace = namespace;
        var oldValue = e.attrChange === MutationEvent.ADDITION ? null : e.prevValue;
        forEachAncestorAndObserverEnqueueRecord(target, function(options) {
          if (!options.attributes) return;
          if (options.attributeFilter && options.attributeFilter.length && options.attributeFilter.indexOf(name) === -1 && options.attributeFilter.indexOf(namespace) === -1) {
            return;
          }
          if (options.attributeOldValue) return getRecordWithOldValue(oldValue);
          return record;
        });
        break;

       case "DOMCharacterDataModified":
        var target = e.target;
        var record = getRecord("characterData", target);
        var oldValue = e.prevValue;
        forEachAncestorAndObserverEnqueueRecord(target, function(options) {
          if (!options.characterData) return;
          if (options.characterDataOldValue) return getRecordWithOldValue(oldValue);
          return record;
        });
        break;

       case "DOMNodeRemoved":
        this.addTransientObserver(e.target);

       case "DOMNodeInserted":
        var changedNode = e.target;
        var addedNodes, removedNodes;
        if (e.type === "DOMNodeInserted") {
          addedNodes = [ changedNode ];
          removedNodes = [];
        } else {
          addedNodes = [];
          removedNodes = [ changedNode ];
        }
        var previousSibling = changedNode.previousSibling;
        var nextSibling = changedNode.nextSibling;
        var record = getRecord("childList", e.target.parentNode);
        record.addedNodes = addedNodes;
        record.removedNodes = removedNodes;
        record.previousSibling = previousSibling;
        record.nextSibling = nextSibling;
        forEachAncestorAndObserverEnqueueRecord(e.relatedNode, function(options) {
          if (!options.childList) return;
          return record;
        });
      }
      clearRecords();
    }
  };
  global.JsMutationObserver = JsMutationObserver;
  if (!global.MutationObserver) global.MutationObserver = JsMutationObserver;
})(this);

window.HTMLImports = window.HTMLImports || {
  flags: {}
};

(function(scope) {
  var IMPORT_LINK_TYPE = "import";
  var useNative = Boolean(IMPORT_LINK_TYPE in document.createElement("link"));
  var hasShadowDOMPolyfill = Boolean(window.ShadowDOMPolyfill);
  var wrap = function(node) {
    return hasShadowDOMPolyfill ? ShadowDOMPolyfill.wrapIfNeeded(node) : node;
  };
  var rootDocument = wrap(document);
  var currentScriptDescriptor = {
    get: function() {
      var script = HTMLImports.currentScript || document.currentScript || (document.readyState !== "complete" ? document.scripts[document.scripts.length - 1] : null);
      return wrap(script);
    },
    configurable: true
  };
  Object.defineProperty(document, "_currentScript", currentScriptDescriptor);
  Object.defineProperty(rootDocument, "_currentScript", currentScriptDescriptor);
  var isIE = /Trident|Edge/.test(navigator.userAgent);
  function whenReady(callback, doc) {
    doc = doc || rootDocument;
    whenDocumentReady(function() {
      watchImportsLoad(callback, doc);
    }, doc);
  }
  var requiredReadyState = isIE ? "complete" : "interactive";
  var READY_EVENT = "readystatechange";
  function isDocumentReady(doc) {
    return doc.readyState === "complete" || doc.readyState === requiredReadyState;
  }
  function whenDocumentReady(callback, doc) {
    if (!isDocumentReady(doc)) {
      var checkReady = function() {
        if (doc.readyState === "complete" || doc.readyState === requiredReadyState) {
          doc.removeEventListener(READY_EVENT, checkReady);
          whenDocumentReady(callback, doc);
        }
      };
      doc.addEventListener(READY_EVENT, checkReady);
    } else if (callback) {
      callback();
    }
  }
  function markTargetLoaded(event) {
    event.target.__loaded = true;
  }
  function watchImportsLoad(callback, doc) {
    var imports = doc.querySelectorAll("link[rel=import]");
    var parsedCount = 0, importCount = imports.length, newImports = [], errorImports = [];
    function checkDone() {
      if (parsedCount == importCount && callback) {
        callback({
          allImports: imports,
          loadedImports: newImports,
          errorImports: errorImports
        });
      }
    }
    function loadedImport(e) {
      markTargetLoaded(e);
      newImports.push(this);
      parsedCount++;
      checkDone();
    }
    function errorLoadingImport(e) {
      errorImports.push(this);
      parsedCount++;
      checkDone();
    }
    if (importCount) {
      for (var i = 0, imp; i < importCount && (imp = imports[i]); i++) {
        if (isImportLoaded(imp)) {
          parsedCount++;
          checkDone();
        } else {
          imp.addEventListener("load", loadedImport);
          imp.addEventListener("error", errorLoadingImport);
        }
      }
    } else {
      checkDone();
    }
  }
  function isImportLoaded(link) {
    return useNative ? link.__loaded || link.import && link.import.readyState !== "loading" : link.__importParsed;
  }
  if (useNative) {
    new MutationObserver(function(mxns) {
      for (var i = 0, l = mxns.length, m; i < l && (m = mxns[i]); i++) {
        if (m.addedNodes) {
          handleImports(m.addedNodes);
        }
      }
    }).observe(document.head, {
      childList: true
    });
    function handleImports(nodes) {
      for (var i = 0, l = nodes.length, n; i < l && (n = nodes[i]); i++) {
        if (isImport(n)) {
          handleImport(n);
        }
      }
    }
    function isImport(element) {
      return element.localName === "link" && element.rel === "import";
    }
    function handleImport(element) {
      var loaded = element.import;
      if (loaded) {
        markTargetLoaded({
          target: element
        });
      } else {
        element.addEventListener("load", markTargetLoaded);
        element.addEventListener("error", markTargetLoaded);
      }
    }
    (function() {
      if (document.readyState === "loading") {
        var imports = document.querySelectorAll("link[rel=import]");
        for (var i = 0, l = imports.length, imp; i < l && (imp = imports[i]); i++) {
          handleImport(imp);
        }
      }
    })();
  }
  whenReady(function(detail) {
    HTMLImports.ready = true;
    HTMLImports.readyTime = new Date().getTime();
    var evt = rootDocument.createEvent("CustomEvent");
    evt.initCustomEvent("HTMLImportsLoaded", true, true, detail);
    rootDocument.dispatchEvent(evt);
  });
  scope.IMPORT_LINK_TYPE = IMPORT_LINK_TYPE;
  scope.useNative = useNative;
  scope.rootDocument = rootDocument;
  scope.whenReady = whenReady;
  scope.isIE = isIE;
})(HTMLImports);

(function(scope) {
  var modules = [];
  var addModule = function(module) {
    modules.push(module);
  };
  var initializeModules = function() {
    modules.forEach(function(module) {
      module(scope);
    });
  };
  scope.addModule = addModule;
  scope.initializeModules = initializeModules;
})(HTMLImports);

HTMLImports.addModule(function(scope) {
  var CSS_URL_REGEXP = /(url\()([^)]*)(\))/g;
  var CSS_IMPORT_REGEXP = /(@import[\s]+(?!url\())([^;]*)(;)/g;
  var path = {
    resolveUrlsInStyle: function(style, linkUrl) {
      var doc = style.ownerDocument;
      var resolver = doc.createElement("a");
      style.textContent = this.resolveUrlsInCssText(style.textContent, linkUrl, resolver);
      return style;
    },
    resolveUrlsInCssText: function(cssText, linkUrl, urlObj) {
      var r = this.replaceUrls(cssText, urlObj, linkUrl, CSS_URL_REGEXP);
      r = this.replaceUrls(r, urlObj, linkUrl, CSS_IMPORT_REGEXP);
      return r;
    },
    replaceUrls: function(text, urlObj, linkUrl, regexp) {
      return text.replace(regexp, function(m, pre, url, post) {
        var urlPath = url.replace(/["']/g, "");
        if (linkUrl) {
          urlPath = new URL(urlPath, linkUrl).href;
        }
        urlObj.href = urlPath;
        urlPath = urlObj.href;
        return pre + "'" + urlPath + "'" + post;
      });
    }
  };
  scope.path = path;
});

HTMLImports.addModule(function(scope) {
  var xhr = {
    async: true,
    ok: function(request) {
      return request.status >= 200 && request.status < 300 || request.status === 304 || request.status === 0;
    },
    load: function(url, next, nextContext) {
      var request = new XMLHttpRequest();
      if (scope.flags.debug || scope.flags.bust) {
        url += "?" + Math.random();
      }
      request.open("GET", url, xhr.async);
      request.addEventListener("readystatechange", function(e) {
        if (request.readyState === 4) {
          var locationHeader = request.getResponseHeader("Location");
          var redirectedUrl = null;
          if (locationHeader) {
            var redirectedUrl = locationHeader.substr(0, 1) === "/" ? location.origin + locationHeader : locationHeader;
          }
          next.call(nextContext, !xhr.ok(request) && request, request.response || request.responseText, redirectedUrl);
        }
      });
      request.send();
      return request;
    },
    loadDocument: function(url, next, nextContext) {
      this.load(url, next, nextContext).responseType = "document";
    }
  };
  scope.xhr = xhr;
});

HTMLImports.addModule(function(scope) {
  var xhr = scope.xhr;
  var flags = scope.flags;
  var Loader = function(onLoad, onComplete) {
    this.cache = {};
    this.onload = onLoad;
    this.oncomplete = onComplete;
    this.inflight = 0;
    this.pending = {};
  };
  Loader.prototype = {
    addNodes: function(nodes) {
      this.inflight += nodes.length;
      for (var i = 0, l = nodes.length, n; i < l && (n = nodes[i]); i++) {
        this.require(n);
      }
      this.checkDone();
    },
    addNode: function(node) {
      this.inflight++;
      this.require(node);
      this.checkDone();
    },
    require: function(elt) {
      var url = elt.src || elt.href;
      elt.__nodeUrl = url;
      if (!this.dedupe(url, elt)) {
        this.fetch(url, elt);
      }
    },
    dedupe: function(url, elt) {
      if (this.pending[url]) {
        this.pending[url].push(elt);
        return true;
      }
      var resource;
      if (this.cache[url]) {
        this.onload(url, elt, this.cache[url]);
        this.tail();
        return true;
      }
      this.pending[url] = [ elt ];
      return false;
    },
    fetch: function(url, elt) {
      flags.load && console.log("fetch", url, elt);
      if (!url) {
        setTimeout(function() {
          this.receive(url, elt, {
            error: "href must be specified"
          }, null);
        }.bind(this), 0);
      } else if (url.match(/^data:/)) {
        var pieces = url.split(",");
        var header = pieces[0];
        var body = pieces[1];
        if (header.indexOf(";base64") > -1) {
          body = atob(body);
        } else {
          body = decodeURIComponent(body);
        }
        setTimeout(function() {
          this.receive(url, elt, null, body);
        }.bind(this), 0);
      } else {
        var receiveXhr = function(err, resource, redirectedUrl) {
          this.receive(url, elt, err, resource, redirectedUrl);
        }.bind(this);
        xhr.load(url, receiveXhr);
      }
    },
    receive: function(url, elt, err, resource, redirectedUrl) {
      this.cache[url] = resource;
      var $p = this.pending[url];
      for (var i = 0, l = $p.length, p; i < l && (p = $p[i]); i++) {
        this.onload(url, p, resource, err, redirectedUrl);
        this.tail();
      }
      this.pending[url] = null;
    },
    tail: function() {
      --this.inflight;
      this.checkDone();
    },
    checkDone: function() {
      if (!this.inflight) {
        this.oncomplete();
      }
    }
  };
  scope.Loader = Loader;
});

HTMLImports.addModule(function(scope) {
  var Observer = function(addCallback) {
    this.addCallback = addCallback;
    this.mo = new MutationObserver(this.handler.bind(this));
  };
  Observer.prototype = {
    handler: function(mutations) {
      for (var i = 0, l = mutations.length, m; i < l && (m = mutations[i]); i++) {
        if (m.type === "childList" && m.addedNodes.length) {
          this.addedNodes(m.addedNodes);
        }
      }
    },
    addedNodes: function(nodes) {
      if (this.addCallback) {
        this.addCallback(nodes);
      }
      for (var i = 0, l = nodes.length, n, loading; i < l && (n = nodes[i]); i++) {
        if (n.children && n.children.length) {
          this.addedNodes(n.children);
        }
      }
    },
    observe: function(root) {
      this.mo.observe(root, {
        childList: true,
        subtree: true
      });
    }
  };
  scope.Observer = Observer;
});

HTMLImports.addModule(function(scope) {
  var path = scope.path;
  var rootDocument = scope.rootDocument;
  var flags = scope.flags;
  var isIE = scope.isIE;
  var IMPORT_LINK_TYPE = scope.IMPORT_LINK_TYPE;
  var IMPORT_SELECTOR = "link[rel=" + IMPORT_LINK_TYPE + "]";
  var importParser = {
    documentSelectors: IMPORT_SELECTOR,
    importsSelectors: [ IMPORT_SELECTOR, "link[rel=stylesheet]", "style", "script:not([type])", 'script[type="text/javascript"]' ].join(","),
    map: {
      link: "parseLink",
      script: "parseScript",
      style: "parseStyle"
    },
    dynamicElements: [],
    parseNext: function() {
      var next = this.nextToParse();
      if (next) {
        this.parse(next);
      }
    },
    parse: function(elt) {
      if (this.isParsed(elt)) {
        flags.parse && console.log("[%s] is already parsed", elt.localName);
        return;
      }
      var fn = this[this.map[elt.localName]];
      if (fn) {
        this.markParsing(elt);
        fn.call(this, elt);
      }
    },
    parseDynamic: function(elt, quiet) {
      this.dynamicElements.push(elt);
      if (!quiet) {
        this.parseNext();
      }
    },
    markParsing: function(elt) {
      flags.parse && console.log("parsing", elt);
      this.parsingElement = elt;
    },
    markParsingComplete: function(elt) {
      elt.__importParsed = true;
      this.markDynamicParsingComplete(elt);
      if (elt.__importElement) {
        elt.__importElement.__importParsed = true;
        this.markDynamicParsingComplete(elt.__importElement);
      }
      this.parsingElement = null;
      flags.parse && console.log("completed", elt);
    },
    markDynamicParsingComplete: function(elt) {
      var i = this.dynamicElements.indexOf(elt);
      if (i >= 0) {
        this.dynamicElements.splice(i, 1);
      }
    },
    parseImport: function(elt) {
      if (HTMLImports.__importsParsingHook) {
        HTMLImports.__importsParsingHook(elt);
      }
      if (elt.import) {
        elt.import.__importParsed = true;
      }
      this.markParsingComplete(elt);
      if (elt.__resource && !elt.__error) {
        elt.dispatchEvent(new CustomEvent("load", {
          bubbles: false
        }));
      } else {
        elt.dispatchEvent(new CustomEvent("error", {
          bubbles: false
        }));
      }
      if (elt.__pending) {
        var fn;
        while (elt.__pending.length) {
          fn = elt.__pending.shift();
          if (fn) {
            fn({
              target: elt
            });
          }
        }
      }
      this.parseNext();
    },
    parseLink: function(linkElt) {
      if (nodeIsImport(linkElt)) {
        this.parseImport(linkElt);
      } else {
        linkElt.href = linkElt.href;
        this.parseGeneric(linkElt);
      }
    },
    parseStyle: function(elt) {
      var src = elt;
      elt = cloneStyle(elt);
      src.__appliedElement = elt;
      elt.__importElement = src;
      this.parseGeneric(elt);
    },
    parseGeneric: function(elt) {
      this.trackElement(elt);
      this.addElementToDocument(elt);
    },
    rootImportForElement: function(elt) {
      var n = elt;
      while (n.ownerDocument.__importLink) {
        n = n.ownerDocument.__importLink;
      }
      return n;
    },
    addElementToDocument: function(elt) {
      var port = this.rootImportForElement(elt.__importElement || elt);
      port.parentNode.insertBefore(elt, port);
    },
    trackElement: function(elt, callback) {
      var self = this;
      var done = function(e) {
        if (callback) {
          callback(e);
        }
        self.markParsingComplete(elt);
        self.parseNext();
      };
      elt.addEventListener("load", done);
      elt.addEventListener("error", done);
      if (isIE && elt.localName === "style") {
        var fakeLoad = false;
        if (elt.textContent.indexOf("@import") == -1) {
          fakeLoad = true;
        } else if (elt.sheet) {
          fakeLoad = true;
          var csr = elt.sheet.cssRules;
          var len = csr ? csr.length : 0;
          for (var i = 0, r; i < len && (r = csr[i]); i++) {
            if (r.type === CSSRule.IMPORT_RULE) {
              fakeLoad = fakeLoad && Boolean(r.styleSheet);
            }
          }
        }
        if (fakeLoad) {
          elt.dispatchEvent(new CustomEvent("load", {
            bubbles: false
          }));
        }
      }
    },
    parseScript: function(scriptElt) {
      var script = document.createElement("script");
      script.__importElement = scriptElt;
      script.src = scriptElt.src ? scriptElt.src : generateScriptDataUrl(scriptElt);
      scope.currentScript = scriptElt;
      this.trackElement(script, function(e) {
        script.parentNode.removeChild(script);
        scope.currentScript = null;
      });
      this.addElementToDocument(script);
    },
    nextToParse: function() {
      this._mayParse = [];
      return !this.parsingElement && (this.nextToParseInDoc(rootDocument) || this.nextToParseDynamic());
    },
    nextToParseInDoc: function(doc, link) {
      if (doc && this._mayParse.indexOf(doc) < 0) {
        this._mayParse.push(doc);
        var nodes = doc.querySelectorAll(this.parseSelectorsForNode(doc));
        for (var i = 0, l = nodes.length, p = 0, n; i < l && (n = nodes[i]); i++) {
          if (!this.isParsed(n)) {
            if (this.hasResource(n)) {
              return nodeIsImport(n) ? this.nextToParseInDoc(n.import, n) : n;
            } else {
              return;
            }
          }
        }
      }
      return link;
    },
    nextToParseDynamic: function() {
      return this.dynamicElements[0];
    },
    parseSelectorsForNode: function(node) {
      var doc = node.ownerDocument || node;
      return doc === rootDocument ? this.documentSelectors : this.importsSelectors;
    },
    isParsed: function(node) {
      return node.__importParsed;
    },
    needsDynamicParsing: function(elt) {
      return this.dynamicElements.indexOf(elt) >= 0;
    },
    hasResource: function(node) {
      if (nodeIsImport(node) && node.import === undefined) {
        return false;
      }
      return true;
    }
  };
  function nodeIsImport(elt) {
    return elt.localName === "link" && elt.rel === IMPORT_LINK_TYPE;
  }
  function generateScriptDataUrl(script) {
    var scriptContent = generateScriptContent(script);
    return "data:text/javascript;charset=utf-8," + encodeURIComponent(scriptContent);
  }
  function generateScriptContent(script) {
    return script.textContent + generateSourceMapHint(script);
  }
  function generateSourceMapHint(script) {
    var owner = script.ownerDocument;
    owner.__importedScripts = owner.__importedScripts || 0;
    var moniker = script.ownerDocument.baseURI;
    var num = owner.__importedScripts ? "-" + owner.__importedScripts : "";
    owner.__importedScripts++;
    return "\n//# sourceURL=" + moniker + num + ".js\n";
  }
  function cloneStyle(style) {
    var clone = style.ownerDocument.createElement("style");
    clone.textContent = style.textContent;
    path.resolveUrlsInStyle(clone);
    return clone;
  }
  scope.parser = importParser;
  scope.IMPORT_SELECTOR = IMPORT_SELECTOR;
});

HTMLImports.addModule(function(scope) {
  var flags = scope.flags;
  var IMPORT_LINK_TYPE = scope.IMPORT_LINK_TYPE;
  var IMPORT_SELECTOR = scope.IMPORT_SELECTOR;
  var rootDocument = scope.rootDocument;
  var Loader = scope.Loader;
  var Observer = scope.Observer;
  var parser = scope.parser;
  var importer = {
    documents: {},
    documentPreloadSelectors: IMPORT_SELECTOR,
    importsPreloadSelectors: [ IMPORT_SELECTOR ].join(","),
    loadNode: function(node) {
      importLoader.addNode(node);
    },
    loadSubtree: function(parent) {
      var nodes = this.marshalNodes(parent);
      importLoader.addNodes(nodes);
    },
    marshalNodes: function(parent) {
      return parent.querySelectorAll(this.loadSelectorsForNode(parent));
    },
    loadSelectorsForNode: function(node) {
      var doc = node.ownerDocument || node;
      return doc === rootDocument ? this.documentPreloadSelectors : this.importsPreloadSelectors;
    },
    loaded: function(url, elt, resource, err, redirectedUrl) {
      flags.load && console.log("loaded", url, elt);
      elt.__resource = resource;
      elt.__error = err;
      if (isImportLink(elt)) {
        var doc = this.documents[url];
        if (doc === undefined) {
          doc = err ? null : makeDocument(resource, redirectedUrl || url);
          if (doc) {
            doc.__importLink = elt;
            this.bootDocument(doc);
          }
          this.documents[url] = doc;
        }
        elt.import = doc;
      }
      parser.parseNext();
    },
    bootDocument: function(doc) {
      this.loadSubtree(doc);
      this.observer.observe(doc);
      parser.parseNext();
    },
    loadedAll: function() {
      parser.parseNext();
    }
  };
  var importLoader = new Loader(importer.loaded.bind(importer), importer.loadedAll.bind(importer));
  importer.observer = new Observer();
  function isImportLink(elt) {
    return isLinkRel(elt, IMPORT_LINK_TYPE);
  }
  function isLinkRel(elt, rel) {
    return elt.localName === "link" && elt.getAttribute("rel") === rel;
  }
  function hasBaseURIAccessor(doc) {
    return !!Object.getOwnPropertyDescriptor(doc, "baseURI");
  }
  function makeDocument(resource, url) {
    var doc = document.implementation.createHTMLDocument(IMPORT_LINK_TYPE);
    doc._URL = url;
    var base = doc.createElement("base");
    base.setAttribute("href", url);
    if (!doc.baseURI && !hasBaseURIAccessor(doc)) {
      Object.defineProperty(doc, "baseURI", {
        value: url
      });
    }
    var meta = doc.createElement("meta");
    meta.setAttribute("charset", "utf-8");
    doc.head.appendChild(meta);
    doc.head.appendChild(base);
    doc.body.innerHTML = resource;
    if (window.HTMLTemplateElement && HTMLTemplateElement.bootstrap) {
      HTMLTemplateElement.bootstrap(doc);
    }
    return doc;
  }
  if (!document.baseURI) {
    var baseURIDescriptor = {
      get: function() {
        var base = document.querySelector("base");
        return base ? base.href : window.location.href;
      },
      configurable: true
    };
    Object.defineProperty(document, "baseURI", baseURIDescriptor);
    Object.defineProperty(rootDocument, "baseURI", baseURIDescriptor);
  }
  scope.importer = importer;
  scope.importLoader = importLoader;
});

HTMLImports.addModule(function(scope) {
  var parser = scope.parser;
  var importer = scope.importer;
  var dynamic = {
    added: function(nodes) {
      var owner, parsed, loading;
      for (var i = 0, l = nodes.length, n; i < l && (n = nodes[i]); i++) {
        if (!owner) {
          owner = n.ownerDocument;
          parsed = parser.isParsed(owner);
        }
        loading = this.shouldLoadNode(n);
        if (loading) {
          importer.loadNode(n);
        }
        if (this.shouldParseNode(n) && parsed) {
          parser.parseDynamic(n, loading);
        }
      }
    },
    shouldLoadNode: function(node) {
      return node.nodeType === 1 && matches.call(node, importer.loadSelectorsForNode(node));
    },
    shouldParseNode: function(node) {
      return node.nodeType === 1 && matches.call(node, parser.parseSelectorsForNode(node));
    }
  };
  importer.observer.addCallback = dynamic.added.bind(dynamic);
  var matches = HTMLElement.prototype.matches || HTMLElement.prototype.matchesSelector || HTMLElement.prototype.webkitMatchesSelector || HTMLElement.prototype.mozMatchesSelector || HTMLElement.prototype.msMatchesSelector;
});

(function(scope) {
  var initializeModules = scope.initializeModules;
  var isIE = scope.isIE;
  if (scope.useNative) {
    return;
  }
  if (isIE && typeof window.CustomEvent !== "function") {
    window.CustomEvent = function(inType, params) {
      params = params || {};
      var e = document.createEvent("CustomEvent");
      e.initCustomEvent(inType, Boolean(params.bubbles), Boolean(params.cancelable), params.detail);
      return e;
    };
    window.CustomEvent.prototype = window.Event.prototype;
  }
  initializeModules();
  var rootDocument = scope.rootDocument;
  function bootstrap() {
    HTMLImports.importer.bootDocument(rootDocument);
  }
  if (document.readyState === "complete" || document.readyState === "interactive" && !window.attachEvent) {
    bootstrap();
  } else {
    document.addEventListener("DOMContentLoaded", bootstrap);
  }
})(HTMLImports);

window.CustomElements = window.CustomElements || {
  flags: {}
};

(function(scope) {
  var flags = scope.flags;
  var modules = [];
  var addModule = function(module) {
    modules.push(module);
  };
  var initializeModules = function() {
    modules.forEach(function(module) {
      module(scope);
    });
  };
  scope.addModule = addModule;
  scope.initializeModules = initializeModules;
  scope.hasNative = Boolean(document.registerElement);
  scope.useNative = !flags.register && scope.hasNative && !window.ShadowDOMPolyfill && (!window.HTMLImports || HTMLImports.useNative);
})(CustomElements);

CustomElements.addModule(function(scope) {
  var IMPORT_LINK_TYPE = window.HTMLImports ? HTMLImports.IMPORT_LINK_TYPE : "none";
  function forSubtree(node, cb) {
    findAllElements(node, function(e) {
      if (cb(e)) {
        return true;
      }
      forRoots(e, cb);
    });
    forRoots(node, cb);
  }
  function findAllElements(node, find, data) {
    var e = node.firstElementChild;
    if (!e) {
      e = node.firstChild;
      while (e && e.nodeType !== Node.ELEMENT_NODE) {
        e = e.nextSibling;
      }
    }
    while (e) {
      if (find(e, data) !== true) {
        findAllElements(e, find, data);
      }
      e = e.nextElementSibling;
    }
    return null;
  }
  function forRoots(node, cb) {
    var root = node.shadowRoot;
    while (root) {
      forSubtree(root, cb);
      root = root.olderShadowRoot;
    }
  }
  var processingDocuments;
  function forDocumentTree(doc, cb) {
    processingDocuments = [];
    _forDocumentTree(doc, cb);
    processingDocuments = null;
  }
  function _forDocumentTree(doc, cb) {
    doc = wrap(doc);
    if (processingDocuments.indexOf(doc) >= 0) {
      return;
    }
    processingDocuments.push(doc);
    var imports = doc.querySelectorAll("link[rel=" + IMPORT_LINK_TYPE + "]");
    for (var i = 0, l = imports.length, n; i < l && (n = imports[i]); i++) {
      if (n.import) {
        _forDocumentTree(n.import, cb);
      }
    }
    cb(doc);
  }
  scope.forDocumentTree = forDocumentTree;
  scope.forSubtree = forSubtree;
});

CustomElements.addModule(function(scope) {
  var flags = scope.flags;
  var forSubtree = scope.forSubtree;
  var forDocumentTree = scope.forDocumentTree;
  function addedNode(node) {
    return added(node) || addedSubtree(node);
  }
  function added(node) {
    if (scope.upgrade(node)) {
      return true;
    }
    attached(node);
  }
  function addedSubtree(node) {
    forSubtree(node, function(e) {
      if (added(e)) {
        return true;
      }
    });
  }
  function attachedNode(node) {
    attached(node);
    if (inDocument(node)) {
      forSubtree(node, function(e) {
        attached(e);
      });
    }
  }
  var hasPolyfillMutations = !window.MutationObserver || window.MutationObserver === window.JsMutationObserver;
  scope.hasPolyfillMutations = hasPolyfillMutations;
  var isPendingMutations = false;
  var pendingMutations = [];
  function deferMutation(fn) {
    pendingMutations.push(fn);
    if (!isPendingMutations) {
      isPendingMutations = true;
      setTimeout(takeMutations);
    }
  }
  function takeMutations() {
    isPendingMutations = false;
    var $p = pendingMutations;
    for (var i = 0, l = $p.length, p; i < l && (p = $p[i]); i++) {
      p();
    }
    pendingMutations = [];
  }
  function attached(element) {
    if (hasPolyfillMutations) {
      deferMutation(function() {
        _attached(element);
      });
    } else {
      _attached(element);
    }
  }
  function _attached(element) {
    if (element.__upgraded__ && (element.attachedCallback || element.detachedCallback)) {
      if (!element.__attached && inDocument(element)) {
        element.__attached = true;
        if (element.attachedCallback) {
          element.attachedCallback();
        }
      }
    }
  }
  function detachedNode(node) {
    detached(node);
    forSubtree(node, function(e) {
      detached(e);
    });
  }
  function detached(element) {
    if (hasPolyfillMutations) {
      deferMutation(function() {
        _detached(element);
      });
    } else {
      _detached(element);
    }
  }
  function _detached(element) {
    if (element.__upgraded__ && (element.attachedCallback || element.detachedCallback)) {
      if (element.__attached && !inDocument(element)) {
        element.__attached = false;
        if (element.detachedCallback) {
          element.detachedCallback();
        }
      }
    }
  }
  function inDocument(element) {
    var p = element;
    var doc = wrap(document);
    while (p) {
      if (p == doc) {
        return true;
      }
      p = p.parentNode || p.nodeType === Node.DOCUMENT_FRAGMENT_NODE && p.host;
    }
  }
  function watchShadow(node) {
    if (node.shadowRoot && !node.shadowRoot.__watched) {
      flags.dom && console.log("watching shadow-root for: ", node.localName);
      var root = node.shadowRoot;
      while (root) {
        observe(root);
        root = root.olderShadowRoot;
      }
    }
  }
  function handler(mutations) {
    if (flags.dom) {
      var mx = mutations[0];
      if (mx && mx.type === "childList" && mx.addedNodes) {
        if (mx.addedNodes) {
          var d = mx.addedNodes[0];
          while (d && d !== document && !d.host) {
            d = d.parentNode;
          }
          var u = d && (d.URL || d._URL || d.host && d.host.localName) || "";
          u = u.split("/?").shift().split("/").pop();
        }
      }
      console.group("mutations (%d) [%s]", mutations.length, u || "");
    }
    mutations.forEach(function(mx) {
      if (mx.type === "childList") {
        forEach(mx.addedNodes, function(n) {
          if (!n.localName) {
            return;
          }
          addedNode(n);
        });
        forEach(mx.removedNodes, function(n) {
          if (!n.localName) {
            return;
          }
          detachedNode(n);
        });
      }
    });
    flags.dom && console.groupEnd();
  }
  function takeRecords(node) {
    node = wrap(node);
    if (!node) {
      node = wrap(document);
    }
    while (node.parentNode) {
      node = node.parentNode;
    }
    var observer = node.__observer;
    if (observer) {
      handler(observer.takeRecords());
      takeMutations();
    }
  }
  var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);
  function observe(inRoot) {
    if (inRoot.__observer) {
      return;
    }
    var observer = new MutationObserver(handler);
    observer.observe(inRoot, {
      childList: true,
      subtree: true
    });
    inRoot.__observer = observer;
  }
  function upgradeDocument(doc) {
    doc = wrap(doc);
    flags.dom && console.group("upgradeDocument: ", doc.baseURI.split("/").pop());
    addedNode(doc);
    observe(doc);
    flags.dom && console.groupEnd();
  }
  function upgradeDocumentTree(doc) {
    forDocumentTree(doc, upgradeDocument);
  }
  var originalCreateShadowRoot = Element.prototype.createShadowRoot;
  if (originalCreateShadowRoot) {
    Element.prototype.createShadowRoot = function() {
      var root = originalCreateShadowRoot.call(this);
      CustomElements.watchShadow(this);
      return root;
    };
  }
  scope.watchShadow = watchShadow;
  scope.upgradeDocumentTree = upgradeDocumentTree;
  scope.upgradeSubtree = addedSubtree;
  scope.upgradeAll = addedNode;
  scope.attachedNode = attachedNode;
  scope.takeRecords = takeRecords;
});

CustomElements.addModule(function(scope) {
  var flags = scope.flags;
  function upgrade(node) {
    if (!node.__upgraded__ && node.nodeType === Node.ELEMENT_NODE) {
      var is = node.getAttribute("is");
      var definition = scope.getRegisteredDefinition(is || node.localName);
      if (definition) {
        if (is && definition.tag == node.localName) {
          return upgradeWithDefinition(node, definition);
        } else if (!is && !definition.extends) {
          return upgradeWithDefinition(node, definition);
        }
      }
    }
  }
  function upgradeWithDefinition(element, definition) {
    flags.upgrade && console.group("upgrade:", element.localName);
    if (definition.is) {
      element.setAttribute("is", definition.is);
    }
    implementPrototype(element, definition);
    element.__upgraded__ = true;
    created(element);
    scope.attachedNode(element);
    scope.upgradeSubtree(element);
    flags.upgrade && console.groupEnd();
    return element;
  }
  function implementPrototype(element, definition) {
    if (Object.__proto__) {
      element.__proto__ = definition.prototype;
    } else {
      customMixin(element, definition.prototype, definition.native);
      element.__proto__ = definition.prototype;
    }
  }
  function customMixin(inTarget, inSrc, inNative) {
    var used = {};
    var p = inSrc;
    while (p !== inNative && p !== HTMLElement.prototype) {
      var keys = Object.getOwnPropertyNames(p);
      for (var i = 0, k; k = keys[i]; i++) {
        if (!used[k]) {
          Object.defineProperty(inTarget, k, Object.getOwnPropertyDescriptor(p, k));
          used[k] = 1;
        }
      }
      p = Object.getPrototypeOf(p);
    }
  }
  function created(element) {
    if (element.createdCallback) {
      element.createdCallback();
    }
  }
  scope.upgrade = upgrade;
  scope.upgradeWithDefinition = upgradeWithDefinition;
  scope.implementPrototype = implementPrototype;
});

CustomElements.addModule(function(scope) {
  var upgradeDocumentTree = scope.upgradeDocumentTree;
  var upgrade = scope.upgrade;
  var upgradeWithDefinition = scope.upgradeWithDefinition;
  var implementPrototype = scope.implementPrototype;
  var useNative = scope.useNative;
  function register(name, options) {
    var definition = options || {};
    if (!name) {
      throw new Error("document.registerElement: first argument `name` must not be empty");
    }
    if (name.indexOf("-") < 0) {
      throw new Error("document.registerElement: first argument ('name') must contain a dash ('-'). Argument provided was '" + String(name) + "'.");
    }
    if (isReservedTag(name)) {
      throw new Error("Failed to execute 'registerElement' on 'Document': Registration failed for type '" + String(name) + "'. The type name is invalid.");
    }
    if (getRegisteredDefinition(name)) {
      throw new Error("DuplicateDefinitionError: a type with name '" + String(name) + "' is already registered");
    }
    if (!definition.prototype) {
      definition.prototype = Object.create(HTMLElement.prototype);
    }
    definition.__name = name.toLowerCase();
    definition.lifecycle = definition.lifecycle || {};
    definition.ancestry = ancestry(definition.extends);
    resolveTagName(definition);
    resolvePrototypeChain(definition);
    overrideAttributeApi(definition.prototype);
    registerDefinition(definition.__name, definition);
    definition.ctor = generateConstructor(definition);
    definition.ctor.prototype = definition.prototype;
    definition.prototype.constructor = definition.ctor;
    if (scope.ready) {
      upgradeDocumentTree(document);
    }
    return definition.ctor;
  }
  function overrideAttributeApi(prototype) {
    if (prototype.setAttribute._polyfilled) {
      return;
    }
    var setAttribute = prototype.setAttribute;
    prototype.setAttribute = function(name, value) {
      changeAttribute.call(this, name, value, setAttribute);
    };
    var removeAttribute = prototype.removeAttribute;
    prototype.removeAttribute = function(name) {
      changeAttribute.call(this, name, null, removeAttribute);
    };
    prototype.setAttribute._polyfilled = true;
  }
  function changeAttribute(name, value, operation) {
    name = name.toLowerCase();
    var oldValue = this.getAttribute(name);
    operation.apply(this, arguments);
    var newValue = this.getAttribute(name);
    if (this.attributeChangedCallback && newValue !== oldValue) {
      this.attributeChangedCallback(name, oldValue, newValue);
    }
  }
  function isReservedTag(name) {
    for (var i = 0; i < reservedTagList.length; i++) {
      if (name === reservedTagList[i]) {
        return true;
      }
    }
  }
  var reservedTagList = [ "annotation-xml", "color-profile", "font-face", "font-face-src", "font-face-uri", "font-face-format", "font-face-name", "missing-glyph" ];
  function ancestry(extnds) {
    var extendee = getRegisteredDefinition(extnds);
    if (extendee) {
      return ancestry(extendee.extends).concat([ extendee ]);
    }
    return [];
  }
  function resolveTagName(definition) {
    var baseTag = definition.extends;
    for (var i = 0, a; a = definition.ancestry[i]; i++) {
      baseTag = a.is && a.tag;
    }
    definition.tag = baseTag || definition.__name;
    if (baseTag) {
      definition.is = definition.__name;
    }
  }
  function resolvePrototypeChain(definition) {
    if (!Object.__proto__) {
      var nativePrototype = HTMLElement.prototype;
      if (definition.is) {
        var inst = document.createElement(definition.tag);
        var expectedPrototype = Object.getPrototypeOf(inst);
        if (expectedPrototype === definition.prototype) {
          nativePrototype = expectedPrototype;
        }
      }
      var proto = definition.prototype, ancestor;
      while (proto && proto !== nativePrototype) {
        ancestor = Object.getPrototypeOf(proto);
        proto.__proto__ = ancestor;
        proto = ancestor;
      }
      definition.native = nativePrototype;
    }
  }
  function instantiate(definition) {
    return upgradeWithDefinition(domCreateElement(definition.tag), definition);
  }
  var registry = {};
  function getRegisteredDefinition(name) {
    if (name) {
      return registry[name.toLowerCase()];
    }
  }
  function registerDefinition(name, definition) {
    registry[name] = definition;
  }
  function generateConstructor(definition) {
    return function() {
      return instantiate(definition);
    };
  }
  var HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
  function createElementNS(namespace, tag, typeExtension) {
    if (namespace === HTML_NAMESPACE) {
      return createElement(tag, typeExtension);
    } else {
      return domCreateElementNS(namespace, tag);
    }
  }
  function createElement(tag, typeExtension) {
    var definition = getRegisteredDefinition(typeExtension || tag);
    if (definition) {
      if (tag == definition.tag && typeExtension == definition.is) {
        return new definition.ctor();
      }
      if (!typeExtension && !definition.is) {
        return new definition.ctor();
      }
    }
    var element;
    if (typeExtension) {
      element = createElement(tag);
      element.setAttribute("is", typeExtension);
      return element;
    }
    element = domCreateElement(tag);
    if (tag.indexOf("-") >= 0) {
      implementPrototype(element, HTMLElement);
    }
    return element;
  }
  function cloneNode(deep) {
    var n = domCloneNode.call(this, deep);
    upgrade(n);
    return n;
  }
  var domCreateElement = document.createElement.bind(document);
  var domCreateElementNS = document.createElementNS.bind(document);
  var domCloneNode = Node.prototype.cloneNode;
  var isInstance;
  if (!Object.__proto__ && !useNative) {
    isInstance = function(obj, ctor) {
      var p = obj;
      while (p) {
        if (p === ctor.prototype) {
          return true;
        }
        p = p.__proto__;
      }
      return false;
    };
  } else {
    isInstance = function(obj, base) {
      return obj instanceof base;
    };
  }
  document.registerElement = register;
  document.createElement = createElement;
  document.createElementNS = createElementNS;
  Node.prototype.cloneNode = cloneNode;
  scope.registry = registry;
  scope.instanceof = isInstance;
  scope.reservedTagList = reservedTagList;
  scope.getRegisteredDefinition = getRegisteredDefinition;
  document.register = document.registerElement;
});

(function(scope) {
  var useNative = scope.useNative;
  var initializeModules = scope.initializeModules;
  var isIE11OrOlder = /Trident/.test(navigator.userAgent);
  if (isIE11OrOlder) {
    (function() {
      var importNode = document.importNode;
      document.importNode = function() {
        var n = importNode.apply(document, arguments);
        if (n.nodeType == n.DOCUMENT_FRAGMENT_NODE) {
          var f = document.createDocumentFragment();
          f.appendChild(n);
          return f;
        } else {
          return n;
        }
      };
    })();
  }
  if (useNative) {
    var nop = function() {};
    scope.watchShadow = nop;
    scope.upgrade = nop;
    scope.upgradeAll = nop;
    scope.upgradeDocumentTree = nop;
    scope.upgradeSubtree = nop;
    scope.takeRecords = nop;
    scope.instanceof = function(obj, base) {
      return obj instanceof base;
    };
  } else {
    initializeModules();
  }
  var upgradeDocumentTree = scope.upgradeDocumentTree;
  if (!window.wrap) {
    if (window.ShadowDOMPolyfill) {
      window.wrap = ShadowDOMPolyfill.wrapIfNeeded;
      window.unwrap = ShadowDOMPolyfill.unwrapIfNeeded;
    } else {
      window.wrap = window.unwrap = function(node) {
        return node;
      };
    }
  }
  function bootstrap() {
    upgradeDocumentTree(wrap(document));
    if (window.HTMLImports) {
      HTMLImports.__importsParsingHook = function(elt) {
        upgradeDocumentTree(wrap(elt.import));
      };
    }
    CustomElements.ready = true;
    setTimeout(function() {
      CustomElements.readyTime = Date.now();
      if (window.HTMLImports) {
        CustomElements.elapsed = CustomElements.readyTime - HTMLImports.readyTime;
      }
      document.dispatchEvent(new CustomEvent("WebComponentsReady", {
        bubbles: true
      }));
    });
  }
  if (isIE11OrOlder && typeof window.CustomEvent !== "function") {
    window.CustomEvent = function(inType, params) {
      params = params || {};
      var e = document.createEvent("CustomEvent");
      e.initCustomEvent(inType, Boolean(params.bubbles), Boolean(params.cancelable), params.detail);
      return e;
    };
    window.CustomEvent.prototype = window.Event.prototype;
  }
  if (document.readyState === "complete" || scope.flags.eager) {
    bootstrap();
  } else if (document.readyState === "interactive" && !window.attachEvent && (!window.HTMLImports || window.HTMLImports.ready)) {
    bootstrap();
  } else {
    var loadEvent = window.HTMLImports && !HTMLImports.ready ? "HTMLImportsLoaded" : "DOMContentLoaded";
    window.addEventListener(loadEvent, bootstrap);
  }
})(window.CustomElements);

if (typeof HTMLTemplateElement === "undefined") {
  (function() {
    var TEMPLATE_TAG = "template";
    HTMLTemplateElement = function() {};
    HTMLTemplateElement.prototype = Object.create(HTMLElement.prototype);
    HTMLTemplateElement.decorate = function(template) {
      if (!template.content) {
        template.content = template.ownerDocument.createDocumentFragment();
        var child;
        while (child = template.firstChild) {
          template.content.appendChild(child);
        }
      }
    };
    HTMLTemplateElement.bootstrap = function(doc) {
      var templates = doc.querySelectorAll(TEMPLATE_TAG);
      for (var i = 0, l = templates.length, t; i < l && (t = templates[i]); i++) {
        HTMLTemplateElement.decorate(t);
      }
    };
    addEventListener("DOMContentLoaded", function() {
      HTMLTemplateElement.bootstrap(document);
    });
  })();
}

(function(scope) {
  var style = document.createElement("style");
  style.textContent = "" + "body {" + "transition: opacity ease-in 0.2s;" + " } \n" + "body[unresolved] {" + "opacity: 0; display: block; overflow: hidden; position: relative;" + " } \n";
  var head = document.querySelector("head");
  head.insertBefore(style, head.firstChild);
})(window.WebComponents);
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9vcGVubXVzaWMtZGVtby1ndWxwLXRhc2tzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZW1vL21haW4uanMiLCJpbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9vcGVubXVzaWMtZGVtby1ndWxwLXRhc2tzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvb3Blbm11c2ljLWRlbW8tZ3VscC10YXNrcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliL2I2NC5qcyIsIm5vZGVfbW9kdWxlcy9vcGVubXVzaWMtZGVtby1ndWxwLXRhc2tzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvb3Blbm11c2ljLWRlbW8tZ3VscC10YXNrcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9pcy1hcnJheS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9vcGVubXVzaWMtZGVtby1ndWxwLXRhc2tzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvb3Blbm11c2ljLWRydW0tbWFjaGluZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9vcGVubXVzaWMtZHJ1bS1tYWNoaW5lL25vZGVfbW9kdWxlcy9lczYtcHJvbWlzZS9kaXN0L2VzNi1wcm9taXNlLmpzIiwibm9kZV9tb2R1bGVzL29wZW5tdXNpYy1kcnVtLW1hY2hpbmUvbm9kZV9tb2R1bGVzL29wZW5tdXNpYy1zYW1wbGUtcGxheWVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL29wZW5tdXNpYy1kcnVtLW1hY2hpbmUvbm9kZV9tb2R1bGVzL3NldHRlci1nZXR0ZXJpZnkvbWFpbi5qcyIsIm5vZGVfbW9kdWxlcy9vcGVubXVzaWMtb3NjaWxsb3Njb3BlL09zY2lsbG9zY29wZS5qcyIsIm5vZGVfbW9kdWxlcy9vcGVubXVzaWMtdHJhbnNwb3J0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL29wZW5tdXNpYy10cmFuc3BvcnQvbm9kZV9tb2R1bGVzL29wZW5tdXNpYy1zbGlkZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2ViY29tcG9uZW50cy1saXRlL3dlYmNvbXBvbmVudHMtbGl0ZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3Q0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3JLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzc3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJyZXF1aXJlKCd3ZWJjb21wb25lbnRzLWxpdGUnKTtcbnJlcXVpcmUoJ29wZW5tdXNpYy1vc2NpbGxvc2NvcGUnKS5yZWdpc3Rlcignb3Blbm11c2ljLW9zY2lsbG9zY29wZScpO1xucmVxdWlyZSgnb3Blbm11c2ljLXRyYW5zcG9ydCcpLnJlZ2lzdGVyKCdvcGVubXVzaWMtdHJhbnNwb3J0Jyk7XG5yZXF1aXJlKCcuLi8nKS5yZWdpc3Rlcignb3Blbm11c2ljLWRydW0tbWFjaGluZS11aScpO1xuXG52YXIgYWMgPSBuZXcgQXVkaW9Db250ZXh0KCk7XG52YXIgbWFzdGVyVm9sdW1lID0gYWMuY3JlYXRlR2FpbigpO1xubWFzdGVyVm9sdW1lLmdhaW4udmFsdWUgPSAwLjA1O1xubWFzdGVyVm9sdW1lLmNvbm5lY3QoYWMuZGVzdGluYXRpb24pO1xuXG52YXIgbGltaXRlciA9IGFjLmNyZWF0ZUR5bmFtaWNzQ29tcHJlc3NvcigpO1xubGltaXRlci5jb25uZWN0KG1hc3RlclZvbHVtZSk7XG5cbnZhciBhbmFseXNlciA9IGFjLmNyZWF0ZUFuYWx5c2VyKCk7XG52YXIgb3NjaWxsb3Njb3BlID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcignb3Blbm11c2ljLW9zY2lsbG9zY29wZScpO1xub3NjaWxsb3Njb3BlLmF0dGFjaFRvKGFuYWx5c2VyKTtcblxuYW5hbHlzZXIuY29ubmVjdChsaW1pdGVyKTtcblxudmFyIERydW1NYWNoaW5lID0gcmVxdWlyZSgnb3Blbm11c2ljLWRydW0tbWFjaGluZScpO1xudmFyIGRydW1NYWNoaW5lTm9kZSA9IERydW1NYWNoaW5lKGFjKTtcbmRydW1NYWNoaW5lTm9kZS5jb25uZWN0KGFuYWx5c2VyKTtcblxudmFyIGRydW1NYWNoaW5lRWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ29wZW5tdXNpYy1kcnVtLW1hY2hpbmUtdWknKTtcblxuZHJ1bU1hY2hpbmVOb2RlLnJlYWR5KCkudGhlbihmdW5jdGlvbigpIHtcblx0ZHJ1bU1hY2hpbmVFbGVtZW50LmF0dGFjaFRvKGRydW1NYWNoaW5lTm9kZSk7XG59KS5jYXRjaChmdW5jdGlvbihob3Jyb3IpIHtcblx0Y29uc29sZS5lcnJvcignT01HJywgaG9ycm9yKTtcbn0pO1xuXG52YXIgdHJhbnNwb3J0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcignb3Blbm11c2ljLXRyYW5zcG9ydCcpO1xudHJhbnNwb3J0LmFkZEV2ZW50TGlzdGVuZXIoJ3BsYXknLCBmdW5jdGlvbigpIHtcblx0ZHJ1bU1hY2hpbmVOb2RlLnN0YXJ0KCk7XG59KTtcblxudHJhbnNwb3J0LmFkZEV2ZW50TGlzdGVuZXIoJ3N0b3AnLCBmdW5jdGlvbigpIHtcblx0ZHJ1bU1hY2hpbmVOb2RlLnN0b3AoKTtcbn0pO1xuXG50cmFuc3BvcnQuYWRkRXZlbnRMaXN0ZW5lcignYnBtJywgZnVuY3Rpb24oZXYpIHtcblx0ZHJ1bU1hY2hpbmVOb2RlLmJwbSA9IGV2LmRldGFpbC52YWx1ZTtcbn0pO1xuXG4iLCIoZnVuY3Rpb24oKSB7XG5cdHZhciBwcm90byA9IE9iamVjdC5jcmVhdGUoSFRNTEVsZW1lbnQucHJvdG90eXBlKTtcblx0XG5cdHByb3RvLmNyZWF0ZWRDYWxsYmFjayA9IGZ1bmN0aW9uKCkge1xuXHRcdFxuXHRcdHRoaXMudmFsdWVzID0ge307XG5cdFx0dGhpcy5hdHRhY2hlZE5vZGUgPSBudWxsO1xuXG5cdFx0Ly8gbWFraW5nIHdlYiBjb21wb25lbnRzIE1XQyBmcmFtZXdvcmsgcHJvb2YuXG5cdFx0dGhpcy5pbm5lckhUTUwgPSAnJztcblxuXHRcdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHQvLyBDdXJyZW50IHBhdHRlcm4gWyAwMDEgXSA8ID4gWyArIF0gWyAtIF0gLy8gPC0tIE5vdCBmb3IgdGhpcyBpdGVyYXRpb25cblx0XHQvLyBQYXR0ZXJuXG5cdFx0Ly8gRHJ1bSAgICAgICB4IG9cblx0XHQvLyBTbmFyZSAgICAgIHggb1xuXHRcdC8vIENsb3NlZCBIYXQgeCBvIC4uLlxuXHRcdC8vIHN0ZXAgICAgICAgLiBPIC4gLi4uLlxuXHRcdGRpdi5pbm5lckhUTUwgPSAnRHJ1bSBNYWNoaW5lJztcblx0XHR0aGlzLmFwcGVuZENoaWxkKGRpdik7XG5cdFx0XG5cdFx0dGhpcy5yZWFkQXR0cmlidXRlcygpO1xuXHRcdFxuXHR9O1xuXG5cdFxuXHRwcm90by5hdHRhY2hlZENhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG5cdFx0Ly8gU2V0dXAgaW5wdXQgbGlzdGVuZXJzLCBwZXJoYXBzIHN0YXJ0IHJlcXVlc3RBbmltYXRpb25GcmFtZSBoZXJlXG5cdH07XG5cblxuXHRwcm90by5kZXRhY2hlZENhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG5cdH07XG5cblxuXHRwcm90by5yZWFkQXR0cmlidXRlcyA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRbXS5mb3JFYWNoKGZ1bmN0aW9uKGF0dHIpIHtcblx0XHRcdHRoYXQuc2V0VmFsdWUoYXR0ciwgdGhhdC5nZXRBdHRyaWJ1dGUoYXR0cikpO1x0XHRcblx0XHR9KTtcblx0fTtcblxuXHRcblx0cHJvdG8uc2V0VmFsdWUgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuXG5cdFx0aWYodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuXHRcdFx0dGhpcy52YWx1ZXNbbmFtZV0gPSB2YWx1ZTtcblx0XHR9XG5cblx0XHQvLyBUT0RPOiBQb3RlbnRpYWwgcmUtZHJhdyBvciBET00gdXBkYXRlIGluIHJlYWN0aW9uIHRvIHRoZXNlIHZhbHVlc1xuXHR9O1xuXG5cblx0cHJvdG8uZ2V0VmFsdWUgPSBmdW5jdGlvbihuYW1lKSB7XG5cdFx0cmV0dXJuIHRoaXMudmFsdWVzW25hbWVdO1xuXHR9O1xuXG5cdFxuXHRwcm90by5hdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2sgPSBmdW5jdGlvbihhdHRyLCBvbGRWYWx1ZSwgbmV3VmFsdWUsIG5hbWVzcGFjZSkge1xuXHRcdFxuXHRcdHRoaXMuc2V0VmFsdWUoYXR0ciwgbmV3VmFsdWUpO1xuXHRcdFxuXHRcdC8vIHZhciBlID0gbmV3IEN1c3RvbUV2ZW50KCdjaGFuZ2UnLCB7IGRldGFpbDogdGhpcy52YWx1ZXMgfSB9KTtcblx0XHQvLyB0aGlzLmRpc3BhdGNoRXZlbnQoZSk7XG5cdFx0XG5cdH07XG5cblxuXHRwcm90by5hdHRhY2hUbyA9IGZ1bmN0aW9uKGF1ZGlvTm9kZSkge1xuXG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXG5cdFx0YXVkaW9Ob2RlLmFkZEV2ZW50TGlzdGVuZXIoJ3N0ZXAnLCBmdW5jdGlvbihlKSB7XG5cdFx0XHR2YXIgc3RlcCA9IGUuZGV0YWlsLnZhbHVlO1xuXHRcdFx0dGhhdC5faGlnaGxpZ2h0U3RlcChzdGVwKTtcblx0XHR9KTtcblxuXHRcdHRoaXMuYXR0YWNoZWROb2RlID0gYXVkaW9Ob2RlO1xuXG5cdFx0dGhpcy5zZXR1cERPTSgpO1xuXHRcdFxuXHR9O1xuXG5cdHByb3RvLnNldHVwRE9NID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGRtID0gdGhpcy5hdHRhY2hlZE5vZGU7XG5cdFx0XG5cdFx0aWYoZG0gPT09IG51bGwpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR2YXIgbnVtU3RlcHMgPSBkbS5zdGVwcztcblx0XHR2YXIgbnVtVHJhY2tzID0gZG0udHJhY2tzO1xuXHRcdFxuXHRcdGlmKG51bVRyYWNrcyA9PT0gMCkge1xuXHRcdFx0Y29uc29sZS5lcnJvcignTm8gdHJhY2tzIGluIHRoZSBtYWNoaW5lLXBlcmhhcHMgeW91IGRpZCBub3QgdXNlIHJlYWR5KCk/Jyk7XG5cdFx0fVxuXG5cdFx0dGhpcy5pbm5lckhUTUwgPSAnJztcblxuXHRcdHZhciBtYXRyaXggPSB0aGlzLl9tYWtlTWF0cml4KG51bVN0ZXBzLCBudW1UcmFja3MpO1xuXHRcdHRoaXMuX21hdHJpeFRhYmxlID0gbWF0cml4LnRhYmxlO1xuXHRcdHRoaXMuX21hdHJpeElucHV0cyA9IG1hdHJpeC5pbnB1dHM7XG5cdFx0dGhpcy5hcHBlbmRDaGlsZChtYXRyaXgudGFibGUpO1xuXG5cdFx0dGhpcy5fcmVhZEN1cnJlbnRQYXR0ZXJuKCk7XG5cblx0fTtcblxuXG5cdHByb3RvLl9tYWtlTWF0cml4ID0gZnVuY3Rpb24obnVtU3RlcHMsIG51bVRyYWNrcykge1xuXHRcdHZhciBpbnB1dHMgPSBbXTtcblx0XHR2YXIgdGFibGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0YWJsZScpO1xuXHRcdHZhciBvbklucHV0ID0gb25QYXR0ZXJuQ2VsbElucHV0LmJpbmQodGhpcyk7XG5cdFx0Zm9yKHZhciBpID0gMDsgaSA8IG51bVRyYWNrczsgaSsrKSB7XG5cdFx0XHR2YXIgcm93ID0gdGFibGUuaW5zZXJ0Um93KCk7XG5cdFx0XHR2YXIgaW5wdXRSb3cgPSBbXTtcblx0XHRcdGZvcih2YXIgaiA9IDA7IGogPCBudW1TdGVwczsgaisrKSB7XG5cdFx0XHRcdHZhciBjZWxsID0gcm93Lmluc2VydENlbGwoKTtcblx0XHRcdFx0Y2VsbC5jbGFzc0xpc3QuYWRkKCdzdGVwJyArIGopO1xuXHRcdFx0XHR2YXIgY2hlY2tib3ggPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuXHRcdFx0XHRjaGVja2JveC50eXBlID0gJ2NoZWNrYm94Jztcblx0XHRcdFx0Y2hlY2tib3guZGF0YXNldC50cmFjayA9IGk7XG5cdFx0XHRcdGNoZWNrYm94LmRhdGFzZXQuc3RlcCA9IGo7XG5cdFx0XHRcdGNoZWNrYm94LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIG9uSW5wdXQpO1xuXHRcdFx0XHRjZWxsLmFwcGVuZENoaWxkKGNoZWNrYm94KTtcblx0XHRcdFx0aW5wdXRSb3cucHVzaChjaGVja2JveCk7XG5cdFx0XHR9XG5cdFx0XHRpbnB1dHMucHVzaChpbnB1dFJvdyk7XG5cdFx0fVxuXHRcdHJldHVybiB7IHRhYmxlOiB0YWJsZSwgaW5wdXRzOiBpbnB1dHMgfTtcblx0fTtcblxuXG5cdGZ1bmN0aW9uIG9uUGF0dGVybkNlbGxJbnB1dChldikge1xuXHRcdHZhciB0YXJnZXQgPSBldi50YXJnZXQ7XG5cdFx0dmFyIHRyYWNrID0gdGFyZ2V0LmRhdGFzZXQudHJhY2s7XG5cdFx0dmFyIHN0ZXAgPSB0YXJnZXQuZGF0YXNldC5zdGVwO1xuXHRcdHZhciB0cmlnZ2VyID0gdGFyZ2V0LmNoZWNrZWQgPyAxIDogMDtcblx0XHRcblx0XHR0aGlzLl9zZXRQYXR0ZXJuU3RlcCh0cmFjaywgc3RlcCwgdHJpZ2dlcik7XG5cdH1cblxuXG5cdHByb3RvLl9oaWdobGlnaHRTdGVwID0gZnVuY3Rpb24oc3RlcCkge1xuXHRcdHZhciBjbGFzc1RvSGlnaGxpZ2h0ID0gJ3N0ZXAnICsgc3RlcDtcblx0XHR2YXIgaGlnaGxpZ2h0Q2xhc3MgPSAnaGlnaGxpZ2h0Jztcblx0XHR2YXIgZXhpc3RpbmdIaWdobGlnaHQgPSB0aGlzLnF1ZXJ5U2VsZWN0b3JBbGwoJ1tjbGFzcyo9JyArIGhpZ2hsaWdodENsYXNzICsgJ10nKTtcblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgZXhpc3RpbmdIaWdobGlnaHQubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBlbCA9IGV4aXN0aW5nSGlnaGxpZ2h0W2ldO1xuXHRcdFx0ZWwuY2xhc3NMaXN0LnJlbW92ZShoaWdobGlnaHRDbGFzcyk7XG5cdFx0fVxuXG5cdFx0dmFyIHRvSGlnaGxpZ2h0ID0gdGhpcy5xdWVyeVNlbGVjdG9yQWxsKCdbY2xhc3M9JyArIGNsYXNzVG9IaWdobGlnaHQgKyAnXScpO1xuXHRcdGZvcih2YXIgaiA9IDA7IGogPCB0b0hpZ2hsaWdodC5sZW5ndGg7IGorKykge1xuXHRcdFx0dmFyIGVsMiA9IHRvSGlnaGxpZ2h0W2pdO1xuXHRcdFx0ZWwyLmNsYXNzTGlzdC5hZGQoaGlnaGxpZ2h0Q2xhc3MpO1xuXHRcdH1cblx0fTtcblxuXG5cdHByb3RvLl9yZWFkQ3VycmVudFBhdHRlcm4gPSBmdW5jdGlvbigpIHtcblx0XHRcblx0XHR2YXIgaW5wdXRzID0gdGhpcy5fbWF0cml4SW5wdXRzO1xuXHRcdHZhciBwYXR0ZXJuID0gdGhpcy5hdHRhY2hlZE5vZGUuY3VycmVudFBhdHRlcm47XG5cdFx0cGF0dGVybi5mb3JFYWNoKGZ1bmN0aW9uKHRyYWNrLCBpKSB7XG5cdFx0XHR2YXIgdHJhY2tJbnB1dHMgPSBpbnB1dHNbaV07XG5cdFx0XHRmb3IodmFyIGogPSAwOyBqIDwgdHJhY2subGVuZ3RoOyBqKyspIHtcblx0XHRcdFx0dmFyIHRyaWdnZXIgPSB0cmFja1tqXTtcblx0XHRcdFx0dmFyIGlucHV0ID0gdHJhY2tJbnB1dHNbal07XG5cdFx0XHRcdGlucHV0LmNoZWNrZWQgPSAodHJpZ2dlciA9PT0gMSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0XG5cdH07XG5cblxuXHRwcm90by5fc2V0UGF0dGVyblN0ZXAgPSBmdW5jdGlvbih0cmFjaywgc3RlcCwgdHJpZ2dlcikge1xuXHRcdHRoaXMuYXR0YWNoZWROb2RlLnNldFN0ZXAodHJhY2ssIHN0ZXAsIHRyaWdnZXIpO1xuXHRcdHRoaXMuX3JlYWRDdXJyZW50UGF0dGVybigpO1xuXHR9O1xuXG5cblx0Ly9cblxuXG5cdHZhciBjb21wb25lbnQgPSB7fTtcblx0Y29tcG9uZW50LnByb3RvdHlwZSA9IHByb3RvO1xuXHRjb21wb25lbnQucmVnaXN0ZXIgPSBmdW5jdGlvbihuYW1lKSB7XG5cdFx0ZG9jdW1lbnQucmVnaXN0ZXJFbGVtZW50KG5hbWUsIHtcblx0XHRcdHByb3RvdHlwZTogcHJvdG9cblx0XHR9KTtcblx0fTtcblxuXHRpZih0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcblx0XHRkZWZpbmUoZnVuY3Rpb24oKSB7IHJldHVybiBjb21wb25lbnQ7IH0pO1xuXHR9IGVsc2UgaWYodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGNvbXBvbmVudDtcblx0fSBlbHNlIHtcblx0XHRjb21wb25lbnQucmVnaXN0ZXIoJ29wZW5tdXNpYy1kcnVtLW1hY2hpbmUtdWknKTsgLy8gYXV0b21hdGljIHJlZ2lzdHJhdGlvblxuXHR9XG5cbn0pLmNhbGwodGhpcyk7XG5cbiIsIi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxudmFyIGlzQXJyYXkgPSByZXF1aXJlKCdpcy1hcnJheScpXG5cbmV4cG9ydHMuQnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLlNsb3dCdWZmZXIgPSBTbG93QnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTIgLy8gbm90IHVzZWQgYnkgdGhpcyBpbXBsZW1lbnRhdGlvblxuXG52YXIga01heExlbmd0aCA9IDB4M2ZmZmZmZmZcbnZhciByb290UGFyZW50ID0ge31cblxuLyoqXG4gKiBJZiBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAobW9zdCBjb21wYXRpYmxlLCBldmVuIElFNilcbiAqXG4gKiBCcm93c2VycyB0aGF0IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssIENocm9tZSA3KywgU2FmYXJpIDUuMSssXG4gKiBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gKlxuICogTm90ZTpcbiAqXG4gKiAtIEltcGxlbWVudGF0aW9uIG11c3Qgc3VwcG9ydCBhZGRpbmcgbmV3IHByb3BlcnRpZXMgdG8gYFVpbnQ4QXJyYXlgIGluc3RhbmNlcy5cbiAqICAgRmlyZWZveCA0LTI5IGxhY2tlZCBzdXBwb3J0LCBmaXhlZCBpbiBGaXJlZm94IDMwKy5cbiAqICAgU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzguXG4gKlxuICogIC0gQ2hyb21lIDktMTAgaXMgbWlzc2luZyB0aGUgYFR5cGVkQXJyYXkucHJvdG90eXBlLnN1YmFycmF5YCBmdW5jdGlvbi5cbiAqXG4gKiAgLSBJRTEwIGhhcyBhIGJyb2tlbiBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYXJyYXlzIG9mXG4gKiAgICBpbmNvcnJlY3QgbGVuZ3RoIGluIHNvbWUgc2l0dWF0aW9ucy5cbiAqXG4gKiBXZSBkZXRlY3QgdGhlc2UgYnVnZ3kgYnJvd3NlcnMgYW5kIHNldCBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgIHRvIGBmYWxzZWAgc28gdGhleSB3aWxsXG4gKiBnZXQgdGhlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiwgd2hpY2ggaXMgc2xvd2VyIGJ1dCB3aWxsIHdvcmsgY29ycmVjdGx5LlxuICovXG5CdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCA9IChmdW5jdGlvbiAoKSB7XG4gIHRyeSB7XG4gICAgdmFyIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcigwKVxuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgYXJyLmZvbyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH1cbiAgICByZXR1cm4gYXJyLmZvbygpID09PSA0MiAmJiAvLyB0eXBlZCBhcnJheSBpbnN0YW5jZXMgY2FuIGJlIGF1Z21lbnRlZFxuICAgICAgICB0eXBlb2YgYXJyLnN1YmFycmF5ID09PSAnZnVuY3Rpb24nICYmIC8vIGNocm9tZSA5LTEwIGxhY2sgYHN1YmFycmF5YFxuICAgICAgICBuZXcgVWludDhBcnJheSgxKS5zdWJhcnJheSgxLCAxKS5ieXRlTGVuZ3RoID09PSAwIC8vIGllMTAgaGFzIGJyb2tlbiBgc3ViYXJyYXlgXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufSkoKVxuXG4vKipcbiAqIENsYXNzOiBCdWZmZXJcbiAqID09PT09PT09PT09PT1cbiAqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGFyZSBhdWdtZW50ZWRcbiAqIHdpdGggZnVuY3Rpb24gcHJvcGVydGllcyBmb3IgYWxsIHRoZSBub2RlIGBCdWZmZXJgIEFQSSBmdW5jdGlvbnMuIFdlIHVzZVxuICogYFVpbnQ4QXJyYXlgIHNvIHRoYXQgc3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXQgcmV0dXJuc1xuICogYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogQnkgYXVnbWVudGluZyB0aGUgaW5zdGFuY2VzLCB3ZSBjYW4gYXZvaWQgbW9kaWZ5aW5nIHRoZSBgVWludDhBcnJheWBcbiAqIHByb3RvdHlwZS5cbiAqL1xuZnVuY3Rpb24gQnVmZmVyIChhcmcpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEJ1ZmZlcikpIHtcbiAgICAvLyBBdm9pZCBnb2luZyB0aHJvdWdoIGFuIEFyZ3VtZW50c0FkYXB0b3JUcmFtcG9saW5lIGluIHRoZSBjb21tb24gY2FzZS5cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHJldHVybiBuZXcgQnVmZmVyKGFyZywgYXJndW1lbnRzWzFdKVxuICAgIHJldHVybiBuZXcgQnVmZmVyKGFyZylcbiAgfVxuXG4gIHRoaXMubGVuZ3RoID0gMFxuICB0aGlzLnBhcmVudCA9IHVuZGVmaW5lZFxuXG4gIC8vIENvbW1vbiBjYXNlLlxuICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicpIHtcbiAgICByZXR1cm4gZnJvbU51bWJlcih0aGlzLCBhcmcpXG4gIH1cblxuICAvLyBTbGlnaHRseSBsZXNzIGNvbW1vbiBjYXNlLlxuICBpZiAodHlwZW9mIGFyZyA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZnJvbVN0cmluZyh0aGlzLCBhcmcsIGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogJ3V0ZjgnKVxuICB9XG5cbiAgLy8gVW51c3VhbC5cbiAgcmV0dXJuIGZyb21PYmplY3QodGhpcywgYXJnKVxufVxuXG5mdW5jdGlvbiBmcm9tTnVtYmVyICh0aGF0LCBsZW5ndGgpIHtcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aCA8IDAgPyAwIDogY2hlY2tlZChsZW5ndGgpIHwgMClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoYXRbaV0gPSAwXG4gICAgfVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21TdHJpbmcgKHRoYXQsIHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycgfHwgZW5jb2RpbmcgPT09ICcnKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIC8vIEFzc3VtcHRpb246IGJ5dGVMZW5ndGgoKSByZXR1cm4gdmFsdWUgaXMgYWx3YXlzIDwga01heExlbmd0aC5cbiAgdmFyIGxlbmd0aCA9IGJ5dGVMZW5ndGgoc3RyaW5nLCBlbmNvZGluZykgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG5cbiAgdGhhdC53cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tT2JqZWN0ICh0aGF0LCBvYmplY3QpIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihvYmplY3QpKSByZXR1cm4gZnJvbUJ1ZmZlcih0aGF0LCBvYmplY3QpXG5cbiAgaWYgKGlzQXJyYXkob2JqZWN0KSkgcmV0dXJuIGZyb21BcnJheSh0aGF0LCBvYmplY3QpXG5cbiAgaWYgKG9iamVjdCA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbXVzdCBzdGFydCB3aXRoIG51bWJlciwgYnVmZmVyLCBhcnJheSBvciBzdHJpbmcnKVxuICB9XG5cbiAgaWYgKHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcgJiYgb2JqZWN0LmJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgcmV0dXJuIGZyb21UeXBlZEFycmF5KHRoYXQsIG9iamVjdClcbiAgfVxuXG4gIGlmIChvYmplY3QubGVuZ3RoKSByZXR1cm4gZnJvbUFycmF5TGlrZSh0aGF0LCBvYmplY3QpXG5cbiAgcmV0dXJuIGZyb21Kc29uT2JqZWN0KHRoYXQsIG9iamVjdClcbn1cblxuZnVuY3Rpb24gZnJvbUJ1ZmZlciAodGhhdCwgYnVmZmVyKSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGJ1ZmZlci5sZW5ndGgpIHwgMFxuICB0aGF0ID0gYWxsb2NhdGUodGhhdCwgbGVuZ3RoKVxuICBidWZmZXIuY29weSh0aGF0LCAwLCAwLCBsZW5ndGgpXG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheSAodGhhdCwgYXJyYXkpIHtcbiAgdmFyIGxlbmd0aCA9IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIHRoYXRbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbi8vIER1cGxpY2F0ZSBvZiBmcm9tQXJyYXkoKSB0byBrZWVwIGZyb21BcnJheSgpIG1vbm9tb3JwaGljLlxuZnVuY3Rpb24gZnJvbVR5cGVkQXJyYXkgKHRoYXQsIGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG4gIC8vIFRydW5jYXRpbmcgdGhlIGVsZW1lbnRzIGlzIHByb2JhYmx5IG5vdCB3aGF0IHBlb3BsZSBleHBlY3QgZnJvbSB0eXBlZFxuICAvLyBhcnJheXMgd2l0aCBCWVRFU19QRVJfRUxFTUVOVCA+IDEgYnV0IGl0J3MgY29tcGF0aWJsZSB3aXRoIHRoZSBiZWhhdmlvclxuICAvLyBvZiB0aGUgb2xkIEJ1ZmZlciBjb25zdHJ1Y3Rvci5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIHRoYXRbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUxpa2UgKHRoYXQsIGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICB0aGF0W2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG4vLyBEZXNlcmlhbGl6ZSB7IHR5cGU6ICdCdWZmZXInLCBkYXRhOiBbMSwyLDMsLi4uXSB9IGludG8gYSBCdWZmZXIgb2JqZWN0LlxuLy8gUmV0dXJucyBhIHplcm8tbGVuZ3RoIGJ1ZmZlciBmb3IgaW5wdXRzIHRoYXQgZG9uJ3QgY29uZm9ybSB0byB0aGUgc3BlYy5cbmZ1bmN0aW9uIGZyb21Kc29uT2JqZWN0ICh0aGF0LCBvYmplY3QpIHtcbiAgdmFyIGFycmF5XG4gIHZhciBsZW5ndGggPSAwXG5cbiAgaWYgKG9iamVjdC50eXBlID09PSAnQnVmZmVyJyAmJiBpc0FycmF5KG9iamVjdC5kYXRhKSkge1xuICAgIGFycmF5ID0gb2JqZWN0LmRhdGFcbiAgICBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIH1cbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgdGhhdFtpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gYWxsb2NhdGUgKHRoYXQsIGxlbmd0aCkge1xuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSwgZm9yIGJlc3QgcGVyZm9ybWFuY2VcbiAgICB0aGF0ID0gQnVmZmVyLl9hdWdtZW50KG5ldyBVaW50OEFycmF5KGxlbmd0aCkpXG4gIH0gZWxzZSB7XG4gICAgLy8gRmFsbGJhY2s6IFJldHVybiBhbiBvYmplY3QgaW5zdGFuY2Ugb2YgdGhlIEJ1ZmZlciBjbGFzc1xuICAgIHRoYXQubGVuZ3RoID0gbGVuZ3RoXG4gICAgdGhhdC5faXNCdWZmZXIgPSB0cnVlXG4gIH1cblxuICB2YXIgZnJvbVBvb2wgPSBsZW5ndGggIT09IDAgJiYgbGVuZ3RoIDw9IEJ1ZmZlci5wb29sU2l6ZSA+Pj4gMVxuICBpZiAoZnJvbVBvb2wpIHRoYXQucGFyZW50ID0gcm9vdFBhcmVudFxuXG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGNoZWNrZWQgKGxlbmd0aCkge1xuICAvLyBOb3RlOiBjYW5ub3QgdXNlIGBsZW5ndGggPCBrTWF4TGVuZ3RoYCBoZXJlIGJlY2F1c2UgdGhhdCBmYWlscyB3aGVuXG4gIC8vIGxlbmd0aCBpcyBOYU4gKHdoaWNoIGlzIG90aGVyd2lzZSBjb2VyY2VkIHRvIHplcm8uKVxuICBpZiAobGVuZ3RoID49IGtNYXhMZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byBhbGxvY2F0ZSBCdWZmZXIgbGFyZ2VyIHRoYW4gbWF4aW11bSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAnc2l6ZTogMHgnICsga01heExlbmd0aC50b1N0cmluZygxNikgKyAnIGJ5dGVzJylcbiAgfVxuICByZXR1cm4gbGVuZ3RoIHwgMFxufVxuXG5mdW5jdGlvbiBTbG93QnVmZmVyIChzdWJqZWN0LCBlbmNvZGluZykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU2xvd0J1ZmZlcikpIHJldHVybiBuZXcgU2xvd0J1ZmZlcihzdWJqZWN0LCBlbmNvZGluZylcblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZylcbiAgZGVsZXRlIGJ1Zi5wYXJlbnRcbiAgcmV0dXJuIGJ1ZlxufVxuXG5CdWZmZXIuaXNCdWZmZXIgPSBmdW5jdGlvbiBpc0J1ZmZlciAoYikge1xuICByZXR1cm4gISEoYiAhPSBudWxsICYmIGIuX2lzQnVmZmVyKVxufVxuXG5CdWZmZXIuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKGEsIGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYSkgfHwgIUJ1ZmZlci5pc0J1ZmZlcihiKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyBtdXN0IGJlIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGEgPT09IGIpIHJldHVybiAwXG5cbiAgdmFyIHggPSBhLmxlbmd0aFxuICB2YXIgeSA9IGIubGVuZ3RoXG5cbiAgdmFyIGkgPSAwXG4gIHZhciBsZW4gPSBNYXRoLm1pbih4LCB5KVxuICB3aGlsZSAoaSA8IGxlbikge1xuICAgIGlmIChhW2ldICE9PSBiW2ldKSBicmVha1xuXG4gICAgKytpXG4gIH1cblxuICBpZiAoaSAhPT0gbGVuKSB7XG4gICAgeCA9IGFbaV1cbiAgICB5ID0gYltpXVxuICB9XG5cbiAgaWYgKHggPCB5KSByZXR1cm4gLTFcbiAgaWYgKHkgPCB4KSByZXR1cm4gMVxuICByZXR1cm4gMFxufVxuXG5CdWZmZXIuaXNFbmNvZGluZyA9IGZ1bmN0aW9uIGlzRW5jb2RpbmcgKGVuY29kaW5nKSB7XG4gIHN3aXRjaCAoU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICBjYXNlICdyYXcnOlxuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5CdWZmZXIuY29uY2F0ID0gZnVuY3Rpb24gY29uY2F0IChsaXN0LCBsZW5ndGgpIHtcbiAgaWYgKCFpc0FycmF5KGxpc3QpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdsaXN0IGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycy4nKVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgQnVmZmVyKDApXG4gIH0gZWxzZSBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbGlzdFswXVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcihsZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGl0ZW0gPSBsaXN0W2ldXG4gICAgaXRlbS5jb3B5KGJ1ZiwgcG9zKVxuICAgIHBvcyArPSBpdGVtLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gYnl0ZUxlbmd0aCAoc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAodHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHN0cmluZyA9IFN0cmluZyhzdHJpbmcpXG5cbiAgaWYgKHN0cmluZy5sZW5ndGggPT09IDApIHJldHVybiAwXG5cbiAgc3dpdGNoIChlbmNvZGluZyB8fCAndXRmOCcpIHtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdyYXcnOlxuICAgICAgcmV0dXJuIHN0cmluZy5sZW5ndGhcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHN0cmluZy5sZW5ndGggKiAyXG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldHVybiBzdHJpbmcubGVuZ3RoID4+PiAxXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldHVybiBiYXNlNjRUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBzdHJpbmcubGVuZ3RoXG4gIH1cbn1cbkJ1ZmZlci5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuXG4vLyBwcmUtc2V0IGZvciB2YWx1ZXMgdGhhdCBtYXkgZXhpc3QgaW4gdGhlIGZ1dHVyZVxuQnVmZmVyLnByb3RvdHlwZS5sZW5ndGggPSB1bmRlZmluZWRcbkJ1ZmZlci5wcm90b3R5cGUucGFyZW50ID0gdW5kZWZpbmVkXG5cbi8vIHRvU3RyaW5nKGVuY29kaW5nLCBzdGFydD0wLCBlbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcblxuICBzdGFydCA9IHN0YXJ0IHwgMFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCB8fCBlbmQgPT09IEluZmluaXR5ID8gdGhpcy5sZW5ndGggOiBlbmQgfCAwXG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcbiAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKGVuZCA8PSBzdGFydCkgcmV0dXJuICcnXG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gYmluYXJ5U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1dGYxNmxlU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKGVuY29kaW5nICsgJycpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gZXF1YWxzIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiB0cnVlXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiBpbnNwZWN0ICgpIHtcbiAgdmFyIHN0ciA9ICcnXG4gIHZhciBtYXggPSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTXG4gIGlmICh0aGlzLmxlbmd0aCA+IDApIHtcbiAgICBzdHIgPSB0aGlzLnRvU3RyaW5nKCdoZXgnLCAwLCBtYXgpLm1hdGNoKC8uezJ9L2cpLmpvaW4oJyAnKVxuICAgIGlmICh0aGlzLmxlbmd0aCA+IG1heCkgc3RyICs9ICcgLi4uICdcbiAgfVxuICByZXR1cm4gJzxCdWZmZXIgJyArIHN0ciArICc+J1xufVxuXG5CdWZmZXIucHJvdG90eXBlLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiAwXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBpbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQpIHtcbiAgaWYgKGJ5dGVPZmZzZXQgPiAweDdmZmZmZmZmKSBieXRlT2Zmc2V0ID0gMHg3ZmZmZmZmZlxuICBlbHNlIGlmIChieXRlT2Zmc2V0IDwgLTB4ODAwMDAwMDApIGJ5dGVPZmZzZXQgPSAtMHg4MDAwMDAwMFxuICBieXRlT2Zmc2V0ID4+PSAwXG5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gLTFcbiAgaWYgKGJ5dGVPZmZzZXQgPj0gdGhpcy5sZW5ndGgpIHJldHVybiAtMVxuXG4gIC8vIE5lZ2F0aXZlIG9mZnNldHMgc3RhcnQgZnJvbSB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwKSBieXRlT2Zmc2V0ID0gTWF0aC5tYXgodGhpcy5sZW5ndGggKyBieXRlT2Zmc2V0LCAwKVxuXG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIGlmICh2YWwubGVuZ3RoID09PSAwKSByZXR1cm4gLTEgLy8gc3BlY2lhbCBjYXNlOiBsb29raW5nIGZvciBlbXB0eSBzdHJpbmcgYWx3YXlzIGZhaWxzXG4gICAgcmV0dXJuIFN0cmluZy5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHRoaXMsIHZhbCwgYnl0ZU9mZnNldClcbiAgfVxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHZhbCkpIHtcbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldClcbiAgfVxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbCh0aGlzLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YodGhpcywgWyB2YWwgXSwgYnl0ZU9mZnNldClcbiAgfVxuXG4gIGZ1bmN0aW9uIGFycmF5SW5kZXhPZiAoYXJyLCB2YWwsIGJ5dGVPZmZzZXQpIHtcbiAgICB2YXIgZm91bmRJbmRleCA9IC0xXG4gICAgZm9yICh2YXIgaSA9IDA7IGJ5dGVPZmZzZXQgKyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYXJyW2J5dGVPZmZzZXQgKyBpXSA9PT0gdmFsW2ZvdW5kSW5kZXggPT09IC0xID8gMCA6IGkgLSBmb3VuZEluZGV4XSkge1xuICAgICAgICBpZiAoZm91bmRJbmRleCA9PT0gLTEpIGZvdW5kSW5kZXggPSBpXG4gICAgICAgIGlmIChpIC0gZm91bmRJbmRleCArIDEgPT09IHZhbC5sZW5ndGgpIHJldHVybiBieXRlT2Zmc2V0ICsgZm91bmRJbmRleFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm91bmRJbmRleCA9IC0xXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsIG11c3QgYmUgc3RyaW5nLCBudW1iZXIgb3IgQnVmZmVyJylcbn1cblxuLy8gYGdldGAgd2lsbCBiZSByZW1vdmVkIGluIE5vZGUgMC4xMytcbkJ1ZmZlci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gZ2V0IChvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5nZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLnJlYWRVSW50OChvZmZzZXQpXG59XG5cbi8vIGBzZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIHNldCAodiwgb2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuc2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy53cml0ZVVJbnQ4KHYsIG9mZnNldClcbn1cblxuZnVuY3Rpb24gaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAoc3RyTGVuICUgMiAhPT0gMCkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKVxuXG4gIGlmIChsZW5ndGggPiBzdHJMZW4gLyAyKSB7XG4gICAgbGVuZ3RoID0gc3RyTGVuIC8gMlxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcGFyc2VkID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGlmIChpc05hTihwYXJzZWQpKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG4gICAgYnVmW29mZnNldCArIGldID0gcGFyc2VkXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiaW5hcnlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIHVjczJXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiB3cml0ZSAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZylcbiAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBvZmZzZXRbLCBsZW5ndGhdWywgZW5jb2RpbmddKVxuICB9IGVsc2UgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gICAgaWYgKGlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGxlbmd0aCA9IGxlbmd0aCB8IDBcbiAgICAgIGlmIChlbmNvZGluZyA9PT0gdW5kZWZpbmVkKSBlbmNvZGluZyA9ICd1dGY4J1xuICAgIH0gZWxzZSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICAvLyBsZWdhY3kgd3JpdGUoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0LCBsZW5ndGgpIC0gcmVtb3ZlIGluIHYwLjEzXG4gIH0gZWxzZSB7XG4gICAgdmFyIHN3YXAgPSBlbmNvZGluZ1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgb2Zmc2V0ID0gbGVuZ3RoIHwgMFxuICAgIGxlbmd0aCA9IHN3YXBcbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgfHwgbGVuZ3RoID4gcmVtYWluaW5nKSBsZW5ndGggPSByZW1haW5pbmdcblxuICBpZiAoKHN0cmluZy5sZW5ndGggPiAwICYmIChsZW5ndGggPCAwIHx8IG9mZnNldCA8IDApKSB8fCBvZmZzZXQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdhdHRlbXB0IHRvIHdyaXRlIG91dHNpZGUgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gYmluYXJ5V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgLy8gV2FybmluZzogbWF4TGVuZ3RoIG5vdCB0YWtlbiBpbnRvIGFjY291bnQgaW4gYmFzZTY0V3JpdGVcbiAgICAgICAgcmV0dXJuIGJhc2U2NFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1Y3MyV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJlcyA9ICcnXG4gIHZhciB0bXAgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBpZiAoYnVmW2ldIDw9IDB4N0YpIHtcbiAgICAgIHJlcyArPSBkZWNvZGVVdGY4Q2hhcih0bXApICsgU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gICAgICB0bXAgPSAnJ1xuICAgIH0gZWxzZSB7XG4gICAgICB0bXAgKz0gJyUnICsgYnVmW2ldLnRvU3RyaW5nKDE2KVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXMgKyBkZWNvZGVVdGY4Q2hhcih0bXApXG59XG5cbmZ1bmN0aW9uIGFzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldICYgMHg3RilcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGJpbmFyeVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGhleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBvdXQgKz0gdG9IZXgoYnVmW2ldKVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyBieXRlc1tpICsgMV0gKiAyNTYpXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gc2xpY2UgKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIHN0YXJ0ID0gfn5zdGFydFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IGxlbiA6IH5+ZW5kXG5cbiAgaWYgKHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ICs9IGxlblxuICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gMFxuICB9IGVsc2UgaWYgKHN0YXJ0ID4gbGVuKSB7XG4gICAgc3RhcnQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCAwKSB7XG4gICAgZW5kICs9IGxlblxuICAgIGlmIChlbmQgPCAwKSBlbmQgPSAwXG4gIH0gZWxzZSBpZiAoZW5kID4gbGVuKSB7XG4gICAgZW5kID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgdmFyIG5ld0J1ZlxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICBuZXdCdWYgPSBCdWZmZXIuX2F1Z21lbnQodGhpcy5zdWJhcnJheShzdGFydCwgZW5kKSlcbiAgfSBlbHNlIHtcbiAgICB2YXIgc2xpY2VMZW4gPSBlbmQgLSBzdGFydFxuICAgIG5ld0J1ZiA9IG5ldyBCdWZmZXIoc2xpY2VMZW4sIHVuZGVmaW5lZClcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNsaWNlTGVuOyBpKyspIHtcbiAgICAgIG5ld0J1ZltpXSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfVxuXG4gIGlmIChuZXdCdWYubGVuZ3RoKSBuZXdCdWYucGFyZW50ID0gdGhpcy5wYXJlbnQgfHwgdGhpc1xuXG4gIHJldHVybiBuZXdCdWZcbn1cblxuLypcbiAqIE5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgYnVmZmVyIGlzbid0IHRyeWluZyB0byB3cml0ZSBvdXQgb2YgYm91bmRzLlxuICovXG5mdW5jdGlvbiBjaGVja09mZnNldCAob2Zmc2V0LCBleHQsIGxlbmd0aCkge1xuICBpZiAoKG9mZnNldCAlIDEpICE9PSAwIHx8IG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdvZmZzZXQgaXMgbm90IHVpbnQnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gbGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVHJ5aW5nIHRvIGFjY2VzcyBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRMRSA9IGZ1bmN0aW9uIHJlYWRVSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRCRSA9IGZ1bmN0aW9uIHJlYWRVSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG4gIH1cblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdXG4gIHZhciBtdWwgPSAxXG4gIHdoaWxlIChieXRlTGVuZ3RoID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiByZWFkVUludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiByZWFkVUludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgOCkgfCB0aGlzW29mZnNldCArIDFdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICgodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikpICtcbiAgICAgICh0aGlzW29mZnNldCArIDNdICogMHgxMDAwMDAwKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdICogMHgxMDAwMDAwKSArXG4gICAgKCh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgIHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludExFID0gZnVuY3Rpb24gcmVhZEludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludEJFID0gZnVuY3Rpb24gcmVhZEludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoXG4gIHZhciBtdWwgPSAxXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0taV1cbiAgd2hpbGUgKGkgPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1pXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiByZWFkSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICBpZiAoISh0aGlzW29mZnNldF0gJiAweDgwKSkgcmV0dXJuICh0aGlzW29mZnNldF0pXG4gIHJldHVybiAoKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gcmVhZEludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIDFdIHwgKHRoaXNbb2Zmc2V0XSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiByZWFkSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdKSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10gPDwgMjQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiByZWFkSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDI0KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiByZWFkRmxvYXRMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiByZWFkRmxvYXRCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gcmVhZERvdWJsZUJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgNTIsIDgpXG59XG5cbmZ1bmN0aW9uIGNoZWNrSW50IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignYnVmZmVyIG11c3QgYmUgYSBCdWZmZXIgaW5zdGFuY2UnKVxuICBpZiAodmFsdWUgPiBtYXggfHwgdmFsdWUgPCBtaW4pIHRocm93IG5ldyBSYW5nZUVycm9yKCd2YWx1ZSBpcyBvdXQgb2YgYm91bmRzJylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludExFID0gZnVuY3Rpb24gd3JpdGVVSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSwgMClcblxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludEJFID0gZnVuY3Rpb24gd3JpdGVVSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSwgMClcblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDggPSBmdW5jdGlvbiB3cml0ZVVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4ZmYsIDApXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHZhbHVlID0gTWF0aC5mbG9vcih2YWx1ZSlcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuZnVuY3Rpb24gb2JqZWN0V3JpdGVVSW50MTYgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuKSB7XG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmICsgdmFsdWUgKyAxXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4oYnVmLmxlbmd0aCAtIG9mZnNldCwgMik7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSAodmFsdWUgJiAoMHhmZiA8PCAoOCAqIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpKSkpID4+PlxuICAgICAgKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkgKiA4XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9IHZhbHVlXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuZnVuY3Rpb24gb2JqZWN0V3JpdGVVSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuKSB7XG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDQpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlID4+PiAobGl0dGxlRW5kaWFuID8gaSA6IDMgLSBpKSAqIDgpICYgMHhmZlxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9IHZhbHVlXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludExFID0gZnVuY3Rpb24gd3JpdGVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGggLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IDBcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IHZhbHVlIDwgMCA/IDEgOiAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gdmFsdWUgPCAwID8gMSA6IDBcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uIHdyaXRlSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweDdmLCAtMHg4MClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkgdmFsdWUgPSBNYXRoLmZsb29yKHZhbHVlKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDFdID0gdmFsdWVcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9IHZhbHVlXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuZnVuY3Rpb24gY2hlY2tJRUVFNzU0IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndmFsdWUgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignaW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5mdW5jdGlvbiB3cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDQsIDMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgsIC0zLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gd3JpdGVGbG9hdEJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDgsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG4gIHJldHVybiBvZmZzZXQgKyA4XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weSAodGFyZ2V0LCB0YXJnZXRTdGFydCwgc3RhcnQsIGVuZCkge1xuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0U3RhcnQgPj0gdGFyZ2V0Lmxlbmd0aCkgdGFyZ2V0U3RhcnQgPSB0YXJnZXQubGVuZ3RoXG4gIGlmICghdGFyZ2V0U3RhcnQpIHRhcmdldFN0YXJ0ID0gMFxuICBpZiAoZW5kID4gMCAmJiBlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVybiAwXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgaWYgKHRhcmdldFN0YXJ0IDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgfVxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlU3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChlbmQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlRW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIC8vIEFyZSB3ZSBvb2I/XG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCA8IGVuZCAtIHN0YXJ0KSB7XG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0ICsgc3RhcnRcbiAgfVxuXG4gIHZhciBsZW4gPSBlbmQgLSBzdGFydFxuXG4gIGlmIChsZW4gPCAxMDAwIHx8ICFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRhcmdldC5fc2V0KHRoaXMuc3ViYXJyYXkoc3RhcnQsIHN0YXJ0ICsgbGVuKSwgdGFyZ2V0U3RhcnQpXG4gIH1cblxuICByZXR1cm4gbGVuXG59XG5cbi8vIGZpbGwodmFsdWUsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gZmlsbCAodmFsdWUsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCF2YWx1ZSkgdmFsdWUgPSAwXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCkgZW5kID0gdGhpcy5sZW5ndGhcblxuICBpZiAoZW5kIDwgc3RhcnQpIHRocm93IG5ldyBSYW5nZUVycm9yKCdlbmQgPCBzdGFydCcpXG5cbiAgLy8gRmlsbCAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChlbmQgPCAwIHx8IGVuZCA+IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignZW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgICAgdGhpc1tpXSA9IHZhbHVlXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBieXRlcyA9IHV0ZjhUb0J5dGVzKHZhbHVlLnRvU3RyaW5nKCkpXG4gICAgdmFyIGxlbiA9IGJ5dGVzLmxlbmd0aFxuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSBieXRlc1tpICUgbGVuXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBgQXJyYXlCdWZmZXJgIHdpdGggdGhlICpjb3BpZWQqIG1lbW9yeSBvZiB0aGUgYnVmZmVyIGluc3RhbmNlLlxuICogQWRkZWQgaW4gTm9kZSAwLjEyLiBPbmx5IGF2YWlsYWJsZSBpbiBicm93c2VycyB0aGF0IHN1cHBvcnQgQXJyYXlCdWZmZXIuXG4gKi9cbkJ1ZmZlci5wcm90b3R5cGUudG9BcnJheUJ1ZmZlciA9IGZ1bmN0aW9uIHRvQXJyYXlCdWZmZXIgKCkge1xuICBpZiAodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgICByZXR1cm4gKG5ldyBCdWZmZXIodGhpcykpLmJ1ZmZlclxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5sZW5ndGgpXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYnVmLmxlbmd0aDsgaSA8IGxlbjsgaSArPSAxKSB7XG4gICAgICAgIGJ1ZltpXSA9IHRoaXNbaV1cbiAgICAgIH1cbiAgICAgIHJldHVybiBidWYuYnVmZmVyXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0J1ZmZlci50b0FycmF5QnVmZmVyIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyJylcbiAgfVxufVxuXG4vLyBIRUxQRVIgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09XG5cbnZhciBCUCA9IEJ1ZmZlci5wcm90b3R5cGVcblxuLyoqXG4gKiBBdWdtZW50IGEgVWludDhBcnJheSAqaW5zdGFuY2UqIChub3QgdGhlIFVpbnQ4QXJyYXkgY2xhc3MhKSB3aXRoIEJ1ZmZlciBtZXRob2RzXG4gKi9cbkJ1ZmZlci5fYXVnbWVudCA9IGZ1bmN0aW9uIF9hdWdtZW50IChhcnIpIHtcbiAgYXJyLmNvbnN0cnVjdG9yID0gQnVmZmVyXG4gIGFyci5faXNCdWZmZXIgPSB0cnVlXG5cbiAgLy8gc2F2ZSByZWZlcmVuY2UgdG8gb3JpZ2luYWwgVWludDhBcnJheSBzZXQgbWV0aG9kIGJlZm9yZSBvdmVyd3JpdGluZ1xuICBhcnIuX3NldCA9IGFyci5zZXRcblxuICAvLyBkZXByZWNhdGVkLCB3aWxsIGJlIHJlbW92ZWQgaW4gbm9kZSAwLjEzK1xuICBhcnIuZ2V0ID0gQlAuZ2V0XG4gIGFyci5zZXQgPSBCUC5zZXRcblxuICBhcnIud3JpdGUgPSBCUC53cml0ZVxuICBhcnIudG9TdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9Mb2NhbGVTdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9KU09OID0gQlAudG9KU09OXG4gIGFyci5lcXVhbHMgPSBCUC5lcXVhbHNcbiAgYXJyLmNvbXBhcmUgPSBCUC5jb21wYXJlXG4gIGFyci5pbmRleE9mID0gQlAuaW5kZXhPZlxuICBhcnIuY29weSA9IEJQLmNvcHlcbiAgYXJyLnNsaWNlID0gQlAuc2xpY2VcbiAgYXJyLnJlYWRVSW50TEUgPSBCUC5yZWFkVUludExFXG4gIGFyci5yZWFkVUludEJFID0gQlAucmVhZFVJbnRCRVxuICBhcnIucmVhZFVJbnQ4ID0gQlAucmVhZFVJbnQ4XG4gIGFyci5yZWFkVUludDE2TEUgPSBCUC5yZWFkVUludDE2TEVcbiAgYXJyLnJlYWRVSW50MTZCRSA9IEJQLnJlYWRVSW50MTZCRVxuICBhcnIucmVhZFVJbnQzMkxFID0gQlAucmVhZFVJbnQzMkxFXG4gIGFyci5yZWFkVUludDMyQkUgPSBCUC5yZWFkVUludDMyQkVcbiAgYXJyLnJlYWRJbnRMRSA9IEJQLnJlYWRJbnRMRVxuICBhcnIucmVhZEludEJFID0gQlAucmVhZEludEJFXG4gIGFyci5yZWFkSW50OCA9IEJQLnJlYWRJbnQ4XG4gIGFyci5yZWFkSW50MTZMRSA9IEJQLnJlYWRJbnQxNkxFXG4gIGFyci5yZWFkSW50MTZCRSA9IEJQLnJlYWRJbnQxNkJFXG4gIGFyci5yZWFkSW50MzJMRSA9IEJQLnJlYWRJbnQzMkxFXG4gIGFyci5yZWFkSW50MzJCRSA9IEJQLnJlYWRJbnQzMkJFXG4gIGFyci5yZWFkRmxvYXRMRSA9IEJQLnJlYWRGbG9hdExFXG4gIGFyci5yZWFkRmxvYXRCRSA9IEJQLnJlYWRGbG9hdEJFXG4gIGFyci5yZWFkRG91YmxlTEUgPSBCUC5yZWFkRG91YmxlTEVcbiAgYXJyLnJlYWREb3VibGVCRSA9IEJQLnJlYWREb3VibGVCRVxuICBhcnIud3JpdGVVSW50OCA9IEJQLndyaXRlVUludDhcbiAgYXJyLndyaXRlVUludExFID0gQlAud3JpdGVVSW50TEVcbiAgYXJyLndyaXRlVUludEJFID0gQlAud3JpdGVVSW50QkVcbiAgYXJyLndyaXRlVUludDE2TEUgPSBCUC53cml0ZVVJbnQxNkxFXG4gIGFyci53cml0ZVVJbnQxNkJFID0gQlAud3JpdGVVSW50MTZCRVxuICBhcnIud3JpdGVVSW50MzJMRSA9IEJQLndyaXRlVUludDMyTEVcbiAgYXJyLndyaXRlVUludDMyQkUgPSBCUC53cml0ZVVJbnQzMkJFXG4gIGFyci53cml0ZUludExFID0gQlAud3JpdGVJbnRMRVxuICBhcnIud3JpdGVJbnRCRSA9IEJQLndyaXRlSW50QkVcbiAgYXJyLndyaXRlSW50OCA9IEJQLndyaXRlSW50OFxuICBhcnIud3JpdGVJbnQxNkxFID0gQlAud3JpdGVJbnQxNkxFXG4gIGFyci53cml0ZUludDE2QkUgPSBCUC53cml0ZUludDE2QkVcbiAgYXJyLndyaXRlSW50MzJMRSA9IEJQLndyaXRlSW50MzJMRVxuICBhcnIud3JpdGVJbnQzMkJFID0gQlAud3JpdGVJbnQzMkJFXG4gIGFyci53cml0ZUZsb2F0TEUgPSBCUC53cml0ZUZsb2F0TEVcbiAgYXJyLndyaXRlRmxvYXRCRSA9IEJQLndyaXRlRmxvYXRCRVxuICBhcnIud3JpdGVEb3VibGVMRSA9IEJQLndyaXRlRG91YmxlTEVcbiAgYXJyLndyaXRlRG91YmxlQkUgPSBCUC53cml0ZURvdWJsZUJFXG4gIGFyci5maWxsID0gQlAuZmlsbFxuICBhcnIuaW5zcGVjdCA9IEJQLmluc3BlY3RcbiAgYXJyLnRvQXJyYXlCdWZmZXIgPSBCUC50b0FycmF5QnVmZmVyXG5cbiAgcmV0dXJuIGFyclxufVxuXG52YXIgSU5WQUxJRF9CQVNFNjRfUkUgPSAvW14rXFwvMC05QS16XFwtXS9nXG5cbmZ1bmN0aW9uIGJhc2U2NGNsZWFuIChzdHIpIHtcbiAgLy8gTm9kZSBzdHJpcHMgb3V0IGludmFsaWQgY2hhcmFjdGVycyBsaWtlIFxcbiBhbmQgXFx0IGZyb20gdGhlIHN0cmluZywgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHN0ciA9IHN0cmluZ3RyaW0oc3RyKS5yZXBsYWNlKElOVkFMSURfQkFTRTY0X1JFLCAnJylcbiAgLy8gTm9kZSBjb252ZXJ0cyBzdHJpbmdzIHdpdGggbGVuZ3RoIDwgMiB0byAnJ1xuICBpZiAoc3RyLmxlbmd0aCA8IDIpIHJldHVybiAnJ1xuICAvLyBOb2RlIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBiYXNlNjQgc3RyaW5ncyAobWlzc2luZyB0cmFpbGluZyA9PT0pLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgd2hpbGUgKHN0ci5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgc3RyID0gc3RyICsgJz0nXG4gIH1cbiAgcmV0dXJuIHN0clxufVxuXG5mdW5jdGlvbiBzdHJpbmd0cmltIChzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKVxuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKVxufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHJpbmcsIHVuaXRzKSB7XG4gIHVuaXRzID0gdW5pdHMgfHwgSW5maW5pdHlcbiAgdmFyIGNvZGVQb2ludFxuICB2YXIgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aFxuICB2YXIgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgdmFyIGJ5dGVzID0gW11cbiAgdmFyIGkgPSAwXG5cbiAgZm9yICg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGNvZGVQb2ludCA9IHN0cmluZy5jaGFyQ29kZUF0KGkpXG5cbiAgICAvLyBpcyBzdXJyb2dhdGUgY29tcG9uZW50XG4gICAgaWYgKGNvZGVQb2ludCA+IDB4RDdGRiAmJiBjb2RlUG9pbnQgPCAweEUwMDApIHtcbiAgICAgIC8vIGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgICAvLyAyIGxlYWRzIGluIGEgcm93XG4gICAgICAgIGlmIChjb2RlUG9pbnQgPCAweERDMDApIHtcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyB2YWxpZCBzdXJyb2dhdGUgcGFpclxuICAgICAgICAgIGNvZGVQb2ludCA9IGxlYWRTdXJyb2dhdGUgLSAweEQ4MDAgPDwgMTAgfCBjb2RlUG9pbnQgLSAweERDMDAgfCAweDEwMDAwXG4gICAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gbm8gbGVhZCB5ZXRcblxuICAgICAgICBpZiAoY29kZVBvaW50ID4gMHhEQkZGKSB7XG4gICAgICAgICAgLy8gdW5leHBlY3RlZCB0cmFpbFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSBpZiAoaSArIDEgPT09IGxlbmd0aCkge1xuICAgICAgICAgIC8vIHVucGFpcmVkIGxlYWRcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHZhbGlkIGxlYWRcbiAgICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgLy8gdmFsaWQgYm1wIGNoYXIsIGJ1dCBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICBsZWFkU3Vycm9nYXRlID0gbnVsbFxuICAgIH1cblxuICAgIC8vIGVuY29kZSB1dGY4XG4gICAgaWYgKGNvZGVQb2ludCA8IDB4ODApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMSkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChjb2RlUG9pbnQpXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDgwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2IHwgMHhDMCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyB8IDB4RTAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MjAwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDQpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDEyIHwgMHhGMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2RlIHBvaW50JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnl0ZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0ciwgdW5pdHMpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcblxuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KGJhc2U2NGNsZWFuKHN0cikpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKSBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIGRlY29kZVV0ZjhDaGFyIChzdHIpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHN0cilcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoMHhGRkZEKSAvLyBVVEYgOCBpbnZhbGlkIGNoYXJcbiAgfVxufVxuIiwidmFyIGxvb2t1cCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcblxuOyhmdW5jdGlvbiAoZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cbiAgdmFyIEFyciA9ICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgPyBVaW50OEFycmF5XG4gICAgOiBBcnJheVxuXG5cdHZhciBQTFVTICAgPSAnKycuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0ggID0gJy8nLmNoYXJDb2RlQXQoMClcblx0dmFyIE5VTUJFUiA9ICcwJy5jaGFyQ29kZUF0KDApXG5cdHZhciBMT1dFUiAgPSAnYScuY2hhckNvZGVBdCgwKVxuXHR2YXIgVVBQRVIgID0gJ0EnLmNoYXJDb2RlQXQoMClcblx0dmFyIFBMVVNfVVJMX1NBRkUgPSAnLScuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0hfVVJMX1NBRkUgPSAnXycuY2hhckNvZGVBdCgwKVxuXG5cdGZ1bmN0aW9uIGRlY29kZSAoZWx0KSB7XG5cdFx0dmFyIGNvZGUgPSBlbHQuY2hhckNvZGVBdCgwKVxuXHRcdGlmIChjb2RlID09PSBQTFVTIHx8XG5cdFx0ICAgIGNvZGUgPT09IFBMVVNfVVJMX1NBRkUpXG5cdFx0XHRyZXR1cm4gNjIgLy8gJysnXG5cdFx0aWYgKGNvZGUgPT09IFNMQVNIIHx8XG5cdFx0ICAgIGNvZGUgPT09IFNMQVNIX1VSTF9TQUZFKVxuXHRcdFx0cmV0dXJuIDYzIC8vICcvJ1xuXHRcdGlmIChjb2RlIDwgTlVNQkVSKVxuXHRcdFx0cmV0dXJuIC0xIC8vbm8gbWF0Y2hcblx0XHRpZiAoY29kZSA8IE5VTUJFUiArIDEwKVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBOVU1CRVIgKyAyNiArIDI2XG5cdFx0aWYgKGNvZGUgPCBVUFBFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBVUFBFUlxuXHRcdGlmIChjb2RlIDwgTE9XRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gTE9XRVIgKyAyNlxuXHR9XG5cblx0ZnVuY3Rpb24gYjY0VG9CeXRlQXJyYXkgKGI2NCkge1xuXHRcdHZhciBpLCBqLCBsLCB0bXAsIHBsYWNlSG9sZGVycywgYXJyXG5cblx0XHRpZiAoYjY0Lmxlbmd0aCAlIDQgPiAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuXHRcdH1cblxuXHRcdC8vIHRoZSBudW1iZXIgb2YgZXF1YWwgc2lnbnMgKHBsYWNlIGhvbGRlcnMpXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuXHRcdC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuXHRcdC8vIGlmIHRoZXJlIGlzIG9ubHkgb25lLCB0aGVuIHRoZSB0aHJlZSBjaGFyYWN0ZXJzIGJlZm9yZSBpdCByZXByZXNlbnQgMiBieXRlc1xuXHRcdC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2Vcblx0XHR2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXHRcdHBsYWNlSG9sZGVycyA9ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAyKSA/IDIgOiAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMSkgPyAxIDogMFxuXG5cdFx0Ly8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG5cdFx0YXJyID0gbmV3IEFycihiNjQubGVuZ3RoICogMyAvIDQgLSBwbGFjZUhvbGRlcnMpXG5cblx0XHQvLyBpZiB0aGVyZSBhcmUgcGxhY2Vob2xkZXJzLCBvbmx5IGdldCB1cCB0byB0aGUgbGFzdCBjb21wbGV0ZSA0IGNoYXJzXG5cdFx0bCA9IHBsYWNlSG9sZGVycyA+IDAgPyBiNjQubGVuZ3RoIC0gNCA6IGI2NC5sZW5ndGhcblxuXHRcdHZhciBMID0gMFxuXG5cdFx0ZnVuY3Rpb24gcHVzaCAodikge1xuXHRcdFx0YXJyW0wrK10gPSB2XG5cdFx0fVxuXG5cdFx0Zm9yIChpID0gMCwgaiA9IDA7IGkgPCBsOyBpICs9IDQsIGogKz0gMykge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxOCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCAxMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA8PCA2KSB8IGRlY29kZShiNjQuY2hhckF0KGkgKyAzKSlcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMDAwKSA+PiAxNilcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMCkgPj4gOClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPj4gNClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9IGVsc2UgaWYgKHBsYWNlSG9sZGVycyA9PT0gMSkge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxMCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCA0KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpID4+IDIpXG5cdFx0XHRwdXNoKCh0bXAgPj4gOCkgJiAweEZGKVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdHJldHVybiBhcnJcblx0fVxuXG5cdGZ1bmN0aW9uIHVpbnQ4VG9CYXNlNjQgKHVpbnQ4KSB7XG5cdFx0dmFyIGksXG5cdFx0XHRleHRyYUJ5dGVzID0gdWludDgubGVuZ3RoICUgMywgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcblx0XHRcdG91dHB1dCA9IFwiXCIsXG5cdFx0XHR0ZW1wLCBsZW5ndGhcblxuXHRcdGZ1bmN0aW9uIGVuY29kZSAobnVtKSB7XG5cdFx0XHRyZXR1cm4gbG9va3VwLmNoYXJBdChudW0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcblx0XHRcdHJldHVybiBlbmNvZGUobnVtID4+IDE4ICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDEyICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDYgJiAweDNGKSArIGVuY29kZShudW0gJiAweDNGKVxuXHRcdH1cblxuXHRcdC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcblx0XHRmb3IgKGkgPSAwLCBsZW5ndGggPSB1aW50OC5sZW5ndGggLSBleHRyYUJ5dGVzOyBpIDwgbGVuZ3RoOyBpICs9IDMpIHtcblx0XHRcdHRlbXAgPSAodWludDhbaV0gPDwgMTYpICsgKHVpbnQ4W2kgKyAxXSA8PCA4KSArICh1aW50OFtpICsgMl0pXG5cdFx0XHRvdXRwdXQgKz0gdHJpcGxldFRvQmFzZTY0KHRlbXApXG5cdFx0fVxuXG5cdFx0Ly8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuXHRcdHN3aXRjaCAoZXh0cmFCeXRlcykge1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHR0ZW1wID0gdWludDhbdWludDgubGVuZ3RoIC0gMV1cblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDIpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz09J1xuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHR0ZW1wID0gKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDJdIDw8IDgpICsgKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMTApXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPj4gNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDIpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9J1xuXHRcdFx0XHRicmVha1xuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXRcblx0fVxuXG5cdGV4cG9ydHMudG9CeXRlQXJyYXkgPSBiNjRUb0J5dGVBcnJheVxuXHRleHBvcnRzLmZyb21CeXRlQXJyYXkgPSB1aW50OFRvQmFzZTY0XG59KHR5cGVvZiBleHBvcnRzID09PSAndW5kZWZpbmVkJyA/ICh0aGlzLmJhc2U2NGpzID0ge30pIDogZXhwb3J0cykpXG4iLCJleHBvcnRzLnJlYWQgPSBmdW5jdGlvbiAoYnVmZmVyLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSxcbiAgICAgIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDEsXG4gICAgICBlTWF4ID0gKDEgPDwgZUxlbikgLSAxLFxuICAgICAgZUJpYXMgPSBlTWF4ID4+IDEsXG4gICAgICBuQml0cyA9IC03LFxuICAgICAgaSA9IGlzTEUgPyAobkJ5dGVzIC0gMSkgOiAwLFxuICAgICAgZCA9IGlzTEUgPyAtMSA6IDEsXG4gICAgICBzID0gYnVmZmVyW29mZnNldCArIGldXG5cbiAgaSArPSBkXG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgcyA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gZUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIG0gPSBlICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIGUgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IG1MZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgbSA9IG0gKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXNcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpXG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKVxuICAgIGUgPSBlIC0gZUJpYXNcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKVxufVxuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjLFxuICAgICAgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMSxcbiAgICAgIGVNYXggPSAoMSA8PCBlTGVuKSAtIDEsXG4gICAgICBlQmlhcyA9IGVNYXggPj4gMSxcbiAgICAgIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKSxcbiAgICAgIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKSxcbiAgICAgIGQgPSBpc0xFID8gMSA6IC0xLFxuICAgICAgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMFxuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpXG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDBcbiAgICBlID0gZU1heFxuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKVxuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLVxuICAgICAgYyAqPSAyXG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKVxuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrK1xuICAgICAgYyAvPSAyXG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMFxuICAgICAgZSA9IGVNYXhcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKHZhbHVlICogYyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSBlICsgZUJpYXNcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gMFxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpIHt9XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbVxuICBlTGVuICs9IG1MZW5cbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KSB7fVxuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyOFxufVxuIiwiXG4vKipcbiAqIGlzQXJyYXlcbiAqL1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG5cbi8qKlxuICogdG9TdHJpbmdcbiAqL1xuXG52YXIgc3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLyoqXG4gKiBXaGV0aGVyIG9yIG5vdCB0aGUgZ2l2ZW4gYHZhbGBcbiAqIGlzIGFuIGFycmF5LlxuICpcbiAqIGV4YW1wbGU6XG4gKlxuICogICAgICAgIGlzQXJyYXkoW10pO1xuICogICAgICAgIC8vID4gdHJ1ZVxuICogICAgICAgIGlzQXJyYXkoYXJndW1lbnRzKTtcbiAqICAgICAgICAvLyA+IGZhbHNlXG4gKiAgICAgICAgaXNBcnJheSgnJyk7XG4gKiAgICAgICAgLy8gPiBmYWxzZVxuICpcbiAqIEBwYXJhbSB7bWl4ZWR9IHZhbFxuICogQHJldHVybiB7Ym9vbH1cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGlzQXJyYXkgfHwgZnVuY3Rpb24gKHZhbCkge1xuICByZXR1cm4gISEgdmFsICYmICdbb2JqZWN0IEFycmF5XScgPT0gc3RyLmNhbGwodmFsKTtcbn07XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAoIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiXG52YXIgc2V0dGVyR2V0dGVyaWZ5ID0gcmVxdWlyZSgnc2V0dGVyLWdldHRlcmlmeScpO1xudmFyIFNhbXBsZVBsYXllciA9IHJlcXVpcmUoJ29wZW5tdXNpYy1zYW1wbGUtcGxheWVyJyk7XG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJ2VzNi1wcm9taXNlJykuUHJvbWlzZTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb250ZXh0KSB7XG5cblx0dmFyIG5vZGUgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcblx0dmFyIG5vZGVQcm9wZXJ0aWVzID0ge1xuXHRcdHRyYWNrczogMCxcblx0XHRzdGVwczogMTYsXG5cdFx0cmVzb2x1dGlvbjogMTYsIC8vIGFsdGhvdWdoIGl0J3MgYWN0dWFsbHkgdGhlIGludmVyc2UgMS8xNlxuXHRcdGJwbTogMTI1LFxuXHRcdGN1cnJlbnRQYXR0ZXJuOiBbXVxuXHR9O1xuXG5cdHNldHRlckdldHRlcmlmeShub2RlLCBub2RlUHJvcGVydGllcyk7XG5cblx0dmFyIHBhdHRlcm5zID0gW1xuXHRcdFtcblx0XHRcdFsgMSwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMSwgMCwgMCwgMCBdLFxuXHRcdFx0WyAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwIF0sXG5cdFx0XHRbIDAsIDAsIDEsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDEsIDEgXVxuXHRcdF1cblx0XTtcblx0dmFyIGN1cnJlbnRQYXR0ZXJuSW5kZXggPSAwOyAvLyBUT0RPIG5vdCB1c2VkIHlldFxuXHR2YXIgY3VycmVudFN0ZXAgPSAwO1xuXHR2YXIgc3RlcFRpbWU7XG5cdHZhciBzdGFydFRpbWU7XG5cdFxuXHR2YXIgc2NoZWR1bGVUaW1lb3V0ID0gbnVsbDtcblxuXHR2YXIgc2FtcGxlUGxheWVycyA9IFtdO1xuXG5cblx0Ly8gU2lnaCB0aGF0IHdlIG5lZWQgdG8gZG8gaXQgdGhpcyB3YXkgYnV0IGl0J3MgdGhlIGJlc3Qgd2UgY2FuIGRvIHdpdGhcblx0Ly8gYnJvd3NlcmlmeSBicmZzIHRyYW5zZm9ybXNcblx0dmFyIGJhc3NEcnVtID0gQnVmZmVyKFwiVWtsR1JuQ2RBQUJYUVZaRlptMTBJQkFBQUFBQkFBRUFSS3dBQUloWUFRQUNBQkFBWkdGMFlVeWRBQUFBQUFBQUFBQUFBQUFBQUFDLy8va0FQaEwxSjRVM2JVS2xTSXBNYUU2RFQrcFBLVkE1VUV4UVhWQjNVSmhRdmxEclVCeFJUbEdCVWJGUjMxRUhVaXhTU2xKaVVuTlNnRktEVW9OU2RsSm9Va3hTTGxJRlV0ZFJvbEZmVVNWUncxQ1JVQ1JOejBiQ1FERTdtemJFTXA0djNpeGpLZ3NveXlXZEkzMGhhaDlpSFdRYmNCbURGNTRWd0JQbkVSUVFSUTU3RExZSzlBZzJCM2tGd1FNTUFsZ0Fxdjc4L0ZMN3F2a0UrR0gydi9RaDg0WHg3TzlWN3NIc0wrdWg2UmJvamVZSTVZWGpCdUtLNEJMZm5kMHQzTC9hVnRudzE0N1dNTlhYMDRMU01kSGx6NTdPVzgwZHpPUEtzTW1CeUZqSE5NWVZ4ZnZENThMWndkREF6Yi9RdnRtOTZMejl1eG03T3JwaXVaQzR4YmNBdDBLMmlyWGF0QyswamJQdnNscXl5N0ZEc2NHd1NMRFZyMnF2Qksrb3JsS3VBNjY4clh1dFFxMFFyZVdzdzZ5bXJKS3NoYXlBcklDc2lheVpyTENzenF6MXJDS3RWNjJTcmRXdEg2NXhyc211S2ErUHIvMnZjTERzc0c2eDk3R0hzaDZ6dTdOZnRBbTF1clZ4dGkrMzg3ZSt1STY1WkxwQnV5UzhETDM3dmU2KzZML253T3pCOXNJRnhCbkZNOFpTeDNiSW5zbk15djdMTk0xdnpxN1A4dEE3MG9iVDE5UXMxb1hYNHRoQzJxZmJEOTE3M3V2ZlgrSFc0bERreitWUjU5Ym9ZZXJ2NjRIdEdPK3g4Rkh5OVBPYzlVcjMrL2l6K25EOE12NzUvOFFCalFNckJZa0dzZ2V4Q0pJSlh3b2RDOUVMZlF3bERjZ05hUTRJRDZZUFFoRGNFSFVSRFJLa0Vqc1QwUk5rRlBnVWl4VWRGcTBXUGhmTUYxb1k1eGh6R2Y0WmlSb1NHNW9iSWh5b0hDd2RzUjAwSHJZZU54KzNIemNndGlBekliQWhLaUtsSWg0amxpTU5KSVFrK1NSdUplQWxVeWJFSmpRbnBDY1NLSDhvNnloVktjQXBLU3FSS3ZjcVhTdkNLeVlzaUN6cUxFb3RxUzBITG1VdXdTNGRMM2N2MFM4b01IOHcxREFwTVh3eDBERWhNbkV5d1RJUE0xd3pxRFB6TXowMGhUVE9OQlExV2pXZU5lSTFKRFptTnFZMjVUWWlOMTgzbXpmV053ODRTRGgvT0xZNDZ6Z2ZPVkk1aFRtMU9lVTVFenBCT20wNm1EckNPdXc2RkRzN08yRTdoanVwTzh3Nzdqc09QQzA4VER4cFBJVThvRHk2UE5JODZqd0JQUmM5S3owL1BWRTlZejF6UFlNOWtUMmVQYW85dFQyK1BjWTl6VDNWUGRvOTN6M2lQZVk5NkQzcFBlYzk1VDNpUGQ4OTJqM1VQYzA5eFQyN1BiRTlwajJhUFkwOWdEMXdQV0E5VHowOVBTbzlGajBBUGVvODB6eThQS004aVR4dVBGSThORHdYUFBjNzJEdTNPNVU3Y2p0T095azdCRHZlT3JnNmp6cG1Panc2RURya09iYzVpVGxhT1NvNStqaklPSlU0WVRndE9QZzN3amVMTjFRM0d6ZmlOcWMyYkRZdk52STF0RFYyTlRVMTlUU3pOSEUwTGpUcU02UXpYak1XTTg0eWhESTZNdTR4b2pGVU1RWXh0akJtTUJRd3dDOXNMeFl2dmk1bUxnd3VzUzFWTGZnc21TdzVMTmdyZFNzUks2d3FSQ3JjS1hNcENDbWNLREFvd0NkUko5NG1haWIySllBbENDV1JKQmNrbkNNZ0k2SWlJeUtqSVNFaG55QWJJSlVmRGgrSEh2NGRkUjNxSEY0YzBCdENHN0lhSVJxUEdmd1laeGpTRnp3WHBoWU5GblFWMmhRL0ZLSVRCUk5vRXNrUktSR0lFT2NQUlEraUR2NE5XUTIwREE0TVp3dS9DaGNLYlFuRENCZ0liUWZDQmhjR2FnVzlCQThFWVFPeUFnTUNWQUdrQVBUL1JQK1MvdUg5TC8xOS9NcjdGL3RrK3JINS9maEorSmIzNGZZdDlubjF4UFFROUZ6enAvTHk4VDd4aWZEVjd5RHZhKzYzN1FQdFQreWI2K2ZxTStxQTZjM29HdWhuNTdibUJPWlM1YURrOE9NLzQ0L2kzK0V2NFlEZzB0OGszM2JleXQwZjNYUGN5TnNkMjNUYXk5a2oyWHZZMU5jdTE0blc0OVZBMVp6VSt0TlowN2pTR2RKNjBkM1FRTkNrenduUGI4N1d6VDdOcDh3UnpIekw2TXBWeXNQSk04bWt5QmJJaU1mOXhuTEc2Y1ZneGRyRVZNVFF3MHpEeThKS3dzdkJUY0hSd0ZYQTNMOWp2KzIrZDc0RXZwSzlJcjJ5dkVTODE3dHR1d0s3bTdvMHVzKzVhN2tLdWFtNFM3anR0NUszTjdmZ3RvbTJOYmJodFkrMVA3WHl0S1cwVzdRUnRNdXpoTE5Ccy82eXY3S0Fza095Q0xMUHNaaXhZN0V1c2Z1d3k3Q2NzRyt3UkxBYnNQU3Z6cStycjRpdmFhOUtyeTZ2RTYvNnJ1S3V6cTY2cnFtdW1hNk1ybit1ZHE1dHJtZXVZcTVncmw2dVlLNWlybWV1YmE1MXJuK3VpNjZZcnFpdXVhN01ydUd1K0s0UXJ5cXZScTlrcjRPdnBhL0hyK3l2RXJBN3NHU3drTEM5c095d0hiRlBzWU94dWJId3NTcXlaTEtoc3Q2eUhiTmVzNkt6NXJNcnRISzB1clFGdFZHMW5yWHR0VHkyanJiZnRqTzNpTGZmdHphNGtManB1RVc1b2JuL3VWNjZ2N29ndTRLNzVidEp2SzI4RkwxNnZlQzlTTDZ3dmhtL2hML3Z2MXZBeHNBeXdaL0JEY0o2d3VuQ1Y4UEd3elhFcHNRWHhZakYrTVZxeHR6R1Q4ZkN4elhJcWNnZHlaSEpCOHA3eXZIS1o4dmV5MVhNek14RHpidk5NczZxemlMUG04OFUwSTdRQjlHQjBmdlJkZEx3MG12VDU5TmoxTjdVV3RYVzFWUFcwTlpOMThyWFNOakYyRVRad2RsQTJyN2FQTnU3Mnp2Y3U5dzYzYnJkT2Q2NTNqbmZ1ZDg2NExyZ08rRzg0VDNpdnVJLzQ4RGpRdVRFNUVibHgrVks1c3ptVHVmUTUxTG8xT2hYNmRucFcrcmQ2bC9yNGV0ajdPYnNhTzNyN1c3dThPNXo3L1h2ZVBENjhIM3gvL0dCOGdUemh2TUk5SXIwRFBXUDlSRDJrdllVOTViM0dQaVorQnY1blBrZCtwNzZIL3VnK3lIOG9md2kvYUw5SXY2aS9pTC9vdjhoQUtBQUlBR2ZBUjBDbkFJYUE1Z0RGZ1NUQkJBRmpRVUtCb1lHQXdkL0Ivc0hkZ2p5Q0cwSjZBbGlDdHdLVmd2UUMwa013d3c3RGJNTkt3NmpEaG9Qa1E4SUVIOFE5UkJzRWVFUlZoTEtFajRUc3hNbUZKZ1VDaFY4RmU0Vlh4YlFGa0VYc1JjZ0dKQVkveGhzR2RvWlNCcTBHaUVialJ2NUcyUWN6aHc0SGFJZEN4NTBIdHdlUkIrckh4SWdkeURkSUVJaHB5RUxJbTRpMFNJekk1VWo5aU5YSkxja0ZpVjJKZFFsTWlhUEp1d21TQ2VqSi80bldTaXlLQXNwWXltN0tSSXFhU3EvS2hVcmFTdStLeEVzWXl5MUxBZ3RXQzJvTGZndFJpNlZMdUl1THk5N0w4WXZFVEJiTUtRdzdEQTFNWHd4d3pFSk1rNHlrekxYTWhvelhUT2VNK0F6SURSZ05KMDAzRFFaTlZZMWtUWE1OUWMyUVRaNk5ySTI2VFlnTjFVM2l6ZS9OL0kzSlRoWU9JazR1VGpvT0JnNVJqbDBPYUU1elRuNE9TSTZURHAxT3AwNnhEcnJPaEU3Tmp0Yk8zMDdvRHZDTytNN0F6d2lQRUE4WGp4N1BKYzhzanpOUE9jOEFEMFlQVEE5UnoxZFBYSTloejJiUGE0OXZ6M1FQZUE5N3ozOVBRcytGejRqUGk0K09UNUNQa3MrVXo1YVBtRStaejVyUG04K2NqNTFQblkrZUQ1NFBuZytkajUwUG5BK2JENW5QbUUrV3o1VVBrcytRajQ0UGk4K0l6NFlQZ28rL1QzdlBlQTkwRDNBUGE0OW5EMkpQWGM5WWoxTlBUYzlJRDBJUGZBODFqeTlQS0k4aHp4cVBFNDhNRHdTUFBJNzBqdXhPNUE3YlR0S095WTdBanZkT3JjNmtEcHBPa0E2R0RydU9jUTVtVGx0T1VBNUV6bmxPTGM0aURoWU9DYzQ5amZETjVFM1hUY3BOL1EydnphSU5sSTJHamJpTmFrMWNEVTFOZnMwdnpTRE5FYzBDalRMTTQwelRUTU9NODB5akRKS01nZ3l4VEdDTVQ0eCtUQzBNRzR3SmpEZkw1Z3ZVQzhHTDcwdWN5NHBMdDB0a2kxR0xma3NxeXhkTEE4c3dDdHhLeUVyMENwL0tpMHEyeW1JS1RVcDRTaU9LRGdvNHllTkp6WW40Q2FJSmpBbTF5VjhKU0lseHlSckpBOGtzaU5WSS9jaWx5STRJdGNoZGlFVUliRWdUaURwSDRRZkhoKzJIazhlNWgxOUhSTWRxQnc4SE04YllodnpHb1FhRkJxakdURVp2aGhMR05jWFloZnJGblVXL1JXRkZRd1ZraFFYRkp3VEh4T2lFaVFTcFJFbkVhY1FKeENtRHlRUG9nNGVEcG9ORlEyUURBc01oUXYrQ25jSzhBbG5DZDRJVlFqTEIwRUh0Z1lxQnA0RkVnV0ZCUGdEYkFQZkFsQUN3Z0V6QWFRQUZRQ0cvL2YrWi83Vy9VYjl0dndrL0pQN0FmdHcrdDc1VGZtNytDbjRsL2NGOTNMMjMvVk45YnYwS1BTVzh3VHpjZkxmOFU3eHUvQXE4Smp2Qis5MTd1VHRWTzNEN0RQc28rc1Q2NFBxOU9sbDZkYm9TZWk2NXkzbm9PWVQ1b2JsKytSdjVPVGpXZVBQNGtYaXZPRTA0YXpnSmVDZTN4ZmZrdDROM29uZEJkMkMzQURjZjl2LzJuN2EvdGwvMlFIWmhkZ0kySXpYRWRlWDFoM1dwZFV1MWJqVVF0VE4wMXJUNXRKMDBnUFNrOUVrMGJiUVNkRGR6M1BQQ00rZnpqZk8wTTFxelFYTm9jdy96TjdMZmNzZXk4REtZOG9JeXEzSlZjbjh5S2JJVU1qOHg2bkhWOGNGeDdiR1o4WWF4czdGaE1VN3hmVEVyY1JveENURTRjT2d3MkRESWNQa3dxakNic0kwd3YzQnhzR1N3VjdCTE1IN3dNekFuc0J5d0ViQUhjRDB2ODYvcDcrRXYyRy9RYjhodndPLzVyN0t2cSsrbDc1L3ZtcStWYjVEdmpHK0lyNFR2Z2UrKzczeXZlbTk0cjNkdmRtOTFyM1Z2ZFM5MWIzWXZkMjk0cjNwdmZLOS9MMEh2aFMrSXI0eXZrSytWYjVvdm42K2xiNnR2c2ErNGI3OHZocS9PTDlZdjNtL25MKy92K1MvQ3NBeXdGckFoTUN2d052QUNNRTN3V2JCbDhISndmekJMOEprd3BuQzBjSUp3MExEZk1PMncvTERMc1JyeEtuRTU4UW54V2ZGcU1YcHhTekdiOGF6eHZmR1BNZUJ4OGZIRE1oVXlKdkk1TWdzeVhYSnZza0p5bFBLbnNycHlqWExnY3ZQeXh6TWE4eTV6QWZOVnMybXpmZk5SODZYenVuT084K056OS9QTTlDRjBOblFMdEdEMGRqUkx0S0UwdHJTTU5PSDA5N1ROdFNPMU9mVVA5V1oxZkxWVE5hbTFnSFhYTmUzMXhQWWI5akwyQ2paaE5uaTJUL2FuZHI3MmxyYnVkc1kzSGpjMk53MzNaZmQ5OTFZM3JuZUd0OTczOTNmUU9DaDRBVGhaK0hLNFMzaWtPTDE0bG5qdmVNaDVJYms2dVJQNWJUbEdlWi81dVhtU3VldzV4Zm9mZWpqNkVycHNla1g2bjdxNXVwTjY3WHJIT3lFN096c1ZPMjg3U1R1amU3MTdsN3Z4Kzh3OEpud0FmRnE4ZEx4Ty9LazhnN3pkdlBnODBuMHN2UWI5WVQxN2ZWVzlyLzJLUGVTOS92M1pQak4rRGI1bi9rSituTDYyL3BFKzYzN0Z2eC8vT2Y4VVAyNS9TSCtpZjd5L2x2L3cvOHFBSkVBK1FCZ0FjY0JMZ0tWQXZ3Q1pBUExBeklFbUFUK0JHUUZ5Z1V4QnBjRy9RWmpCOGdITGdpVENQY0lYQW0vQ1NNS2h3cnFDazBMc0FzVERIWU0yQXc2RFp3Ti9nMWZEc0VPSVErQ0QrSVBRaENpRUFFUllCRy9FUjRTZkJMYkVqa1RsaFB6RTFBVXJCUUlGV1FWdnhVYUZuUVd6eFlvRjRJWDJoYzBHSXdZNUJnOEdaTVo2aGxBR3BZYTdScENHNWNiN0J0QUhKTWM1eHc1SFl3ZDNSMHZIb0FlMFI0aEgzRWZ3QjhQSUYwZ3F5RDRJRVVoa1NIZUlTb2lkU0svSWdvalZDT2RJK1lqTGlSMUpMd2tBaVZJSlkwbDBpVVhKbHNtbmliaEppTW5aU2VtSitjbkp5aG1LS1VvNUNnaUtXQXBuQ25ZS1JRcVR5cUtLc1FxL1NvMksyNHJwaXZkS3hRc1NTeC9MTE1zNkN3YkxVNHRnUzJ5TGVNdEV5NURMbk11b1M3UEx2d3VLaTlXTDRJdnJDL1hMd0F3S1RCUk1Ia3dvRERHTU93d0VqRTJNVm94ZlRHZ01jSXg1REVFTWlReVF6SmlNb0F5bmpLN010Y3k4aklOTXljelFUTmFNM0l6aVRPZ003WXp6RFBoTS9VekNEUWJOQzAwUHpSUE5HQTBielIrTkl3MG1UU21OTE0wdmpUSk5OTTAzVFRtTk80MDlUVDhOQUkxQ0RVTU5SQTFGRFVYTlJnMUdqVWFOUnMxR2pVWk5SYzFGRFVSTlE0MUNUVUVOZjQwOXpUd05PZzAzelRXTk13MHdqUzNOS3MwbmpTU05JTTBkVFJtTkZZMFJUUTBOQ0kwRHpUOE0ra3oxVFBBTTZvemxETjhNMlF6VERNME14c3pBVFBtTXNzeXJ6S1RNblV5VnpJNU1ob3krakhhTWJneGx6RjBNVk14THpFTU1lY3d3akNiTUhVd1RqQW5NUDR2MVMrc0w0TXZXUzh1THdNdjF5NnFMbjB1VHk0Z0x2RXR3UzJRTFdBdEx5MzlMTW9zbUN4a0xEQXMvQ3ZJSzVJclhDc2xLKzRxdGlwL0trWXFEU3JUS1prcFhpa2pLZWNvckNodktETW85U2U0SjNrbk95ZjdKcnNtZXlZNkp2Z2x0aVYwSlRJbDdpU3JKR2NrSXlUZUk1Z2pVeU1OSThZaWdDSTVJdkVocVNGaElSZ2h6eUNGSUR3ZzhSK21IMXNmRHgvRUhuZ2VLeDdlSFpFZFF4MzFIS2NjV0J3SkhMb2JhaHNiRzhzYWVob3BHdGNaaGhrekdlRVlqaGc2R09jWGtoYytGK29XbFJZL0Z1a1ZraFU3RmVRVWpCUTBGTndUZ2hNcEU4NFNkQklaRXI0UlloRUZFYWtRU3hEdEQ0NFBMdy9QRG04T0RnNnREVXNONlF5RkRDSU12d3RhQy9ZS2tRb3JDc1VKWGduM0NJNElKZ2k5QjFRSDZnYUFCaFVHcWdVL0JkTUVad1Q2QTQwRElBT3pBa1VDMXdGb0Fma0Fpd0FiQUt6L1BQL00vbHorNi8xNi9RbjlsL3dtL0xUN1FmdlArbDc2Ni9sNCtRYjVrL2dnK0szM092Zkg5bFQyNGZWdTlmcjBoL1FVOUtIekx2Tzc4a2p5MWZGaDhlL3dmZkFLOEpmdkplK3o3a0x1ME8xZjdlM3NmZXdNN0p2ckt1dTY2a25xMnVscjZmem9qdWdmNkxIblErZlc1bW5tL2VXUzVTYmx1K1JRNU9YamUrTVM0Nm5pUU9MWTRYSGhDdUdrNEQ3ZzJ0OTEzeEhmcmQ1SzN1amRodDBsM2NYY1pkd0czS2ZiUzl2dDJwTGFOdHJiMllIWktOblAySGZZSU5qSzEzWFhJTmZNMW5uV0o5YlcxWVhWTnRYbjFKblVUTlFBMUxYVGE5TWgwOW5Ta2RKTDBnWFN3TkY4MFRyUitOQzQwSGpRT05ENno3N1BnYzlHend6UDA4NmJ6bVRPTHM3NnpjYk5sTTFpelRMTkE4M1Z6S2ZNZTh4UHpDWE0rOHZVeTYzTGlNdGl5ei9MSE12N3l0dkt2TXFleW9IS1pjcEx5akhLR2NvQnl1ekoxc25EeWJESm5zbU95WC9KY01sanlWZkpUY2xEeVR2Sk04a3R5U2pKSk1rZ3lSN0pIY2tleVIvSklza215U3ZKTWNrNHlUL0pTTWxTeVYzSmFjbDN5WVhKbGNtbHliZkp5Y25jeWZESkJzb2N5alBLUzhwa3luN0ttY3EweXRISzdjb015eXZMUzh0c3k0M0xyOHZTeS9YTEdzdy96R1hNaTh5eXpOck1BODByelZYTmY4MnF6ZFhOQWM0dHpsck9oODYxenVUT0U4OUN6M1BQbzgvVXp3WFFOOUJwMEp6UXo5QUUwVGpSYmRHaTBkalJEdEpFMG56U3M5THIwaVBUWE5PVzA4L1RDdFJFMUgvVXV0VDIxRExWYnRXcjFlblZKdFpsMXFQVzR0WWkxMkxYb3RmajF5VFlaZGltMk9uWUs5bHUyYkhaOWRrNTJuN2F3dG9JMjAzYms5dloyeURjWnR5dDNQWGNQZDJGM2MzZEZ0NWczcW5lOHQ0ODM0ZmYwZDhkNEdqZ3MrRC80RXpobU9IazRUSGlmK0xNNGh2amFPTzM0d1hrVk9TajVQTGtRdVdTNWVMbE0rYUQ1dFRtSmVkMjU4Zm5HZWhyNkwzb0QrbGg2YlRwQnVwWjZxM3FBT3RVNjZmcisrdFA3S1BzOSt4TTdhRHQ5dTFLN3AvdTlPNUs3NkR2OWU5TDhLRHc5dkJNOGFMeCtQRk84cVh5Ky9KUzg2bnovL05XOUszMEJQVmI5YkgxQ2ZaZzlyZjJEdmRtOTczM0ZQaHIrTVA0R3ZseStjbjVJUHAzK3M3Nkp2dDkrOVg3TFB5RC9OdjhNdjJKL2VIOU4vNk8vdVgrUFArVC8rdi9RUUNYQU8wQVJBR2FBZkFCUmdLY0F2SUNTQU9lQS9RRFNRU2ZCUFFFU2dXZkJmVUZTUWFlQnZJR1J3ZWJCKzhIUXdpWENPc0lQZ21SQ2VVSk9BcUxDdDBLTHd1QkM5UUxKUXgzRE1nTUdnMXJEYnNOQ3c1YkRxc08rdzVMRDVvUDZRODNFSVlRMUJBaUVYQVJ2aEVMRWxjU3BCTHdFandUaUJQVUV4NFVhUlMwRlA0VVNCV1NGZHNWSkJadEZyVVcvUlpGRjQwWDFCY2FHR0VZcGhqc0dERVpkaG03R2Y4WlF4cUhHc2thREJ0T0c1QWIwUnNUSEZNY2xCelVIQlFkVkIyU0hkRWREeDVNSG9rZXhoNENIejBmZVIrMEgrOGZLU0JpSUpzZzFTQU5JVVVoZkNHMEllb2hJU0pXSW9zaXdDTDFJaWdqWENPT0k4RWo4eU1sSkZVa2hpUzJKT1lrRlNWREpYRWxueVhNSmZnbEpDWlFKbnNtcGliUUp2b21JeWRNSjNNbm15ZkNKK2tuRHlnMEtGa29mU2loS01RbzV5Z0pLU3NwVENsdEtZNHByU25NS2VzcENTb21La01xWHlwN0twWXFzU3JLS3VRcS9Db1ZLeTByUkN0YkszSXJoeXVkSzdFcnhpdmFLKzByQUN3UkxDSXNNeXhDTEZJc1lTeHZMSDBzaWl5WExLTXNyeXk2TE1Vc3p5ellMT0VzNlN6eExQZ3MveXdGTFFvdER5MFRMUmN0R2kwZExSOHRJQzBoTFNJdElpMGhMU0F0SFMwYkxSZ3RGQzBQTFFzdEJpMEFMZm9zOHl6ckxPTXMyaXpSTE1jc3ZTeXpMS2dzbXl5UExJSXNkQ3hsTEZjc1NDdzRMQ2dzRnl3RkxQTXI0U3ZPSzdvcnBpdVJLM3dyWml0UUt6b3JJeXNMSy9NcTJpckJLcVlxakNweEtsVXFPU29jS3Y4cDRTbkNLYVFwaENsbEtVVXBKQ2tES2VFb3Z5aWRLSGtvVmlneUtBNG82Q2ZESjUwbmRpZFBKeWduQUNmWEpxNG1oU1piSmpFbUJpYmNKYkFsaENWWEpTc2wvaVRRSktJa2N5UkVKQlFrNUNPekk0TWpVU01mSSswaXVpS0hJbE1pSHlMcUliWWhnU0ZNSVJZaDRDQ3BJSElnT3lBRElNc2ZraDlaSHlBZjVoNnNIbkVlTng3OEhjRWRoUjFKSFEwZDBCeVRIRlljR0J6YUc1d2JYUnNlRzk4YW54cGZHaDRhM2htZEdWd1pHaG5aR0pjWVZSZ1NHTThYakJkSUZ3VVh3Ulo4RmpnVzlCV3ZGV2tWSkJYZUZKZ1VVaFFMRk1VVGZoTTNFL0FTcUJKaEVoZ1MwQkdJRVQ4UjloQ3RFR1FRR2hEUUQ0WVBQQS94RHFjT1d3NFFEc1VOZVEwdERlRU1sUXhJRFBzTHJndGhDeE1MeFFwM0Npa0syZ21MQ1RzSjZ3aWFDRXNJK2dlcEIxZ0hCd2UxQm1NR0VRYStCV3NGRndYREJHNEVHd1RHQTNFREhBUEdBbkFDR2dMRUFXMEJGZ0hBQUdrQUVRQzYvMkwvQ2YreC9saisvLzJtL1UzOTgveWEvRUQ4NS91Tit6TDcyUHA5K2lQNnlQbHQrUkw1dC9oYytBSDRwZmRLOSsvMmsvWTQ5dHoxZ1BVbDljcjBiL1FVOUxuelh2TUM4NmZ5VFBMeDhaYnhQUEhoOElid0svRFI3M2Z2SGUvRDdtcnVFTzYzN1YzdEJlMnQ3RlRzL091bDYwM3I5ZXFlNmtmcThlbWI2VWJwOGVpYjZFZm84dWVlNTBybitPYWs1bExtQU9hdDVWemxDK1c3NUd2a0d1VE00MzNqTCtQaDRwVGlSK0w3NGJEaFplRWE0ZERnaCtBKzRQWGZydDluM3lIZjI5NlYzbEhlRGQ3SjNZZmRSTjBEM2NMY2d0eEMzQVBjeGR1STIwcmJEdHZUMnBuYVg5b20ydTNadHRsLzJVblpFOW5mMkt2WWQ5aEUyQlBZNDlleTE0UFhWZGNuMS9yV3p0YWoxbmpXVDlZbTF2N1YxOVd4MVl2Vlo5VkUxU0hWLzlUZTFMM1VudFIvMUdMVVJkUXAxQTdVOU5QYTA4TFRxdE9VMDM3VGF0TlYwMFBUTU5NZjB3N1QvdEx2MHVIUzFOTEgwcnpTc3RLbzBwL1NsOUtRMG9uU2hOS0EwbnpTZWRKMzBuYlNkdEozMG5uU2U5Siswb0xTaDlLTTBwTFNtZEtoMHFyU3M5Szkwc2pTMDlMZzB1M1MrOUlLMHhuVEtkTTYwMHJUWGROdjA0UFRsdE9xMDcvVDFkUHIwd0hVR05RdzFFalVZZFI2MUpUVXJ0VEsxT1hVQWRVZDFUdlZXTlYyMVpQVnN0WFIxZkhWRWRZeTFsUFdkZGFXMXJqVzI5YisxaUxYUnRkcTE0L1h0TmZhMXdEWUo5aE4ySFRZbk5qRjJPM1lGOWxCMld2WmxkbkEyZXpaRjlwRDJuRGFuTnJLMnZmYUpkdFMyNEhic052ZzJ3L2NQOXh3M0tIYzB0d0UzVGJkYU4yYjNjN2RBZDQxM21uZW5kN1MzZ2ZmUE45eTM2amYzOThXNEU3Z2hlQzk0UFhnTGVGbDRaN2gyT0VSNGt2aWhlTEE0dnJpTmVOeDQ2M2o2ZU1tNUdMa24rVGM1Qm5sVitXVTVkUGxFZVpRNW8vbXorWU81MDduanVmTzV3N29UK2lRNk5Ib0UrbFY2WmJwMmVrYjZsM3FuK3JqNmlYcmFldXQ2L0RyTk94NDdMenNBTzFGN1ludHp1MFQ3bG51bnU3azdpbnZiKysxNy92dlF2Q0k4TS93RmZGYzhhVHg2L0V5OG5ueXdmSUk4MUR6bVBQZzh5ajBjUFM0OUFEMVNmV1I5ZHIxSXZacjlyVDIvUFpGOTQzMzF2Y2YrR2o0c2ZqNitFVDVqUG5XK1IvNmFQcXkrdnY2UlB1Tis5ZjdJUHhwL0xMOCsveEUvWTM5MS8wZy9tcitzdjc3L2tYL2p2L1gveDhBYUFDeEFQb0FRZ0dMQWRNQkhBSmxBcTBDOVFJOUE0VUR6UU1WQkYwRXBRVHRCRFFGZXdYQ0JRa0dVQWFYQnQ0R0pRZHNCN01IK1FjL0NJVUl5d2dSQ1ZZSm13bmhDU1lLYWdxdkN2UUtPQXQ5QzhFTEJReElESXdNend3U0RWVU5tQTNiRFIwT1hnNmdEdUlPSXc5a0Q2VVA1ZzhtRUdjUXB4RG1FQ1lSWlJHa0VlSVJJUkpmRXAwUzJ4SVpFMVlUa2hQUEV3c1VSeFNERkw4VStoUTFGVzhWcVJYa0ZSMFdWaGFRRnNnV0FSYzVGM0FYcUJmZkZ4WVlUQmlER0xrWTdoZ2tHVmtaalJuQkdmUVpLQnBiR280YXdCcnpHaVFiVlJ1R0c3Y2I1eHNYSEVjY2RoeWtITk1jQVIwdUhWc2RpQjIwSGVBZERCNDNIbUllalI2M0h1QWVDUjh5SDFzZmd4K3FIOUVmK0I4ZUlFUWdhaUNQSUxNZzF5RDdJQjRoUVNGa0lZWWhweUhKSWVraENpSXBJa2tpYUNLSElxVWl3eUxnSXZ3aUdDTTBJMDhqYXlPRkk1OGp1U1BTSStzakF5UWJKRElrU0NSZkpIVWtpaVNmSkxRa3lDVGNKTzhrQWlVVUpTWWxOeVZJSlZnbGFDVjNKWVVsbENXaUphOGx2Q1hKSmRVbDRDWHJKZllsQUNZS0poTW1IQ1lrSml3bU15WTVKa0FtUmlaTEpsQW1WU1paSmwwbVlDWmlKbVFtWmlabkptY21aeVpuSm1ZbVpDWmlKbUFtWFNaYUpsWW1VaVpOSmtnbVFpWThKalVtTGlZbUpoNG1GaVlOSmdRbStpWHZKZVFsMlNYT0pjSWx0U1duSlprbGl5VjlKVzRsWHlWUEpUOGxMaVVjSlFvbCtTVGxKTklrdmlTckpKWWtnaVJzSkZZa1FDUXFKQklrL0NQa0k4d2pzeU9hSTRBalpTTkxJekFqRkNQNEl0d2l2eUtpSW9RaVppSklJaWtpQ2lMcUljb2hxaUdKSVdjaFJpRWtJUUloM2lDN0lKZ2dkQ0JQSUNzZ0JTRGdIN29mbEI5dEgwWWZIaC8ySHM0ZXBoNTlIbFFlS2g0QUh0WWRxeDJBSFZVZEtCMzhITkFjb3h4MkhFa2NHeHp0Rzc0Ymp4dGdHekViQVJ2UkdxQWFieG8rR2cwYTJ4bXBHWGNaUlJrU0dkOFlxeGg0R0VRWUVCamJGNmNYY2hjOUZ3Y1gwUmFiRm1VV0xoYjNGY0FWaVJWUkZSa1Y0UlNwRkhBVU54VCtFOFVUaXhOU0V4Z1QzaEtqRW1rU0xoTHpFYmdSZlJGQkVRVVJ5UkNORUZBUUZCRFdENW9QWEE4ZkQrSU9wUTVuRGlrTzZ3MnREVzROTUEzeERMSU1jd3cwRFBVTHRndDJDellMOWdxMkNuWUtOZ3IyQ2JVSmRRazBDZk1Jc2doeENEQUk3Z2V0QjJzSEtRZm5CcVVHWXdZZ0J0NEZtd1ZZQlJVRjBnU1BCRXNFQ0FURkE0QURQQVA0QXJNQ2JnSXBBdVFCbndGYUFSUUJ6Z0NKQUVNQS9mKzMvM0QvS3YvaS9wditWUDRNL3NYOWZ2MDIvZTc4cHZ4ZS9CYjh6ZnVGK3ozNzlQcXIrbVA2R3ZyUytZbjVRUG40K0svNFp2Z2QrTlAzaXZkQjkvajJydlpsOWh2MjB2V0o5VUQxOS9TdTlHWDBIUFRUODRyelFmUDU4ckR5Wi9JZjh0ZnhqL0ZIOGYvd3VQQnc4Q253NGUrYjcxVHZEZS9IN29IdU91NzA3YS90YWUwazdlRHNtK3hYN0JQc3ordU02MGpyQmV2QzZvRHFQdXI4NmJ2cGVlazU2ZmpvdU9oNTZEcm8rK2U5NTM3blFlY0Q1OGJtaWVaTjVoTG0xK1djNVdIbEorWHU1TFhrZk9SRTVBM2sxZU9mNDJqak0rUCs0c3JpbHVKajRpL2kvZUhMNFpyaGFlRTU0UW5oMnVDcjRIM2dVT0FqNFBmZnk5K2czM2JmUzk4aTMvcmUwZDZxM29QZVhkNDQzaFBlN3QzTDNhamRoZDFrM1VQZEk5MEQzZVRjeHR5bzNJdmNiOXhUM0RuY0h0d0YzT3ZiMDl1NzI2VGJqdHQ0MjJQYlQ5czcyeWpiRnRzRTIvUGE0OXJVMnNYYXQ5cXEycDNha2RxRjJudmFjZHBvMmwvYVY5cFAya2phUXRvOTJqamFOTm93MmkzYUs5b3EyaW5hS05vcDJpcmFLOW91MmpEYU5ObzQyanphUWRwRzJremFVOXBiMm1QYWE5cDAybjNhaDlxUjJwemFwOXF6MnIvYXpOcloydWZhOWRvRTJ4UGJJOXN6MjBQYlZOdG0yM2ZiaWR1YzI2L2J3dHZXMityYi85c1QzQ25jUDl4VjNHdmNnOXlhM0xMY3l0emkzUHZjRmQwdTNVbmRZOTErM1puZHRkM1IzZTNkQ3Q0bzNrWGVZOTZCM3FEZXY5N2UzdjNlSHQ4KzMxL2ZnTitpMzhQZjV0OEk0Q3ZnVHVCeTRKYmd1dURmNEFUaEtlRlA0WFhobk9IQzRlbmhFT0k0NGwvaWlPS3c0dG5pQStNczQxYmpnZU9zNDlmakFlUXM1RmpraE9TdzVOemtDZVUyNVdQbGtlWEE1ZTdsSE9aTDVudm1xdWJhNWdybk8rZHI1NXpuemVmOTV5L29ZZWlUNk1YbzkrZ3E2VnpwaituRDZmZnBLK3BmNnBQcXlPcjk2akxyWit1YzY5THJDT3crN0hYc3Eremk3Qm50VCsySDdiN3Q5ZTB0N21UdW5lN1Y3ZzN2UnU5Lzc3anY4ZThxOEdQd25mRFg4Qkh4Uy9HRjhjRHgrdkUxOG5EeXEvTG04aUh6WFBPWDg5UHpEdlJLOUliMHd2VCs5RHIxZHZXejllLzFLL1pvOXFYMjRmWWQ5MXIzbC9mVTl4SDRUdmlNK01uNEJ2bEQrWUg1dnZuOCtUbjZlUHExK3ZMNkwvdHQrNnY3NlBzbS9HVDhvdnpnL0IzOVcvMlovZGI5RlA1Uy9wRCt6ZjRMLzBuL2h2L0Uvd0FBUGdCN0FMa0E5Z0F6QVhFQnJnSHJBU2dDWlFLaUF0OENHd05ZQTVVRDBnTU9CRXNFaHdUREJBQUZQQVY0QmJRRjd3VXJCbWNHb2diZUJoZ0hWQWVQQjhvSEJRaEFDSG9JdFFqdkNDa0pZd21kQ2RjSkVBcEpDb0lLdXdyMENpMExaUXVlQzlZTERneEdESDRNdFF6c0RDTU5XZzJSRGNnTi9nMDBEbW9Pb0E3VkRnb1BQdzkwRDZnUDNROFJFRVVRZVJDdEVPQVFFeEZHRVhrUnF4SGRFUThTUVJKeUVxTVMxQklFRXpRVFpCT1VFOFFUOHhNaUZGRVVnQlN1Rk53VUNSVTJGV01Wa0JXOUZla1ZGUlpCRm13V2x4YkJGdXdXRmhkQUYya1hreGU3RitRWERCZzBHRnNZZ3hpcEdOQVk5aGdjR1VJWlp4bU1HYkFaMVJuNUdSMGFRUnBrR29ZYXFSckxHdXdhRGhzdUcwOGJieHVQRzY0YnpSdnNHd3NjS1J4R0hHUWNnUnlkSExvYzFSenhIQXNkSmgxQkhWb2RkQjJOSGFZZHZoM1dIZTRkQlI0ZEhqTWVTUjVmSG5VZWlSNmVIcklleGg3YUh1MGVBQjhTSHlRZk5oOUhIMWdmYUI5NEg0Y2ZseCtsSDdNZndSL1BIOXdmNlIvMUh3RWdEQ0FYSUNJZ0xTQTNJRUFnU1NCU0lGb2dZaUJwSUhFZ2R5QitJSU1naVNDT0lKTWdseUNiSUo0Z29pQ2tJS1lncUNDcElLb2dxeUNySUtvZ3FpQ3BJS2NncGlDaklLRWduU0NhSUpZZ2tpQ05JSWtnZ3lCOUlIWWdjQ0JwSUdFZ1dTQlJJRWdnUHlBMklDd2dJU0FYSUFzZ0FDRDBIK2dmM0IvUEg4SWZ0QittSDVnZmlCOTVIMmtmV1I5Skh6a2ZKeDhWSHdNZjhSN2VIc3NldUI2a0hwQWVleDVtSGxFZU94NGxIZzRlOXgzZ0hjZ2RzQjJaSFlBZFp4MU9IVFFkR2gwQUhlVWN5aHl2SEpNY2R4eGJIRDRjSVJ3REhPWWJ5QnVwRzRvYmF4dE1HeXdiREJ2c0dzb2FxUnFJR21ZYVJCb2lHdjhaM1JtNkdaWVpjaGxPR1NrWkJSbmdHTHNZbFJodkdFa1lJaGo3RjlVWHJSZUZGMTBYTlJjTkYrUVd1eGFTRm1nV1BoWVZGdXNWd0JXV0ZXb1ZQeFVURmVjVXV4U1BGR0lVTmhRSkZOd1RyaE9CRTFNVEpSUDJFc2dTbVJKcUVqc1NDeExjRWF3UmZCRk1FUnNSNnhDNkVJa1FXQkFtRVBVUHd3K1JEMkFQTGcvN0Rza09sZzVrRGpFTy9nM0xEWmNOWkEwd0Rmd015QXlVREY4TUt3ejJDOEVMakF0WEN5SUw3QXEzQ29JS1RBb1dDdUVKcXdsMUNUOEpDUW5UQ0owSVpnZ3ZDUGdId2dlTEIxUUhIUWZtQnE0R2VBWkFCZ2tHMFFXWkJXSUZLUVh4QkxvRWdnUkpCQklFMmdPaEEya0RNQVAzQXI4Q2hnSk5BaFVDM0FHakFXb0JNUUg0QUw4QWhRQk1BQklBMnYrZy8yZi9MZi96L3JyK2dQNUcvZ3orMGYyWC9WMzlJdjNuL0szOGN2dzQvUDM3d3Z1SCswejdFZnZXK3B2NllQb2srdW41cnZseitUajUvZmpDK0liNFMvZ1ErTlgzbXZkZTl5UDM2UGF1OW5QMk4vYjk5Y0wxaVBWTjlSTDEyUFNlOUdQMEtmVHU4N1R6ZXZOQTh3Ynp6ZktUOGxyeUlQTG44YTd4ZGZFOThRVHh6UENVOEZ6d0pQRHQ3N1h2ZnU5SDd4RHYydTZrN20zdU9PNEM3czN0bCsxajdTN3QrdXpHN0pMc1grd3M3UG5yeHV1VTYyTHJNT3YvNnM3cW51cHQ2ajdxRHVyZjZiRHBndWxVNlNicCtPakw2SjdvY2VoRzZCcm83K2ZGNTVybmNPZEc1eDNuOU9iTTVxVG1mZVpXNWpEbUN1Yms1Yi9sbStWMzVWUGxNT1VONWVya3llU281SWZrWnVSRzVDZmtDT1RwNDh6anJ1T1I0M1hqV2VNOTR5UGpDT1B1NHRYaXZPS2s0b3ppZGVKZTRramlNdUlkNGduaTlPSGg0YzNodStHcDRaamhoK0YyNFdiaFYrRkk0VHJoTE9FZjRSUGhCK0g3NFBEZzVlRGI0TkxneWVEQjRMbmdzZUNxNEtUZ251Q1k0SlBnaitDTDRJZmdoT0NCNEg3Z2ZlQjg0SHZnZXVCNjRIdmdmT0IrNElEZ2d1Q0Y0SW5nak9DUTRKWGdtdUNmNEtYZ3ErQ3g0TGpnd09ESDRNL2cxK0RnNE9uZzgrRDk0QWpoRXVFZTRTbmhOZUZCNFU3aFcrRm80WGJoaE9HUzRhSGhyK0cvNGM3aDN1SHY0UURpRWVJaTRqVGlSdUpaNG16aWZ1S1M0cWJpdXVMUDR1VGkrT0lPNHlUak91TlE0MmZqZnVPVjQ2M2p4dVBlNC9makVPUXA1RUxrWE9SMzVKSGtyT1RINU9May91UWE1VGJsVStWdzVZN2xyT1hKNWVqbEJ1WWw1a1RtWSthRDVxUG13K2JqNWdUbkplZEg1MmpuaXVlczU4L244ZWNVNkRmb1craC82S1BveCtqczZCRHBOdWxiNllIcHB1bk02ZkxwR2VwQTZtZnFqdXExNnQzcUJlc3Q2MWJyZit1bjY5RHIrZXNqN0Uzc2QreWg3TXZzOXV3ZzdVdnRkKzJpN2M3dCtlMGw3bEx1ZnU2cTd0ZnVCTzh4NzEvdmpPKzY3K2Z2RmZCRDhITHdvUERQOFA3d0xmRmM4WXZ4dXZIcDhSbnlTZko1OHFueTJ2SUs4enZ6YlBPYzg4M3ovdk12OUdIMGt2VEQ5UFgwSi9WWTlZcjF2UFh2OVNIMlUvYUc5cmoyNnZZZDkxRDNnL2UxOStuM0hQaFArSUw0dGZqcCtCejVVUG1EK2JiNTZ2a2UrbEw2aGZxNSt1MzZJZnRVKzRqN3ZQdncreVQ4V1B5TS9NRDg5UHdvL1Z6OWtQM0YvZm45TGY1aC9wWCt5Zjc5L2pIL1pQK1ovODMvQUFBekFHY0Ftd0RQQUFNQk53RnFBWjRCMGdFR0Fqa0NiUUtoQXRRQ0J3TTZBMjBEb0FQVEF3WUVPUVJzQko4RTBRUUVCVGNGYVFXYkJjNEZBQVl5Qm1RR2xnYklCdmtHS3dkY0I0MEh2d2Z3QnlFSVVRaUNDTE1JNHdnVUNVUUpkQW1rQ2RRSkF3b3lDbUlLa1FyQUN1OEtIZ3RNQzNvTHFBdldDd1FNTWd4Z0RJNE11d3pvREJRTlFRMXREWm9OeGczeURSNE9TUTUwRHA4T3lnNzFEaUFQU2c5MEQ1NFB5QS95RHhzUVJCQnNFSlVRdmhEbUVBNFJOUkZjRVlRUnFoSFJFZmdSSGhKRUVtb1NrQksxRXRvUy94SWtFMGdUYkJPUUU3UVQxeFA2RXgwVVB4UmhGSU1VcGhUSEZPZ1VDQlVwRlVrVmFSV0pGYWtWeUJYbkZRVVdKQlpDRm1BV2ZSYWJGcmdXMVJieEZnMFhLUmRFRjE4WGVoZVVGNjhYeVJmakYvd1hGaGd1R0VjWVh4aDNHSTRZcGhpOEdOTVk2UmovR0JRWktSaytHVk1aYUJsOEdZOFpveG0yR2NnWjJobnNHZjRaRHhvZ0dqRWFRaHBTR21FYWNScUFHbzhhblJxckdya2F4aHJUR3VBYTdCcjRHZ1FiRHhzYUd5VWJMeHM1RzBNYlRCdFZHMTRiWmh0dUczVWJmUnVFRzRzYmtSdVhHNXdib1J1bUc2b2JyaHV5RzdVYnVCdTdHNzBidnh2Qkc4SWJ3eHZFRzhRYnhCdkVHOE1id3h2Qkc4QWJ2UnU3RzdnYnRSdXlHNjRicWh1bUc2RWJuQnVXRzVFYmlodUVHMzBiZGh0dkcyY2JYeHRYRzA0YlJSczdHekliSnhzZEd4SWJCeHY3R3ZBYTVCclhHc29hdmhxd0dxSWFsQnFHR25jYWFScFpHa2thT2hvcEdoa2FDQnIyR2VVWjB4bkJHYTRabXhtSUdYVVpZUmxPR1RrWkpSa1FHZnNZNVJqUEdMZ1lvaGlMR0hRWVhSaEdHQzRZRlJqOUYrVVh5eGV5RjVnWGZ4ZGtGMGtYTGhjVUYvZ1czQmJBRnFRV2lCWnJGazRXTVJZVUZ2WVYyQlc2RlpzVmZCVmVGVDRWSHhYL0ZOOFV2eFNlRkgwVVhCUTdGQm9VK0JQV0U3UVRraE52RTAwVEtSTUdFK0lTdnhLYkVuY1NVaEl1RWdrUzVCRy9FWmtSZEJGUEVTa1JBeEhjRUxZUWp4QnBFRUlRR2hEeUQ4c1Bvdzk2RDFJUEtnOEJEOWtPc0E2R0RsME9OQTRLRHVBTnRnMkxEV0VOTncwTURlSU10d3lNREdFTU5nd0xETjhMdEF1SUMxd0xNQXNFQzlnS3JBcC9DbE1LSmdyNUNjd0pud2x4Q1VRSkZ3bnFDTHdJandoaENETUlCUWpZQjZvSGZBZE9CeUFIOGdiREJwVUdad1k0QmdrRzJ3V3NCWDBGVHdVZ0JmRUV3Z1NTQkdNRU5BUUZCTllEcGdOM0EwY0RHQVBvQXJrQ2lRSlpBaW9DK2dIS0Fac0Jhd0U4QVF3QjNBQ3NBSHdBVEFBY0FPMy92ZitOLzEzL0xmLzgvc3orblA1cy9qeitEUDdjL2F2OWUvMUwvUnI5NnZ5Ni9JcjhXZndwL1BuN3lQdVkrMmo3Ti9zSCs5YjZwdnAxK2tYNkZmcmwrYlg1aFBsVStTVDU5UGpEK0pUNFkvZ3orQVA0MC9lajkzUDNSUGNVOStUMnRQYUY5bGIySnZiMzljZjFtUFZwOVRyMUMvWGM5SzcwZi9SUjlDUDA5UFBHODVqemEvTTk4dy96NHZLMThvanlXL0l1OGdIeTFmR3A4WDN4VWZFbDhmcnd6L0NrOEhud1R2QWs4UG52eisrbDczenZVdThwN3dEdjJPNnY3b2Z1WU80NDdoSHU2dTNEN1p6dGR1MVE3U3Z0QmUzZzdMdnNsdXh5N0Uvc0srd0k3T1hyd3V1ZzYzL3JYZXM3Nnhycit1cmE2cnJxbStwNzZsM3FQdW9nNmdMcTVlbkg2YXZwaitsejZWZnBQT2toNlFmcDdlalQ2THJvb2VpSjZISG9XZWhDNkN2b0ZPais1K25uMCtlLzU2cm5sdWVDNTIvblhPZEs1empuSnVjVjV3WG45ZWJsNXRibXgrYTQ1cXJtbk9hUDVvSG1kT1pvNWx6bVVlWkc1anZtTWVZbjVoN21GZVlNNWdUbS9PWDA1ZTNsNStYaDVkdmwxZVhRNWN2bHh1WEQ1Yi9sdk9XNTViYmx0T1d5NWJIbHNPV3Y1YTdscnVXdjVhL2xzT1d4NWJQbHRPVzM1Ym5sdmVYQTVjVGx5T1hNNWREbDFlWGI1ZURsNXVYczVmTGwrZVVBNWdqbUQrWVg1aC9tS09ZeDVqcm1ST1pPNWxqbVl1WnQ1bmptZythUDVwdm1wK2EwNXNIbXp1YmI1dW5tOStZRjV4VG5JK2N5NTBMblV1ZGg1M0xuZ3VlVDU2VG50dWZJNTlybjdPZi81eEhvSk9nNDZFdm9YK2gwNklqb25laXk2TWpvM2VqejZBbnBJT2szNlUzcFpPbDg2WlBwcStuRTZkenA5ZWtPNmlmcVFPcGE2blRxanVxbzZzUHEzdXI1NmhUck1PdE02MmpyaE91aDY3N3IyK3Y0NnhYc00reFI3SERzanV5dDdNenM2K3dLN1NydFNlMXA3WW50cXUzSzdldnRETzR0N2s3dWNPNlM3clR1MXU3NTdodnZQdTloNzRUdnFPL003Ky92RS9BMzhGdndmL0NrOE1udzd2QVQ4VGp4WGZHRDhhanh6dkh6OFJueVAvSm04bzN5cy9MYThnSHpLUE5RODNmem4vUEc4Kzd6RnZRKzlHZjBqL1M0OU9EMENmVXg5VnIxaFBXdDlkYjFBUFlwOWxQMmZQYW05dEQyK3ZZazkwNzNlUGVpOTh6MzkvY2grRXo0ZC9paCtNejQ5L2dpK1UzNWVQbWorYy81K3ZrbStsSDZmUHFuK3RQNi92b3ErMWI3Z2Z1dCs5bjdCZnd4L0Z6OGlQeTAvT0Q4RFAwMy9XUDlqLzI3L2VmOUZQNUEvbXorbVA3RC92RCtIUDlJLzNUL29QL00vL2ovSXdCT0FIb0FwZ0RTQVAwQUtRRlZBWUFCckFIWEFRTUNMZ0phQW9VQ3NRTGNBZ2dETXdOZUE0a0R0QVBmQXdvRU5RUmdCSXNFdFFUZ0JBb0ZOUVZmQllvRnRBWGVCUWNHTVFaYkJvVUdyZ2JZQmdFSEt3ZFVCMzBIcGdmT0IvY0hJQWhJQ0hBSW1RakJDT2tJRVFrNENXQUpod211Q2RVSi9Ba2pDa29LY1FxWENyMEs0d29KQ3k4TFZRdDdDNkFMeFF2ckN4QU1OQXhaREgwTW9nekdET29NRFEweERWVU5lQTJiRGI0TjRBMEREaVVPUnc1cERvc09yUTdQRHZBT0VROHlEMUlQY3crVEQ3TVAwZy95RHhJUU1CQlFFRzRRakJDckVNa1E1eEFGRVNJUlB4RmNFWGdSbFJHeEVjMFI2UkVGRWlBU094SldFbkVTaXhLbEVyOFMyQkx4RWdzVEpCTTlFMVVUYlJPRkU1d1RzeFBMRStJVCtSTVBGQ1VVT3hSUUZHWVVleFNRRktRVXVSVE1GT0FVOUJRSEZSb1ZMUlZBRlZJVlpCVjJGWWNWbUJXcEZib1Z5aFhhRmVrVitSVUlGaGNXSmhZMEZrSVdVQlpkRm1zV2R4YUVGcEVXblJhcEZyUVd3QmJMRnRVVzRCYnFGdlFXL1JZSEZ4QVhHUmNoRnlrWE1SYzVGejhYUmhkTkYxTVhXUmRmRjJRWGFSZHVGM01YZHhkN0YzOFhneGVIRjRvWGpCZU9GNUFYa1JlVEY1UVhsUmVWRjVZWGxoZVdGNVVYbEJlVEY1RVhrQmVPRjR3WGlSZUdGNE1YZnhkN0YzY1hjaGR0RjJrWFpCZGVGMWdYVWhkTEYwVVhQaGMyRnk4WEp4Y2ZGeGNYRGhjRkYvd1c4aGJwRnQ4VzFSYktGcjhXdEJhcEZwMFdrUmFGRm5nV2F4WmVGbEVXUXhZMUZpY1dHQllLRnZzVjdCWGNGY3dWdkJXc0Zad1ZpeFY2RldrVlZ4VkZGVE1WSVJVT0Zmc1U2QlRWRk1JVXJoU2FGSVlVY1JSY0ZFY1VNaFFkRkFjVThSUGFFOFFUclJPV0UzOFRaeE5RRXpnVElCTUlFKzhTMWhLOUVxUVNpeEp4RWxjU1BSSWpFZ2dTN1JIU0ViY1JuQkdBRVdVUlNSRXNFUkFSOHhEV0VMa1FuQkIrRUdFUVF4QWxFQWNRNkEvS0Q2c1BqQTl0RDA0UExnOE9EKzhPenc2dkRvOE9iZzVPRGkwT0RBN3JEY29OcVEySERXWU5SQTBpRFFBTjNneTdESmtNZGd4VEREQU1EUXpwQzhZTG93dC9DMXNMTndzVEMrNEt5Z3FsQ29FS1hBbzRDaE1LN2duSkNhUUpmd2xaQ1RNSkRRbm9DTUlJbkFoMkNGQUlLZ2dEQ04wSHR3ZVFCMm9IUXdjY0IvVUd6d2FvQm9FR1dnWXpCZ3NHNUFXOEJaVUZiZ1ZHQlI4Rjl3VFBCS2NFZ0FSWUJEQUVDUVRoQTdrRGtRTnBBMEVER1FQeEFzZ0NvQUo0QWxBQ0tBSUFBdGNCcndHSEFWOEJOZ0VPQWVZQXZRQ1ZBRzBBUkFBY0FQWC96UCtrLzN6L1UvOHIvd1AvMnY2eS9vcitZdjQ1L2hIKzZmM0EvWmo5Y1AxSS9SLzk5L3pQL0tmOGYveFgvQy84Qi96ZSs3YjdqdnRtK3o3N0Z2dnUrc2Y2bi9wMytrLzZKL29BK3RuNXNmbUorV0w1T3ZrVCtlejR4UGlkK0hYNFR2Z24rQUg0MmZlejk0ejNadmMvOXhqMzh2Yk05cVgyZi9aWjlqUDJEdmJvOWNMMW5mVjQ5VkwxTGZVSTllUDB2dlNhOUhYMFVmUXQ5QWowNVBQQTg1M3pldk5XOHpQekVQUHQ4c3Z5cVBLRzhtVHlRdkloOHYveDNmRzg4WnZ4ZS9GYThUcnhHdkg2OE5yd3V2Q2I4SHp3WGZBLzhDRHdBdkRrNzhmdnFlK003Mi92VXU4Mjd4cnYvdTdqN3NmdXJlNlM3bmZ1WE81QzdpanVEKzcyN2QzdHhPMnM3WlR0Zk8xbDdVM3ROdTBnN1FydDlPemU3TW5zcyt5ZjdJcnNkdXhpN0Uvc08rd283QlhzQSt6eDYrRHJ6dXUrNjYzcm5ldU42MzNyYmV0ZTYxRHJRZXN6NnlYckYrc0s2LzdxOGVybDZ0bnF6ZXJDNnJmcXJPcWk2cGpxanVxRTZudnFjdXBxNm1McVd1cFM2a3ZxUk9vOTZqZnFNZW9yNmlicUlPb2M2aGZxRStvUDZndnFDT29GNmdMcS8rbjk2ZnZwK3VuNDZmZnA5dW4xNmZUcDlPbjE2ZlhwOXVuMzZmbnArK244NmYvcEFlb0U2Z2ZxQ3VvTzZoSHFGZW9hNmgvcUpPb3A2aS9xTk9vNjZrRHFSK3BONmxUcVhPcGo2bXZxYytwNzZvVHFqT3FWNnA3cXFPcXk2cnpxeHVyUjZ0dnE1K3J5NnYzcUNlc1Y2eUhyTHVzNzYwanJWZXRqNjNEcmZ1dU02NXJycWV1NDY4ZnIxdXZtNi9ickJ1d1c3Q2ZzT094SjdGcnNiT3grN0pEc291eTE3TWZzMnV6dDdBRHRGTzBvN1R6dFVPMWs3WG50anUyajdibnR6dTNrN2ZydEVPNG03anp1VSs1cTdvSHVtZTZ4N3NudTRlNzU3aEh2S3U5RDcxenZkZStPNzZqdndlL2I3L1h2RC9BcThFVHdYL0I2OEpid3NmRE04T2p3QlBFZzhUenhXZkYxOFpMeHIvSE04ZW54Qi9JazhrTHlYL0o5OHB6eXV2TFk4dmZ5RnZNMTgxVHpjL09UODdMejB2UHg4eEgwTWZSUjlISDBrdlN6OU5QMDlQUVY5VGIxVi9WNDlabjF1dlhjOWY3MUlQWkM5bVQyaHZhbzlzdjI3ZllQOXpMM1ZmZDQ5NXIzdmZmZzl3VDRKL2hLK0czNGtmaTArTmo0L1BnZytVUDVaL21MK2EvNTFQbjQrUno2UVBwaytvbjZyZnJSK3ZiNkcvcy8rMlQ3aVB1dCs5TDc5L3NjL0VIOFpmeUsvSy84MVB6Ni9CLzlSUDFwL1k3OXMvM1kvZjM5SXY1SS9tMytrdjYzL3R6K0FmOG0vMHovY2YrVy83di80UDhGQUNvQVR3QjBBSmtBdmdEakFBZ0JMQUZTQVhZQm13SEFBZVVCQ1FJdUFsTUNkd0tjQXNFQzVRSUtBeTREVXdOM0E1c0R2d1BqQXdjRUt3UlBCSE1FbGdTNkJOMEVBUVVsQlVnRmF3V1BCYklGMVFYNEJSb0dQUVpnQm9NR3BRYklCdW9HREFjdkIxRUhjd2VWQjdjSDJBZjZCeHNJUEFoZENINElud2pBQ09FSUFRa2lDVUlKWWdtQ0NhSUp3d25pQ1FJS0lRcEFDbUFLZndxZENyd0syZ3I1Q2hjTE5RdFRDM0VMamd1c0M4b0w1d3NFRENFTVBReGFESFlNa2d5dkRNc001d3dERFI0Tk9RMVVEVzhOaWcya0RiNE4yQTN5RFF3T0pRNC9EbGdPY1E2S0RxTU91dzdURHV3T0JBOGJEek1QU2c5aEQzZ1BqdytsRDd3UDBnL29ELzRQRkJBcEVENFFVeEJvRUh3UWtSQ2xFTGdRekJEZkVQTVFCaEVZRVNzUlBSRlBFV0VSY3hHRkVaWVJweEc0RWNnUjJSSHBFZmdSQ0JJWEVpWVNOaEpFRWxNU1lSSnZFbjBTaXhLWUVxVVNzaEsvRXNzUzF4TGpFdThTK2hJR0V4RVRHeE1tRXpBVE9oTkVFMDRUVnhOZ0Uya1RjUk42RTRJVGloT1JFNWtUb0JPbkU2MFRzeE82RThBVHhSUExFOUFUMVJQWkU5NFQ0aFBtRStvVDdSUHdFL1FUOWhQNUUvc1QvUlAvRXdFVUFSUUNGQU1VQXhRREZBUVVBeFFERkFJVUFSUUFGUDRUL0JQN0UvZ1Q5aFB6RS9BVDdSUHFFK1lUNGhQZUU5a1QxQlBRRThzVHhSTy9FN29UdEJPdEU2Y1RvQk9aRTVJVGloT0NFM29UY2hOcUUyRVRXQk5QRTBVVE94TXhFeWNUSFJNU0V3Z1QvUkx4RXVZUzJoTE9Fc0lTdGhLcEVwd1NqeEtDRW5RU1poSllFa29TT3hJdEVoNFNEeElBRXZFUjRSSFJFY0FSc0JHZkVZOFJmaEZ0RVZzUlNoRTRFU1lSRXhFQkVlNFEzQkRKRUxVUW9oQ09FSG9RWnhCU0VENFFLUkFVRVA4UDZnL1ZENzhQcVErVEQzMFBhQTlSRHpvUEl3OE1EL1VPM2c3R0RxNE9sZzUrRG1VT1RRNDBEaHdPQXc3ckRkRU51QTJmRFlVTmF3MVJEVGNOSFEwQ0RlZ016UXl5REpjTWZBeGdERVVNS1F3T0RQSUwxZ3U2QzUwTGdRdGtDMGNMS3dzT0MvRUsxQXEzQ3BrS2ZBcGVDa0FLSWdvRUN1WUp5QW1xQ1l3SmJnbFBDVEFKRVFueUNOUUl0QWlWQ0hZSVZnZzJDQllJOXdmWEI3Y0hsd2QzQjFjSE5nY1dCL1VHMVFhMUJwUUdkQVpUQmpJR0VRYndCZEFGcndXT0JXd0ZTd1VxQlFrRjZBVEdCS1VFZ3dSaUJFQUVId1Q5QTlzRHVnT1lBM1lEVkFNekF4RUQ3d0xOQXFzQ2lRSm5Ba1VDSkFJQkF0OEJ2UUdiQVhrQlZ3RTFBUk1COFFEUEFLd0FpZ0JvQUVjQUpBQUNBT0gvdi8rZC8zci9XZjgzL3hYLzgvN1IvcS8ramY1ci9rbitKLzRGL3VQOXdmMmcvWDc5WFAwNi9Sbjk5L3pXL0xUOGsveHgvRkQ4THZ3Ti9Pejd5dnVwKzRqN1ovdEcreVg3QlB2aitzTDZvZnFBK21ENlAvb2UrdjM1M2ZtOStaMzVmZmxjK1R6NUhQbjgrTno0dlBpYytIejRYZmc5K0I3NC8vZmY5OEQzb2ZlQjkyTDNSUGNsOXdiMzZQYko5cXYyamZadTlsSDJNL1lWOXZmMTJ2Vzk5Wi8xZ3ZWbDlVajFMUFVROWZQMDEvUzc5Si8wZy9SbzlFejBNZlFXOVB2ejRQUEY4NnZ6a1BOMjgxenpRdk1wOHcvejl2TGM4c1B5cXZLUzhubnlZZkpKOGpMeUd2SUQ4dXZ4MVBHKzhhZnhrZkY3OFdYeFQvRTY4U1h4RC9INzhPYncwdkM5OEtud2x2Q0M4Ry93WFBCSjhEZndKUEFTOEFEdzd1L2Q3OHp2dSsrcjc1cnZpdTk2NzJ2dlcrOU03ejN2TCs4Zzd4THZCTy8yN3VqdTIrN083c0x1dGU2cDdwM3VrdTZHN252dWNPNWw3bHZ1VWU1RzdqM3VNKzRxN2lIdUdPNFE3Z2p1QU83NDdmRHQ2ZTNpN2R2dDFlM083Y2p0d3UyODdiZnRzdTJ0N2FudHBPMmc3Wnp0bWUyVjdaTHRqKzJNN1lydGlPMkc3WVR0Z3UyQTdZRHRmKzErN1g3dGZ1MSs3WDd0ZisyQTdZRHRndTJEN1lYdGgrMko3WXZ0anUyUTdaUHRsKzJhN1o3dG91Mm03YXJ0cisyMDdibnR2dTNEN2NudHorM1Y3ZHZ0NHUzcDdmRHQ5KzMrN1FidUR1NFc3aDd1SnU0djdqanVRdTVMN2xUdVh1NW83bkx1ZmU2SDdwTHVuZTZwN3JUdXdPN003dGp1NU83eDd2M3VDdThYN3lYdk11OUE3MDd2WE85cTczanZoKytXNzZYdnRPL0U3OVR2NU8vMDd3VHdGUEFsOERid1IvQlk4R253ZS9DTjhKL3dzZkREOE5YdzZQRDc4QTd4SWZFMDhVanhYUEZ3OFlUeG1QR3Q4Y0h4MXZIcjhRRHlGZklxOGtEeVZ2SnI4b0h5bVBLdThzVHkyL0x4OGdqekgvTTM4MDd6WmZOOTg1VHpyUFBFODl6ejlmTU45Q2IwUC9SWTlISDBpdlNqOUwzMDF2VHc5QXIxSlBVKzlWajFjdldOOWFmMXd2WGM5ZmoxRXZZdTlrbjJaUFovOXB2MnQvYlM5dTcyQ3ZjbTkwTDNYL2Q3OTVmM3RQZlI5KzMzQ3ZnbitFVDRZZmgrK0p2NHVmalcrUFQ0RWZrdStVejVhdm1JK2FiNXhQbmkrUUQ2SHZvOCtsdjZlZnFZK3JiNjFQcnoraEw3TVB0UCsyMzdqUHVyKzhyNzZmc0kvQ2I4UmZ4bC9JVDhvL3pDL09IOEFmMGcvVC85WC8xKy9aMzl2UDNiL2Z2OUd2NDUvbG4rZWY2WS9yaisxLzczL2hiL05mOVUvM1Qvay8reS85TC84ZjhRQUM4QVRnQnVBSTBBckFETUFPc0FDZ0VwQVVnQmFBR0hBYVlCeFFIa0FRTUNJZ0pCQW1BQ2Z3S2RBcndDMndMNkFoZ0ROd05WQTNRRGtnT3hBODhEN1FNTEJDb0VSd1JsQklNRW9RUy9CTjBFK2dRWUJUWUZVd1Z3QlkwRnF3WElCZVVGQWdZZkJqd0dXQVoxQnBFR3JnYktCdVlHQWdjZkJ6c0hWZ2R5QjQ0SHFnZkZCK0VIL0FjWENESUlUQWhuQ0lJSW5BaTNDTkVJNndnR0NTQUpPZ2xVQ1cwSmh3bWdDYm9KMHduc0NRUUtIUW8yQ2s0S1pncCtDcFlLcmdyR0N0MEs5QW9NQ3lNTE9ndFJDMmdMZmd1VkM2c0x3UXZYQyswTEFnd1lEQzBNUXd4WURHME1nUXlXREtzTXZ3elRET2NNK3d3UERTRU5OQTFIRFZvTmJRMS9EWklOcEEyMkRjZ04yZzNyRGZ3TkRnNGZEaThPUUE1UkRtRU9jUTZCRHBBT29BNnZEcjRPelE3Y0R1c08rUTRIRHhVUEl3OHhEejRQVEE5WkQyVVBjZzkvRDRzUGx3K2pENjhQdWcvRkQ5QVAydy9tRC9BUCt3OEZFQThRR1JBaUVDd1FOUkErRUVZUVR4QlhFRjhRWnhCdkVIWVFmUkNFRUlzUWtSQ1lFSjRRcEJDcUVMQVF0UkM2RUw4UXhCREpFTTBRMGhEV0VOa1EzQkRnRU9NUTVoRG9FT3NRN1JEdkVQRVE4eEQwRVBVUTloRDNFUGdRK0JENEVQZ1ErQkQ0RVBjUTloRDFFUFFROGhEeEVPOFE3UkRxRU9nUTVoRGpFT0FRM0JEWkVOVVEwUkRORU1nUXhCQy9FTG9RdFJDdkVLb1FwQkNlRUpjUWtSQ0xFSVFRZlJCMUVHNFFaaEJmRUZjUVRoQkdFRDBRTlJBc0VDTVFHUkFRRUFZUS9BL3lEK2dQM1EvU0Q4Z1B2QSt4RDZZUG1nK1BENElQZGc5cUQxMFBVQTlERHpZUEtBOGJEdzBQQUEveER1TU8xUTdHRHJjT3FRNmFEb29PZXc1ckRsc09TdzQ3RGlzT0dnNEtEdmtONkEzWERjWU50QTJqRFpFTmZ3MXREVnNOU0EwMkRTTU5FQTM5RE9vTTFnekRESzhNbkF5SURITU1Yd3hMRERjTUlnd05EUGdMNHd2T0M3a0xvd3VOQzNjTFlRdE1DelVMSHdzSkMvTUszQXJGQ3E0S2x3cUFDbWdLVVFvNUNpRUtDZ3J5Q2RvSndnbXFDWklKZVFsZ0NVZ0pMd2tXQ2Y0STVBakxDTE1JbVFpQUNHWUlUUWd6Q0JrSS93Zm1COHNIc1FlWEIzd0hZZ2RIQnkwSEV3ZjRCdDBHd2dhbkJvd0djUVpXQmpzR0lBWUZCdW9GemdXekJaY0ZmQVZnQlVRRktBVU1CZkFFMUFTNEJKd0VnQVJrQkVjRUt3UVBCUE1EMWdPNkE1NERnUU5sQTBnRExBTVBBL0lDMWdLNUFwMENnQUpqQWtjQ0tnSU5BdkFCMUFHMkFab0JmUUZnQVVNQkpnRUpBZXdBMEFDekFKWUFlUUJkQUVBQUl3QUdBT3IvemYreC81VC9kLzlhL3ozL0lmOEUvK2YreS82dS9wSCtkZjVZL2p6K0gvNEQvdWI5eXYydC9aSDlkUDFZL1R6OUlQMEUvZWY4eS95di9KUDhkL3hiL0VEOEpQd0kvT3o3MFB1MSs1bjdmdnRpKzBmN0svc1ErL1g2MnZxLytxVDZpZnB1K2xQNk9Qb2QrZ1A2NlBuTytiUDVtZmwvK1dUNVN2a3crUmI1L1BqaitNbjRyL2lXK0gzNFkvaEsrREg0R1BqLzkrYjN6ZmUwOTV6M2cvZHI5MVAzTy9jajl3djM4L2JjOXNUMnJmYVc5bjcyWi9aUjlqcjJJL1lOOXZiMTRQWEs5YlQxbnZXSTlYUDFYZlZJOVRQMUh2VUo5ZlQwNFBUTDlMZjBvL1NQOUh6MGFQUlY5RUgwTHZRYjlBbjA5dlBrODlIenYvT3Q4NXp6aXZONTgyanpWL05HOHpYekpQTVU4d1R6OVBMazh0VHl4ZksyOHFmeW1QS0o4bnZ5YmZKZjhsSHlRL0kxOGlqeUcvSU84Z0h5OWZIbzhkengwUEhFOGJueHJmR2k4WmZ4alBHQzhYZnhiZkZqOFZyeFVQRkg4VDN4TlBFcjhTUHhHdkVTOFFyeEF2SDc4UFB3N1BEbThOL3cyUERSOE12d3hmQy84THJ3dGZDdjhLcndwZkNoOEp6d21QQ1U4SkR3alBDSjhJYndnL0NBOEgzd2V2QjQ4SGJ3ZGZCejhISHdjUEJ2OEc3d2JmQnM4R3p3YlBCczhHendiZkJ0OEc3d2IvQnc4SEh3Yy9CMThIZndlZkI3OEg3d2dQQ0Q4SWJ3aXZDTjhKSHdsZkNaOEozd29mQ204S3J3c1BDMThMcnd3UERHOE16dzB2RFk4Tjd3NWZEczhQUHcrL0FDOFFyeEVmRVo4U0h4S2ZFeThUcnhRL0ZNOFZYeFh2Rm84WEx4ZS9HRzhaRHhtdkdrOGEveHV2SEY4ZER4M1BIbzhmVHgvL0VNOGhqeUpQSXg4ajd5U3ZKWThtWHljdktBOG83eW0vS3E4cmp5eHZMVjh1UHk4dklCOHhEeklQTXY4ei96VC9OZTgyN3pmdk9QODZEenNQUEI4OUx6NC9QMDh3YjBGL1FwOUR2MFRmUmY5SEgwZy9TVjlLajB1L1RPOU9IMDlQUUg5UnYxTHZWQzlWYjFhZlY5OVpIMXB2VzY5Yy8xNVBYNTlRNzJJdlkzOWt6MllmWjM5bzMyb3ZhNDlzNzI1UGI2OWhEM0p2Yzk5MVAzYXZlQTk1ZjNydmZGOTl6MzgvY0srQ0g0T2ZoUStHajRnUGlYK0svNHgvamYrUGY0RC9rbitVRDVXUGx4K1luNW92bTYrZFA1N1BrRitoNzZOL3BRK21uNmd2cWIrclQ2emZybitnRDdHdnN6KzAzN1ovdUErNXI3dFB2TysrajdBdndjL0RiOFVQeHEvSVQ4bnZ5NC9OTDg3ZndIL1NIOVBQMVcvWEQ5aS8ybS9jRDkyLzMxL1JEK0t2NUYvbC8rZXY2VS9xNyt5UDdqL3YzK0dQOHovMDcvYVArRC81My91UC9TLyszL0JnQWhBRHdBVmdCeEFJc0FwZ0RBQU5zQTlRQVBBU2tCUXdGZUFYZ0JrZ0dzQWNjQjRRSDdBUlVDTHdKSkFtTUNmUUtYQXJFQ3l3TGxBdjRDR0FNeUEwc0RaUU4rQTVnRHNRUExBK1FEL1FNV0JDOEVTQVJpQkhvRWt3U3NCTVVFM2dUMkJBOEZKd1ZBQlZnRmNBV0lCYUFGdVFYUUJlZ0ZBQVlZQmk4R1J3WmVCblVHalFha0Jyc0cwZ2JwQmdBSEZnY3RCMFFIV2dkd0I0Y0huUWV6QjhrSDN3ZjBCd29JSHdnMUNFb0lYd2gwQ0lrSW5naXpDTWNJM0Fqd0NBVUpHUWt0Q1VFSlZRbHBDWHdKandtakNiWUp5UW5jQ2U4SkFRb1VDaVlLT0FwS0Nsd0tiZ3FBQ3BFS293cTBDc1VLMWdyb0N2Z0tDUXNaQ3lvTE9ndEtDMW9MYWd0NUM0a0xtQXVuQzdZTHhRdlVDK01MOFF2L0N3NE1IQXdwRERjTVJBeFNERjhNYlF4NURJWU1rZ3lmREtzTXR3ekRETThNMmd6bURQRU0vQXdIRFJJTkhRMG5EVEVOUEExR0RWQU5XUTFqRFd3TmRRMStEWWNOa0EyWURhQU5xQTJ3RGJnTnZ3M0hEYzROMVEzY0RlTU42UTN3RGZZTi9BMENEZ2dPRFE0VERoZ09IUTRpRGljT0t3NHZEak1PTnc0N0RqOE9RZzVHRGtnT1N3NU9EbEFPVXc1VkRsY09XUTVhRGx3T1hRNWVEbDhPWUE1aERtRU9ZUTVpRG1FT1lRNWhEbUFPWHc1ZURsME9XdzVhRGxnT1ZnNVZEbElPVUE1TkRrc09TQTVGRGtFT1BnNDdEamNPTXc0dkRpb09KZzRoRGh3T0Z3NFREZzBPQ0E0Q0R2d045ZzN3RGVrTjR3M2NEZFVOemczSERjQU51UTJ4RGFrTm9RMllEWkFOaHcxK0RYWU5iUTFrRFZvTlVRMUhEVDBOTXcwcERSOE5GUTBLRGY4TTlBenBETjRNMHd6SERMd01zQXlrREpnTWpBeUFESE1NWmd4WkRFd01Qd3d5RENVTUZ3d0pEUHNMN1F2ZkM5RUx3d3UwQzZVTGxndUhDM2dMYVF0YUMwb0xPd3NyQ3hzTEN3djdDdXNLMmdyS0Nya0txQXFYQ29ZS2RBcGpDbElLUUFvdUNod0tDd3I1Q2VZSjFBbkNDYThKblFtS0NYY0paQWxSQ1Q0Skt3a1lDUVVKOFFqZENNb0l0UWloQ0kwSWVRaGxDRkVJUEFnb0NCTUkvZ2ZxQjlVSHdBZXJCNVlIZ0FkckIxVUhRQWNxQnhVSC93YnFCdFFHdmdhb0JwSUdmQVptQmxBR09RWWpCZ3dHOWdYZkJjZ0ZzUVdhQllRRmJRVldCVDhGSndVUUJma0U0Z1RMQkxNRW5BU0VCRzBFVlFROUJDWUVEZ1QzQTk4RHh3T3dBNWdEZ0FOb0ExQURPQU1nQXdjRDd3TFhBcjhDcHdLT0FuWUNYZ0pHQWkwQ0ZRTDlBZVFCekFHekFac0Jnd0ZxQVZJQk9nRWlBUWtCOFFEWUFNQUFxQUNQQUhjQVhnQkdBQzBBRlFEKy8rWC96ZisxLzV6L2hQOXMvMVAvTy84ai93ci84djdhL3NMK3FmNlIvbm4rWWY1Si9qSCtHZjRCL3VuOTBmMjUvYUw5aXYxeS9WcjlRdjByL1JQOSsvemsvTXo4dGZ5ZS9JYjhiL3hYL0VEOEtmd1MvUHY3NVB2Tis3YjduL3VKKzNMN1hQdEYreS83R1BzQysrdjYxZnEvK3FuNmsvcDkrbWY2VWZvNytpWDZFUHI2K2VYNXovbTYrYVg1ai9sNitXWDVVZms4K1NmNUV2bisrT3I0MXZqQitLMzRtZmlGK0hINFh2aEsrRGI0SXZnUCtQejM2ZmZXOThQM3NQZWQ5NHYzZVBkbTkxVDNRdmN3OXg3M0RQZjY5dW4yMS9iRzlyVDJvL2FTOW9IMmNQWmc5ay8yUC9ZdjloLzJEL2IvOWZEMTRQWFI5Y0gxc3ZXajlaWDFodlY0OVduMVcvVk45VC8xTWZVajlSYjFDZlg3OU83MDRmVFY5TWowdS9TdjlLUDBsL1NMOUgvMGRQUm85RjMwVXZSSDlEMzBNdlFvOUIzMEUvUUo5UC96OXZQczgrUHoydlBRODhqenYvTzM4Njd6cHZPZTg1YnpqL09IODREemVQTng4MnJ6WlBOZDgxZnpVZk5LODBYelAvTTU4elR6THZNcDh5VHpJUE1iOHhmekV2TU84d3J6QnZNRDgvL3kvUEw1OHZieTgvTHg4dTd5N1BMcDh1Znk1ZkxrOHVMeTRmTGc4dC95M3ZMZTh0M3kzZkxjOHR6eTNQTGQ4dDN5M3ZMZTh0L3k0UExpOHVQeTVmTG44dWp5NnZMdDh1L3k4dkwwOHZmeSt2TCs4Z0h6QlBNSTh3enpFUE1VOHhuekhmTWg4eWJ6Sy9Ndzh6WHpPL05CODBielRQTlM4MWp6WC9ObDgyenpjL042ODRIemlQT1E4NWZ6bi9Pbjg2L3p0L08vODhqejBQUFo4K0x6Ni9QMDgvM3pCL1FROUJyMEpQUXU5RGowUXZSTjlGajBZdlJ0OUhqMGcvU1A5SnIwcHZTeTlMNzB5ZlRXOU9MMDcvVDc5QWoxRlBVaDlTNzFPL1ZKOVZiMVkvVng5WC8xamZXYjlhbjF0L1hHOWRUMTQvWHk5UUgyRVBZZjlpNzJQdlpOOWwzMmJmWjk5bzMybmZhdDlyMzJ6ZmJlOXU3Mi8vWVE5eUgzTXZkRDkxVDNaZmQzOTRuM212ZXM5NzczMFBmaTkvVDNCdmdZK0NyNFBmaFArR0w0ZFBpSCtKcjRyZmpBK05QNDUvajYrQTM1SWZrMStVbjVYUGx3K1lUNW1QbXMrY0Q1MVBubytmejVFUG9sK2puNlR2cGkrbmY2alBxZytyWDZ5dnJmK3ZUNkNmc2YrelQ3U2Z0ZSszUDdpZnVlKzdUN3lmdmYrL1Q3Q3Z3Zy9EYjhUUHhoL0hmOGpmeWovTG44ei96bC9QdjhFZjBuL1QzOVUvMXAvWUQ5bHYycy9jTDkyZjN2L1FYK0hQNHkva2orWC81Mi9veitvLzY1L3MvKzV2NzgvaEwvS2Y4Ly8xYi9iUCtELzVuL3NQL0gvOTMvOC84SkFCOEFOUUJNQUdJQWVRQ1BBS1VBdkFEU0FPZ0Evd0FWQVNzQlFnRllBVzRCaEFHYUFiQUJ4Z0hjQWZJQkNBSWVBalFDU2dKZ0FuWUNqQUtoQXJjQ3pRTGlBdmdDRFFNakF6Z0RUZ05qQTNrRGpnT2pBN2dEemdQaUEvY0REQVFoQkRZRVN3UmZCSFFFaVFTZEJMSUV4Z1RiQk84RUF3VVhCU3NGUHdWVEJXY0ZlZ1dPQmFJRnRRWEpCZHdGN3dVQ0JoWUdLUVk4Qms0R1lRWjBCb2NHbVFhc0JyNEcwUWJqQnZVR0J3Y1pCeW9IUEFkT0IxOEhjUWVDQjVNSHBRZTJCOGNIMXdmb0Iva0hDZ2dhQ0NvSU93aExDRnNJYWdoNkNJb0ltZ2lwQ0xnSXlBalhDT1lJOVFnRUNSSUpJUWt2Q1Q0SlRBbGFDV2dKZFFtRENaRUpuZ21yQ2JnSnhnblRDZUFKN0FuNUNRWUtFZ29lQ2lvS05ncENDazBLV1Fwa0NuQUtld3FHQ3BFS25BcW1DckVLdXdyR0NzOEsyUXJqQ3UwSzlnb0FDd2tMRWdzYkN5UUxMUXMyQ3o0TFJ3dFBDMWNMWHd0bkMyNExkZ3Q5QzRRTGl3dVNDNWtMb0F1bUM2d0xzZ3U0Qzc0THhBdktDODhMMUF2WkM5OEw0d3ZvQyswTDhRdjFDL2tML1FzQURBUU1Cd3dMREE0TUVRd1VEQmNNR1F3Y0RCNE1JQXdpRENRTUpnd25EQ2tNS2d3ckRDd01MUXd1REM0TUx3d3ZEQzhNTHd3dkRDNE1MZ3d0REN3TUt3d3FEQ2dNSnd3bERDUU1JZ3dnREI0TUd3d1pEQllNRXd3UURBME1DZ3dIREFNTUFBejhDL2dMOUF2d0Mrc0w1d3ZpQzkwTDJBdlRDODRMeVF2REM3NEx1QXV5QzZ3THBRdWZDNWtMa2d1TEM0VUxmZ3QyQzI4TFp3dGdDMWdMVUF0SUMwQUxPQXN2Q3ljTEhnc1dDdzBMQkF2NkN2RUs1d3JlQ3RRS3lnckFDcllLckFxaENwY0tqQXFCQ25ZS2F3cGdDbFVLU2dvK0NqTUtKd29iQ2c4S0F3cjJDZW9KM2duUkNjVUp1QW1yQ1o0SmtRbUVDWFlKYVFsY0NVNEpRQWt5Q1NRSkZna0lDZmtJNndqY0NNMEl2d2l3Q0tFSWtnaURDSFFJWlFoVkNFWUlOZ2dtQ0JZSUJnajNCK2NIMWdmR0I3WUhwUWVWQjRRSGN3ZGlCMUVIUUFjdkJ4NEhEUWY4QnVvRzJRYkhCcllHcEFhU0JvQUdiZ1pjQmtvR09BWW1CaFFHQVFidkJkMEZ5Z1czQmFVRmtnV0FCVzBGV2dWSEJUUUZJUVVPQmZzRTV3VFVCTUVFcmdTYUJJY0Vjd1JmQkV3RU9BUWtCQkVFL1FQcEE5VUR3UU90QTVrRGhRTnhBMTBEU1FNMUF5RUREUVA0QXVRQzBBSzdBcWNDa3dKK0Ftb0NWUUpCQWkwQ0dBSURBdThCMndIR0FiRUJuUUdJQVhRQlh3RkxBVFlCSVFFTkFmZ0E1QURQQUxvQXBRQ1JBSHdBWndCU0FENEFLUUFVQUFBQTdQL1gvOFAvcnYrWi80WC9jUDljLzBmL00vOGUvd3IvOXY3aC9zMyt1ZjZrL3BEK2ZQNW4vbFArUC80ci9oZitBdjd1L2RyOXh2MnkvWjc5aXYxMi9XTDlUdjA2L1NiOUUvMy8vT3Y4MS96RS9MRDhuZnlLL0hiOFkveFEvRHo4S2Z3Vy9BUDg4UHZkKzh2N3VQdWwrNUw3Z1B0dCsxdjdTUHMyK3lUN0Vmdi8rdTM2Mi9ySityZjZwZnFVK29MNmNQcGYrazM2UFBvcStobjZDUHIyK2VYNTFQbkQrYkw1b3ZtUitZSDVjUGxnK1ZENVAva3YrUi81RVBrQStmRDQ0UGpSK01INHN2aWorSlQ0aGZoMitHZjRXUGhKK0R2NExQZ2UrQkQ0QXZqMDkrYjMyUGZLOTczM3IvZWk5NVgzaC9kNjkyMzNZZmRVOTBmM08vY3Y5eUwzRnZjSzkvNzI4L2JuOXR6MjBQYkY5cnIyci9hazlwbjJqL2FFOW5uMmIvWmw5bHYyVWZaSDlqNzJOUFlyOWlIMkdQWVA5Z2YyL3ZYMTllMzE1ZlhjOWRYMXpmWEY5YjMxdHZXdTlhZjFvUFdaOVpMMWkvV0Y5WDcxZVBWeTlXejFadlZnOVZyMVZQVlA5VW4xUlBVLzlUcjFOZlV4OVMzMUtQVWs5U0QxSFBVWTlSWDFFZlVPOVF2MUNQVUY5UUwxLy9UOTlQcjArUFQyOVBUMDh2VHg5Ty8wN3ZUdDlPdjA2dlRwOU9uMDZQVG85T2YwNS9UbjlPZjA2UFRvOU9uMDZmVHE5T3YwN1BUdDlPNzA4UFR5OVBQMDlmVDM5UG4wKy9UKzlBRDFBL1VHOVFuMURQVVA5UlAxRnZVYTlSNzFJdlVtOVNyMUx2VXo5VGYxUFBWQjlVYjFTL1ZROVZYMVcvVmc5V2IxYlBWeTlYajFmdldGOVl2MWt2V1o5YUQxcC9XdTliWDF2ZlhFOWN6MTAvWGI5ZVAxN1BYMDlmejFCZllPOWhiMkgvWXA5akwyTy9aRTlrNzJWL1poOW12MmRmWi85b24yay9hZTlxajJzdmE5OXNqMjAvYmQ5dW4yOVBiLzlncjNGdmNpOXk3M092ZEc5MUwzWHZkcTkzZjNnL2VROTUzM3FmZTI5OFAzMFBmZTkrdjMrUGNHK0JQNElmZ3YrRDM0Uy9oWitHZjRkZmlEK0pMNG9QaXYrTDc0elBqYitPcjQrZmdJK1JmNUp2azIrVVg1VmZsaytYVDVnL21UK2FQNXMvbkQrZFA1NC9ueitRVDZGUG9rK2pYNlJmcFcrbWY2ZC9xSStwbjZxdnE3K3N6NjNmcnUrdi82RWZzaSt6VDdSZnRXKzJqN2VmdUwrNTM3cnZ2QSs5TDc1UHYyK3dqOEd2d3MvRDc4VVB4aS9IVDhoL3laL0t2OHZ2elEvT1A4OWZ3SS9ScjlMZjAvL1ZMOVpQMTMvWXI5bmYydi9jTDkxZjNvL2ZyOURmNGcvalArUnY1Wi9tditmLzZTL3FYK3VQN0wvdDcrOGY0RS94Zi9LZjg4LzAvL1l2OTEvNGovbS8rdS84SC8xUC9uLy9yL0RBQWZBRElBUlFCWUFHc0FmZ0NSQUtRQXR3REtBTjBBOEFBREFSWUJLUUU4QVU0QllRRnpBWVlCbVFHckFiNEIwUUhqQWZZQkNBSWFBaTBDUHdKUkFtUUNkZ0tJQXBvQ3JBSy9BdEVDNHdMMUFnY0RHUU1yQXowRFRnTmdBM0lEZ3dPVkE2Y0R1QVBKQTlzRDdBUCtBdzhFSUFReEJFSUVVd1JrQkhVRWhnU1hCS2NFdUFUSkJOa0U2UVQ2QkFvRkdnVXJCVHNGU3dWYkJXc0Zld1dMQlpzRnFnVzZCY2tGMlFYb0JmY0ZCZ1lWQmlRR013WkNCbEVHWHdadUJud0dpd2FaQnFjR3RnYkVCdElHNEFidEJ2c0dDUWNXQnlNSE1RYytCMHNIV0FkbEIzSUhmZ2VMQjVnSHBBZXdCNzBIeVFmVkIrRUg3UWY1QndVSUVBZ2NDQ2NJTWdnOUNFZ0lWQWhlQ0drSWRBaCtDSWtJa3dpZENLY0lzZ2k4Q01VSXp3allDT0lJNndqMENQMElCd2tQQ1JnSklRa3BDVElKT2dsQ0NVc0pVZ2xhQ1dJSmFnbHhDWGtKZ0FtSENZNEpsUW1jQ2FNSnFRbXdDYllKdkFuQ0NjZ0p6Z25UQ2RrSjNnbmpDZWtKN1FueUNmY0ovQWtBQ2dVS0NRb05DaEVLRlFvWkNoMEtJQW9rQ2ljS0tnb3RDakFLTXdvMkNqZ0tPd285Q2o4S1FRcERDa1VLUndwSUNrb0tTd3BNQ2swS1RncFBDbEFLVUFwUkNsRUtVUXBSQ2xFS1VRcFFDbEFLVHdwUENrNEtUUXBNQ2tvS1NRcEhDa1lLUkFwQ0NrQUtQZ284Q2pvS053bzFDaklLTHdvc0Npa0tKZ29pQ2g4S0d3b1hDaFFLRUFvTUNnY0tBd3IvQ2ZvSjlRbnhDZXdKNXduaENkd0oxd25SQ2N3SnhnbkFDYm9KdEFtdUNhY0pvUW1hQ1pRSmpRbUdDWDhKZUFsd0NXa0pZZ2xhQ1ZNSlN3bERDVHNKTXdrcUNTSUpHUWtSQ1FnSi93ajJDTzBJNUFqYkNOSUl5QWkrQ0xVSXF3aWhDSmNJalFpRENIa0lid2hsQ0ZvSVR3aEZDRG9JTHdna0NCa0lEZ2dDQ1BjSDZ3ZmdCOVFIeUFlOEI3QUhwQWVZQjR3SGZ3ZHpCMllIV2dkTkIwRUhOQWNuQnhvSERRY0FCL0lHNVFiWUJzb0d2UWF2QnFJR2xBYUdCbmdHYWdaY0JrMEdQd1l4QmlJR0V3WUZCdmNGNkFYWkJjb0Z2QVd0Qlo0Rmp3V0FCWEVGWWdWU0JVTUZOQVVrQlJVRkJRWDFCT1lFMWdUR0JMY0Vwd1NYQklZRWRnUm1CRllFUmdRMkJDWUVGUVFGQlBVRDVBUFVBOE1Ec2dPaUE1RURnUU53QTE4RFRnTStBeTBESEFNTEEvb0M2UUxZQXNjQ3RnS2tBcE1DZ2dKeEFtQUNUd0k5QWl3Q0d3SUtBdmdCNXdIV0FjVUJzd0dpQVpBQmZ3RnRBVndCU3dFNUFTY0JGZ0VFQWZNQTRnRFFBTDhBclFDY0FJc0FlUUJuQUZZQVJRQXpBQ0lBRUFBQUFPNy8zZi9MLzdyL3FQK1gvNGIvZFA5ai8xTC9RUDh2L3gzL0RQLzcvdXIrMmY3SS9yYitwZjZVL29QK2NmNWcvay8rUHY0dC9oeitDLzc3L2VyOTJmM0kvYmY5cC8yVy9ZWDlkUDFrL1ZQOVEvMHkvU0w5RWYwQi9mSDg0ZnpRL01EOHNQeWcvSkQ4Z1B4dy9HRDhVZnhCL0RIOElmd1IvQUw4OHZ2ais5VDd4UHUxKzZiN2x2dUgrM2o3YXZ0YSswejdQZnN1K3gvN0Vmc0MrL1Q2NWZyWCtzbjZ1dnFzK3A3NmtQcUMrblQ2Wi9wWitrejZQdm93K2lQNkZmb0krdnY1N3ZuaCtkVDV4L203K2E3NW9mbVYrWW41ZmZsdytXVDVXUGxNK1VENU5ma3ArUjM1RWZrRytmdjQ3L2prK05uNHp2akQrTGo0cnZpaitKbjRqdmlFK0hyNGIvaG0rRno0VXZoSStELzROZmdzK0NQNEdmZ1ErQWY0L3ZmMjkrMzM1UGZjOTlQM3kvZkQ5N3Yzcy9lcjk2UDNuUGVVOTQzM2hmZCs5M2YzY1BkcDkyTDNYUGRWOTAvM1NmZEQ5ejMzTi9jeDl5djNKZmNnOXhyM0ZmY1E5d3YzQnZjQjkvMzIrUGIwOXUvMjYvYm45dVAyMy9iYjl0ZjIwL2JROXMzMnlmYkg5c1Ayd2ZhKzlydjJ1ZmEyOXJUMnN2YXc5cTcyclBhcjlxbjJwL2FtOXFYMm8vYWo5cUwyb2ZhZzlxRDJuL2FmOXAvMm4vYWY5cC8ybi9hZzlxRDJvZmFpOXFQMnBQYWw5cWIycC9hcDlxcjJyUGF1OXJEMnN2YTA5cmIydVBhNzlyMzJ3UGJEOXNiMnlmYk05cy8yMC9iVzl0cjIzZmJpOXViMjZ2YnU5dlAyOS9iNzlnRDNCZmNLOXcvM0ZQY1o5eDczSS9jbzl5NzNOUGM1OXovM1JmZEw5MUgzV1BkZTkyWDNhL2R5OTNuM2dQZUg5NDczbHZlZDk2VDNyUGUwOTd2M3cvZkw5OVAzMi9mazkrejM5UGY5OXdiNER2Z1grQ0Q0S2ZneStEdjRSZmhPK0ZqNFlmaHIrSFg0Zi9pSitKUDRuZmluK0xINHUvakcrTkQ0Mi9qbStQRDQvUGdIK1JMNUhma3ArVFQ1UC9sTCtWYjVZdmx1K1hyNWhmbVIrWjM1cWZtMStjSDV6Zm5hK2ViNTgvbi8rUXo2R2ZvbStqUDZQL3BNK2xuNlovcDArb0g2ai9xYytxbjZ0L3JFK3RMNjRQcnUrdnY2Q2ZzWCt5WDdNL3RCKzAvN1hmdHIrM3I3aVB1Vys2WDdzL3ZDKzlINzMvdnUrLzM3Qy93YS9DbjhPUHhIL0ZiOFpmeDAvSVA4ay95aS9MSDh3UHpRL04vODd2eisvQTM5SGYwcy9UejlTLzFiL1dyOWV2MksvWm45cWYyNS9jbjkyUDNvL2ZqOUNQNFkvaWorT1A1SC9sZithUDUzL29mK2wvNm4vcmYreC83WC91Zis5LzRJL3hqL0tQODQvMGovV1A5by8zai9pUCtZLzZqL3VQL0kvOW4vNmYvNS93Z0FHQUFvQURnQVNBQllBR2dBZUFDSUFKZ0FxQUM0QU1nQTJBRG9BUGdBQ0FFWUFTY0JOd0ZIQVZjQlp3RjNBWVlCbGdHbUFiWUJ4UUhWQWVRQjlBRURBaElDSWdJeEFrRUNVQUpmQW04Q2ZnS05BcHdDcXdLN0Fzb0MyUUxvQXZZQ0JRTVVBeU1ETWdOQkEwOERYZ050QTNzRGlnT1lBNllEdFFQREE5RUQzd1B1QS93RENnUVlCQ1lFTkFSQ0JFOEVYUVJyQkhnRWhnU1RCS0VFcmdTN0JNZ0UxZ1RqQlBBRS9RUUtCUmNGSkFVeEJUMEZTZ1ZXQldJRmJnVjdCWWNGa3dXZkJhc0Z0d1hEQmM4RjJnWG1CZklGL1FVSUJoUUdId1lxQmpVR1FRWk1CbFlHWVFac0JuWUdnUWFMQnBVR29BYXFCclFHdmdiSUJ0SUczQWJsQnU4RytBWUNCd3NIRkFjZEJ5WUhMd2M0QjBFSFNRZFNCMW9IWXdkckIzTUhld2VEQjRzSGt3ZWJCNklIcWdleEI3a0h3QWZIQjg0SDFRZmNCK01INlFmd0IvWUgvUWNEQ0FrSUR3Z1ZDQnNJSVFnbUNDd0lNUWczQ0R3SVFRaEdDRXNJVUFoVkNGa0lYZ2hpQ0djSWF3aHZDSE1JZHdoN0NINElnZ2lHQ0lrSWpBaVBDSk1JbFFpWUNKc0luZ2lnQ0tJSXBRaW5DS2tJcXdpdENLOElzQWl5Q0xNSXRRaTJDTGNJdUFpNUNMb0l1d2k3Q0x3SXZBaThDTHdJdlFpOENMd0l2QWk3Q0xzSXVnaTZDTGtJdUFpM0NMWUl0UWl6Q0xJSXNBaXZDSzBJcXdpcENLY0lwUWlqQ0tBSW5naWJDSmtJbGdpVENKQUlqUWlLQ0lZSWd3aC9DSHNJZUFoMENIQUliQWhvQ0dRSVlBaGJDRmNJVWdoTkNFZ0lRd2crQ0RrSU13Z3VDQ2tJSXdnZENCZ0lFZ2dNQ0FZSUFBajZCL01IN1FmbkIrQUgyUWZTQjhzSHhBZTlCN1lIcndlb0I2RUhtUWVSQjRvSGdnZDZCM0lIYWdkaUIxb0hVZ2RKQjBFSE9BY3dCeWNISGdjVkJ3d0hBd2Y2QnZBRzV3YmVCdFFHeXdiQkJyY0dyZ2FrQnBvR2tBYUdCbndHY1FabkJsd0dVZ1pIQmowR01nWW5CaDBHRVFZSEJ2d0Y4QVhsQmRvRnp3WERCYmdGckFXaEJaVUZpUVYrQlhJRlpnVmFCVTRGUWdVMkJTa0ZIUVVSQlFRRitBVHNCTjhFMGdUR0JMa0VyQVNmQkpNRWhnUjVCR3dFWHdSU0JFUUVOd1FxQkJ3RUR3UUNCUFFENXdQWkE4d0R2Z094QTZNRGxRT0hBM2tEYkFOZUExQURRZ00wQXlZREdBTUtBL3dDN2dMZ0F0RUN3d0sxQXFjQ21BS0tBbndDYlFKZkFsQUNRZ0l6QWlVQ0ZnSUlBdmtCNndIY0FjMEJ2d0d3QWFFQmt3R0VBWFVCWndGWUFVa0JPZ0VzQVIwQkR3RUFBZkVBNGdEVEFNVUF0Z0NuQUpnQWlRQjZBR3dBWFFCT0FEOEFNUUFpQUJNQUJBRDIvK2YvMmYvSy83di9yZitlLzQvL2dQOXkvMlAvVlA5Ry96Zi9LUDhhL3d2Ly9mN3UvdUQrMGY3RC9yVCtwdjZYL29uK2V2NXMvbDcrVVA1Qi9qUCtKZjRYL2duKyt2M3MvZDc5MFAzQy9iVDlwdjJZL1l2OWZmMXYvV0g5VS8xRy9UajlLdjBkL1EvOUF2MzAvT2Y4MnZ6TS9MLzhzdnlsL0pqOGl2eDkvSEQ4WlB4WC9FcjhQZnd3L0NUOEYvd0svUDc3OGZ2bCs5bjd6UHZBKzdUN3FQdWIrNC83aFB0NCsyejdZUHRVKzBuN1Bmc3kreWI3Ry9zUCt3VDcrZnJ1K3VQNjJQck4rc0w2dC9xdCtxTDZsL3FOK29MNmVQcHUrbVA2V2ZwUCtrWDZPL294K2lqNkh2b1UrZ3Y2QXZyNCtlLzU1dm5kK2RQNXl2bkMrYm41c1BtbitaLzVsdm1PK1lYNWZmbDErVzM1WmZsZCtWYjVUdmxHK1QvNU4va3crU241SWZrYStSUDVEUGtHK2YvNCtQankrT3Y0NWZqZStOajQwdmpNK01iNHdQaTYrTFg0ci9pcStLVDRuL2lhK0pYNGtQaUwrSWI0Z3ZoOStIbjRkUGh3K0d2NFovaGorRi80WFBoWStGVDRVZmhOK0VyNFIvaEQrRUQ0UGZnNitEajROZmd5K0RENEx2Z3IrQ240Si9nbCtDUDRJZmdnK0I3NEhmZ2IrQnI0R2ZnWStCZjRGdmdWK0JUNEZQZ1QrQlA0RXZnUytCTDRFdmdTK0JQNEUvZ1QrQlA0RlBnVitCYjRGdmdZK0JqNEd2Z2IrQno0SHZnZitDSDRJL2drK0NiNEtmZ3IrQzM0TC9neStEVDROL2c2K0R6NFAvaEMrRVg0U2ZoTStFLzRVL2hXK0ZyNFh2aGkrR1g0YWZodStITDRkdmg3K0gvNGhQaUkrSTM0a3ZpWCtKejRvZmltK0t6NHNmaTMrTHo0d3ZqSCtNMzQwL2paK04vNDV2anMrUEw0K1BqLytBYjVEUGtUK1JyNUlma28rUy81TnZrOStVWDVUUGxVK1Z2NVkvbHIrWFA1ZXZtQytZdjVrL21iK2FQNXJQbTArYjM1eHZuUCtkZjU0UG5wK2ZMNSsva0UrZzM2RnZvZytpbjZNL284K2tiNlQvcForbVA2YlBwMitvRDZpL3FWK3AvNnFmcXorcjc2eVByVCt0MzY2UHJ5K3YzNkNQc1QreDc3S2ZzMCt6LzdTdnRWKzJEN2JQdDMrNEw3anZ1YSs2WDdzZnU5KzhqNzFQdmcrK3o3OS9zRC9BLzhHL3duL0RQOFFQeE0vRmo4WmZ4eC9IMzhpdnlXL0tQOHIveTgvTWo4MWZ6aS9PNzgrL3dJL1JYOUlmMHUvVHY5U1AxVi9XTDliLzE4L1luOWx2MmovYkQ5dnYzTC9kajk1ZjN6L1FEK0RmNGIvaWorTmY1RC9sRCtYZjVyL25qK2h2NlQvcUgrcnY2OC9zbisxLzdrL3ZMKy8vNE4veHYvS1A4Mi8wUC9VZjlmLzJ6L2V2K0kvNVgvby8rdy83Ny96UC9hLytmLzlmOEJBQThBSEFBcUFEY0FSUUJUQUdBQWJnQjdBSWtBbGdDakFMRUF2Z0RNQU5rQTV3RDBBQUlCRHdFY0FTb0JOd0ZGQVZJQlh3RnNBWGtCaHdHVUFhRUJyZ0c4QWNrQjFnSGpBZkFCL1FFS0FoY0NKQUl4QWowQ1NnSlhBbU1DY0FKOUFva0NsZ0tpQXE4Q3V3TElBdFFDNFFMdEF2a0NCZ01TQXg0REtnTTJBMElEVGdOYUEyWURjZ04rQTRrRGxRT2hBNndEdUFQRUE4OEQyd1BtQS9FRC9RTUlCQk1FSGdRcEJEUUVQd1JLQkZVRVlBUnJCSFVFZ0FTS0JKVUVud1NxQkxRRXZnVElCTklFM0FUbUJQQUUrZ1FFQlE0RkdBVWhCU3NGTlFVK0JVY0ZVQVZhQldNRmJBVjFCWDRGaHdXUEJaZ0ZvQVdwQmJJRnVnWENCY3NGMHdYYkJlTUY2d1h6QmZzRkF3WUtCaElHR1FZaEJpZ0dMd1kzQmo0R1JRWk1CbE1HV2daaEJtY0diZ1owQm5zR2dRYUhCbzRHa3dhWkJwOEdwUWFyQnJFR3RnYTdCc0VHeGdiTUJ0RUcxZ2JiQnVBRzVRYnBCdTRHOHdiM0J2c0dBQWNFQndnSERBY1FCeFFIR0FjYkJ4OEhJd2NtQnlrSExRY3dCek1ITmdjNEJ6c0hQZ2RCQjBNSFJnZElCMHNIVFFkUEIxRUhVd2RVQjFZSFdBZFpCMXNIWEFkZEIxOEhZQWRoQjJJSFlnZGpCMlFIWkFkbEIyVUhaUWRtQjJZSFpnZGxCMlVIWlFkbEIyUUhaQWRqQjJNSFlnZGhCMkFIWHdkZUIxd0hXd2RhQjFnSFZnZFZCMU1IVVFkUEIwMEhTd2RJQjBZSFJBZEJCejhIUEFjNUJ6WUhNd2N3QnkwSEtnY25CeU1ISUFjY0J4a0hGUWNSQncwSENRY0ZCd0VIL1FiNEJ2UUc4QWJyQnVZRzRnYmRCdGdHMHdiT0Jza0d4QWErQnJrR3RBYXVCcWdHb3dhZEJwY0drUWFMQm9VR2Z3WjVCbklHYkFabEJsOEdXQVpTQmtzR1JBWTlCallHTHdZb0JpRUdHUVlTQmdvR0F3YjdCZlFGN0FYa0Jkd0YxUVhOQmNRRnZBVzBCYXdGcEFXYkJaTUZpZ1dDQlhrRmNBVm9CVjhGVmdWTkJVUUZPd1V5QlNnRkh3VVdCUXdGQXdYNUJQQUU1Z1RkQk5NRXlRUy9CTFVFcXdTaEJKY0VqUVNEQkhrRWJ3UmtCRm9FVUFSRkJEc0VNQVFtQkJzRUVBUUZCUHNEOEFQbEE5b0R6d1BFQTdrRHJnT2pBNWdEalFPQkEzWURhd05mQTFRRFNRTTlBeklESmdNYUF3OERBd1A0QXV3QzRBTFZBc2tDdlFLeEFxVUNtUUtOQW9FQ2RRSnFBbDBDVVFKRkFqa0NMUUloQWhVQ0NRTDhBZkFCNUFIWUFjc0J2d0d6QWFjQm1nR09BWUlCZFFGcEFWd0JVQUZFQVRjQkt3RWVBUklCQlFINUFPd0E0QURUQU1jQXVnQ3VBS0VBbFFDSUFId0Fid0JqQUZZQVNnQTlBREVBSkFBWEFBc0FBQUR6LytmLzJ2L08vOEgvdGYrby81di9qLytELzNiL2F2OWQvMUgvUlA4NC95ei9JUDhUL3dmLysvN3UvdUwrMXY3Sy9yMytzZjZsL3BuK2pmNkIvblgrYWY1ZC9sSCtSZjQ1L2k3K0l2NFcvZ3IrL3YzeS9lZjkyLzNQL2NQOXVQMnMvYUg5bGYySy9YNzljLzFvL1Z6OVVmMUcvVHI5TC8way9SbjlEdjBEL2ZqODdmemkvTmY4emZ6Qy9MZjhyZnlpL0pmOGpmeUMvSGo4YnZ4ai9GbjhUL3hGL0R2OE1md24vQno4RS93Si9QLzc5ZnZyKytMNzJQdlArOFg3dlB1eSs2bjdvUHVYKzQzN2hQdDcrM0w3YWZ0ZysxajdUL3RHK3o3N05mc3QreVg3SFBzVSt3ejdCUHY4K3ZQNjdQcmsrdHo2MVByTStzWDZ2ZnExK3E3NnAvcWYrcGo2a2ZxSytvUDZmUHAxK203NmFQcGgrbHI2VlBwTitrZjZRZm83K2pYNkwvb3AraVA2SGZvWCtoSDZEUG9HK2dINi9QbjIrZkg1N1BubitlTDUzZm5ZK2RQNXovbksrY2I1d2ZtOStibjV0UG13K2F6NXFQbWwrYUg1bmZtWitaYjVrdm1QK1l6NWlQbUYrWUw1Zi9sOCtYcjVkL2wwK1hMNWIvbHQrV3I1YVBsbStXVDVZdmxnK1Y3NVhQbGIrVm41V1BsVytWWDVWUGxUK1ZMNVVmbFErVS81VHZsTytVMzVUZmxNK1V6NVRQbE0rVXo1VFBsTStVejVUZmxOK1UzNVR2bFArVS81VVBsUitWTDVVL2xVK1ZYNVZ2bFkrVm41Vy9sYytWNzVZUGxoK1dQNVpmbG4rV241YS9sdStYRDVjL2wxK1hqNWUvbDkrWUQ1Zy9tRytZbjVqUG1RK1pQNWwvbWErWjc1b2ZtbCthbjVyZm14K2JYNXVmbTkrY0g1eHZuSytjLzUwL25ZK2QzNTR2bm0rZXo1OFBuMitmdjVBUG9GK2d2NkVQb1craHY2SWZvbitpMzZNL281K2ovNlJmcEwrbEg2V1BwZSttWDZhL3B5K25qNmYvcUcrbzM2bFBxYStxSDZxZnF3K3JmNnZ2ckcrczM2MWZyZCt1VDY3UHIwK3Z6NkEvc0wreFA3Ry9zait5djdOUHM4KzBUN1RmdFYrMTM3WnZ0dSszZjdnUHVJKzVIN212dWorNno3dGZ1Kys4ZjcwUHZaKytQNzdQdjErLy83Q1B3Uy9CdjhKZnd1L0RqOFF2eEwvRlg4WC94cC9IUDhmZnlIL0pIOG0veWwvSy84dXZ6RS9NNzgyZnpqL08zOCtQd0MvUXo5Ri8waS9TejlOLzFCL1V6OVYvMWkvV3o5ZC8yQy9ZMzltUDJqL2E3OXVQM0QvYzc5MnYzbC9mRDkrLzBHL2hIK0hQNG4valArUHY1Si9sVCtYLzVyL25iK2dmNk4vcGorby82di9ycit4djdSL3R6KzZQN3ovdi8rQ3Y4Vy95SC9MZjg0LzBQL1QvOWEvMmIvY2Y5OS80ai9sUCtmLzZ2L3R2L0MvODMvMmYvbC8vRC8vUDhHQUJJQUhRQXBBRFFBUUFCTEFGWUFZZ0J0QUhrQWhBQ1FBSnNBcGdDeUFMMEF5QURVQU44QTZ3RDJBQUVCRFFFWUFTTUJMZ0U2QVVVQlVBRmJBV1lCY1FGOEFZY0JrZ0dkQWFnQnN3RytBY2tCMUFIZkFlb0I5UUVBQWdvQ0ZRSWdBaXNDTlFKQUFrc0NWUUpnQW1vQ2RRSi9Bb2tDbEFLZUFxZ0Nzd0s5QXNjQzBRTGJBdVVDN3dMNUFnTUREUU1YQXlFREtnTTBBejREU0FOUkExc0RaQU51QTNjRGdRT0tBNU1EbkFPbUE2OER1QVBCQThvRDB3UGNBK1VEN1FQMkEvOERDQVFRQkJrRUlRUXFCRElFT2dSREJFc0VVd1JiQkdNRWF3UnpCSHNFZ3dTS0JKSUVtZ1NpQktrRXNRUzRCTUFFeHdUT0JOVUUzQVRqQk9vRThRVDRCUDhFQmdVTUJSTUZHUVVnQlNZRkxRVXpCVGtGUHdWRkJVc0ZVUVZYQlYwRll3VnBCVzRGZEFWNUJYNEZoQVdKQlk0Rmt3V1lCWjBGb2dXbkJhd0ZzUVcxQmJvRnZnWERCY2NGekFYUUJkUUYyQVhjQmVBRjVBWG5CZXNGN3dYekJmWUYrUVg5QlFBR0F3WUdCZ2tHREFZUEJoSUdGQVlYQmhrR0hBWWVCaUVHSXdZbEJpY0dLUVlyQmkwR0x3WXhCaklHTkFZMUJqY0dPQVk2QmpzR1BBWTlCajRHUHdZL0JrQUdRUVpCQmtJR1FnWkRCa01HUXdaREJrTUdRd1pEQmtNR1F3WkRCa0lHUWdaQkJrRUdRQVkvQmo0R1BRWThCanNHT2dZNUJqY0dOZ1kwQmpNR01RWXdCaTRHTEFZcUJpZ0dKZ1lrQmlJR0h3WWRCaG9HR0FZV0JoTUdFQVlOQmdvR0NBWUZCZ0VHL2dYN0JmZ0Y5QVh4QmUwRjZRWG1CZUlGM2dYYUJkWUYwZ1hPQmNvRnhnWEJCYjBGdVFXMEJiQUZxd1dtQmFJRm5RV1lCWk1GamdXSkJZUUZmZ1Y1QlhRRmJnVnBCV01GWFFWWUJWSUZUQVZHQlVBRk9nVTBCUzRGS0FVaUJSc0ZGUVVQQlFnRkFRWDdCUFFFN1FUbkJPQUUyUVRTQk1zRXhBUzlCTFlFcmdTbkJLQUVtQVNSQklrRWdnUjZCSE1FYXdSakJGc0VVd1JMQkVNRU93UXpCQ3NFSXdRYkJCTUVDZ1FDQlBvRDhRUHBBK0FEMkFQUEE4WUR2Z08xQTZ3RG93T2JBNUlEaVFPQUEzY0RiZ05sQTF3RFVnTkpBMEFETndNdEF5UURHd01SQXdnRC9nTDBBdXNDNFFMWUFzNEN4QUs2QXJFQ3B3S2RBcE1DaWdLQUFuWUNiQUppQWxnQ1RnSkVBam9DTUFJbUFod0NFUUlIQXYwQjh3SHBBZDRCMUFIS0FjQUJ0UUdyQWFFQmxnR01BWUlCZHdGdEFXTUJXQUZOQVVNQk9BRXVBU01CR1FFT0FRUUIrUUR2QU9RQTJnRFBBTVFBdWdDdkFLVUFtZ0NQQUlVQWVnQndBR1VBV2dCUUFFVUFPd0F3QUNVQUd3QVFBQVlBL1AveC8rZi8zUC9TLzhmL3ZmK3kvNmYvbmYrUy80ai9mdjl6LzJuL1h2OVUvMG4vUC84MS95ci9JUDhWL3d2L0FmLzMvdXorNHY3WS9zMyt3LzY1L3EvK3BmNmIvcEQraHY1OC9uTCthUDVlL2xUK1N2NUEvamIrTFA0ai9obitELzRGL3Z2OTh2M28vZDc5MWYzTC9jTDl1UDJ1L2FYOW5QMlMvWW45Zi8xMi9XMzlaUDFhL1ZIOVNQMC8vVGI5TGYway9SdjlFdjBLL1FIOStQenYvT2Y4M3Z6Vy9NMzh4UHk4L0xUOHEveWovSnI4a3Z5Sy9JTDhldnh5L0dyOFl2eGEvRkw4U3Z4RC9EdjhNL3dyL0NUOEhQd1YvQTM4QnZ6Lysvajc4UHZwKytMNzIvdlUrODM3eHZ1Lys3bjdzdnVyKzZYN252dVkrNUg3aS91RiszLzdlZnR6KzJ6N1p2dGcrMXI3VlB0TyswbjdRL3M5K3pqN012c3QreWo3SXZzZCt4ajdFL3NPK3duN0JQdi8rdnI2OXZyeCt1ejY2UHJrK3QvNjIvclgrdEw2enZySytzYjZ3dnEvK3J2NnQvcXorckQ2clBxcCtxWDZvdnFmK3B6Nm1mcVcrcFA2a1BxTitvcjZoL3FGK29MNmdQcDkrbnY2ZVBwMituVDZjdnB3K203NmJQcHErbWo2Wi9wbCttVDZZdnBoK21ENlh2cGQrbHo2Vy9wYStsbjZXZnBZK2xmNlYvcFcrbGI2VmZwVitsWDZWUHBVK2xUNlZQcFUrbFg2VmZwVitsYjZWdnBXK2xmNldQcFkrbG42V3ZwYitsejZYZnBlK21ENllmcGkrbVQ2WmZwbittbjZhdnBzK203NmNQcHkrblQ2ZHZwNCtucjZmZnAvK29MNmhQcUgrb3I2alBxUCtwTDZsZnFZK3B2Nm52cWgrcVg2cVBxcitxLzZzdnEyK3JyNnZmckIrc1g2eWZyTit0SDYxZnJaK3QzNjR2cm0rdXY2Ny9yeit2ajYvZm9CK3diN0Mvc1EreFg3R3ZzZit5VDdLZnN1K3pUN09mcy8rMFQ3U3Z0UCsxWDdXdnRnKzJiN2JQdHkrM2o3ZnZ1RSs0cjdrUHVYKzUzN28vdXErN0Q3dC91OSs4VDd5L3ZTKzlqNzMvdm0rKzM3OVB2Nyt3TDhDZndRL0JmOEgvd20vQzM4TmZ3OC9FVDhTL3hUL0ZyOFl2eHAvSEg4ZWZ5Qi9JbjhrZnlZL0tEOHFQeXgvTG44d2Z6SS9ORDgyZnpoL09uODh2ejYvQUw5Qy8wVC9SejlKUDB0L1RiOVB2MUgvVkQ5V1AxaC9XcjljLzE3L1lUOWpmMlcvWi85cVAyeC9icjl3LzNNL2RiOTMvM28vZkg5K3YwRS9nMytGdjRmL2luK012NDcva1grVHY1WS9tSCthLzUwL24zK2gvNlEvcHIrcFA2dC9yZit3UDdLL3RQKzNmN24vdkQrK3Y0RS93My9GLzhoL3lyL05QOCsvMGovVWY5Yi8yWC9idjk0LzRML2pQK1YvNS8vcWYrei83ei94di9RLzluLzQvL3QvL2YvQUFBSkFCTUFIUUFtQURBQU9nQkVBRTRBVndCaEFHc0FkQUIrQUljQWtRQ2JBS1FBcmdDM0FNRUF5Z0RVQU40QTV3RHhBUG9BQkFFTkFSY0JJQUVxQVRNQlBRRkdBVThCV1FGaUFXc0JkQUY5QVljQmtBR1pBYUlCckFHMUFiNEJ4d0hRQWRrQjRnSHJBZlFCL1FFR0FnNENGd0lnQWlrQ01nSTZBa01DVEFKVUFsMENaZ0p1QW5jQ2Z3S0hBcEFDbUFLaEFxa0NzUUs2QXNJQ3lnTFNBdG9DNGdMcUF2SUMrZ0lDQXdvREVnTWFBeUVES1FNd0F6Z0RRQU5IQTA4RFZnTmRBMlVEYkFOekEzc0RnZ09KQTVBRGx3T2VBNlVEckFPekE3a0R3QVBIQTgwRDFBUGJBK0VENkFQdUEvUUQrd01CQkFjRURRUVVCQm9FSUFRbUJDd0VNUVEzQkQwRVFnUklCRTRFVXdSWkJGNEVZd1JvQkc0RWN3UjRCSDBFZ2dTSUJJd0VrUVNXQkpzRW53U2tCS2tFclFTeUJMWUV1Z1MvQk1NRXh3VExCTThFMHdUWEJOc0Uzd1RpQk9ZRTZRVHRCUEFFOUFUM0JQc0UvZ1FCQlFRRkJ3VUtCUTBGRUFVVEJSVUZHQVViQlIwRklBVWlCU1VGSndVcEJTc0ZMUVV2QlRFRk13VTFCVGNGT0FVNkJUd0ZQUVUvQlVBRlFRVkNCVVFGUlFWR0JVY0ZSd1ZJQlVrRlNnVktCVXNGVEFWTUJVMEZUUVZOQlUwRlRRVk9CVTRGVGdWT0JVMEZUUVZOQlUwRlRBVk1CVXNGU2dWS0JVa0ZTQVZIQlVZRlJRVkVCVU1GUWdWQUJUOEZQZ1U4QlRzRk9RVTRCVFlGTkFVekJURUZMd1V0QlNzRktBVW1CU1FGSVFVZkJSMEZHZ1VZQlJVRkVnVVFCUTBGQ2dVSEJRUUZBUVg5QlBvRTl3VHpCUEFFN1FUcEJPWUU0Z1RlQk5zRTF3VFRCTThFekFUSUJNTUV2d1M3QkxjRXNnU3VCS2tFcFFTZ0JKd0Vsd1NUQkk0RWlRU0VCSUFFZXdSMkJIRUVhd1JtQkdFRVhBUldCRkVFVEFSR0JFRUVPd1EyQkRBRUtnUWxCQjhFR1FRVEJBMEVCd1FCQlBzRDlRUHZBK2dENGdQY0E5VUR6d1BKQThJRHZBTzFBNjhEcUFPaEE1b0Rrd09OQTRZRGZ3TjRBM0VEYWdOakExc0RWQU5OQTBZRFB3TTNBekFES1FNaEF4b0RFZ01MQXdNRC9BTDBBdXdDNVFMZEF0WUN6Z0xHQXI0Q3RnS3ZBcWNDbndLWEFvNENoZ0orQW5ZQ2JnSm1BbDRDVlFKTkFrVUNQUUkwQWl3Q0pBSWJBaE1DQ2dJQ0F2a0I4UUhwQWVBQjJBSFBBY2NCdmdHMUFhMEJwQUdiQVpNQmlnR0JBWGtCY0FGbkFWNEJWZ0ZOQVVRQk93RXlBU29CSVFFWUFROEJCZ0g5QVBRQTZ3RGpBTm9BMFFESUFMOEF0Z0N0QUtRQW13Q1NBSWtBZ0FCM0FHNEFaUUJjQUZNQVNnQkJBRGdBTHdBbUFCNEFGUUFNQUFNQSsvL3kvK24vNFAvWC84Ny94Zis4LzdQL3F2K2gvNW4va1ArSC8zNy9kZjlzLzJUL1cvOVMvMG4vUVA4NC95Ly9KdjhlL3hYL0RQOEUvL3YrOHY3cS91SCsyUDdRL3NmK3YvNjIvcTcrcGY2ZC9wVCtqUDZEL252K2MvNXEvbUwrV3Y1Ui9rbitRZjQ1L2pIK0tmNGcvaGorRVA0SS9nRCsrZjN4L2VuOTRmM1ovZEg5eWYzQi9ibjlzdjJxL2FMOW0vMlQvWXo5aFAxOS9YWDlidjFtL1YvOVdQMVEvVW45UXYwNy9UVDlMZjBtL1IvOUdQMFIvUXI5QS8zOC9QYjg3L3pvL09MODIvelYvTTc4eVB6Qi9Mdjh0Znl1L0tqOG92eWMvSmI4a1B5Sy9JVDhmdng0L0hMOGJQeG0vR0Q4Vy94Vi9FLzhTdnhFL0QvOE9mdzAvQy84S3Z3ay9CLzhHdndWL0JEOEMvd0cvQUw4L2Z2NCsvUDc3L3ZxKytiNzR2dmQrOW43MVB2USs4ejd5UHZFKzhEN3ZQdTQrN1Q3c1B1cys2bjdwZnVpKzU3N20vdVgrNVQ3a2Z1Tys0cjdoL3VFKzRIN2Z2dDcrM2o3ZGZ0eSszRDdiZnRxKzJqN1pmdGorMkg3WHZ0YysxcjdXUHRXKzFUN1V2dFErMC83VGZ0TCswcjdTUHRIKzBYN1JQdEMrMEg3UVBzLyt6NzdQZnM4K3p2N092czUremo3T1BzMyt6ZjdOdnMyK3pYN05mczErelg3TmZzMCt6VDdOUHMwK3pYN05mczEremI3TnZzMit6ZjdOL3M0K3puN092czYrenY3UFBzOSt6NzdRUHRCKzBMN1EvdEUrMGI3Ui90SiswdjdUUHRPKzFEN1VmdFQrMVg3Vi90WisxdjdYdnRnKzJMN1pmdG4rMm43YlB0diszSDdkUHQyKzNuN2ZQdC8rNEw3aGZ1SSs0djdqdnVSKzVYN21QdWIrNS83b3Z1bSs2cjdyZnV4KzdYN3VQdTgrOEQ3eFB2SSs4ejcwUHZVKzlqNzNmdmgrK1g3NnZ2dSsvUDc5L3Y4K3dEOEJmd0svQS84RS93WS9CMzhJdnduL0N6OE12dzMvRHo4UWZ4SC9FejhVZnhYL0Z6OFl2eG4vRzM4Yy94NC9INzhoUHlLL0kvOGxmeWIvS0g4cC95dC9MUDh1dnpBL01iOHpQelQvTm44My96bS9Pejg4L3o1L0FEOUJ2ME4vUlQ5R3YwaC9TajlMdjAxL1R6OVEvMUsvVkg5V1AxZi9XYjliZjEwL1h2OWd2MkovWkg5bVAyZi9hYjlydjIxL2IzOXhQM0wvZFA5MnYzaS9lbjk4ZjM0L1FEK0NQNFAvaGYrSC80bS9pNytOdjQ5L2tYK1RmNVYvbDMrWmY1cy9uVCtmUDZFL296K2xQNmMvcVQrclA2MC9yeit4UDdNL3RUKzNQN2svdXorOVA3OS9nWC9EZjhWL3gzL0pmOHUvemIvUHY5Ry8wNy9WdjlmLzJmL2IvOTQvNEQvaVArUS81ai9vZitwLzdIL3VmL0MvOHIvMHYvYS8rTC82Ly96Ly92L0FnQUxBQk1BR3dBakFDd0FOQUE4QUVRQVRBQlZBRjBBWlFCdEFIVUFmZ0NHQUk0QWxnQ2VBS1lBcmdDMkFMOEF4d0RQQU5jQTN3RG5BTzhBOXdEL0FBY0JEd0VYQVI4QkpnRXVBVFlCUGdGR0FVNEJWZ0ZkQVdVQmJRRjFBWHdCaEFHTUFaTUJtd0dpQWFvQnNRRzVBY0VCeUFIUUFkY0IzZ0htQWUwQjlBSDhBUU1DQ2dJUkFoa0NJQUluQWk0Q05RSThBa01DU2dKUkFsZ0NYd0ptQW0wQ2N3SjZBb0VDaHdLT0FwVUNtd0tpQXFrQ3J3SzJBcndDd2dMSkFzOEMxUUxjQXVJQzZBTHVBdlFDK3dJQkF3Y0REUU1TQXhnREhnTWtBeW9ETHdNMUF6c0RRQU5HQTBzRFVRTldBMXNEWVFObUEyc0RjQU4xQTNzRGdBT0ZBNG9EandPVUE1a0RuUU9pQTZjRHF3T3dBN1VEdVFPK0E4SUR4Z1BMQTg4RDB3UFhBOXNEM3dQakErY0Q2d1B2QS9NRDl3UDZBLzREQWdRRkJBa0VEUVFRQkJRRUZ3UWFCQjBFSVFRa0JDY0VLZ1F0QkM4RU1nUTFCRGdFT2dROUJFQUVRd1JGQkVnRVNnUk5CRThFVVFSVEJGVUVWd1JaQkZzRVhRUmZCR0VFWWdSa0JHWUVad1JwQkdvRWJBUnRCRzRFY0FSeEJISUVjd1IwQkhVRWRnUjNCSGdFZUFSNUJIb0Vld1I3Qkh3RWZBUjhCSDBFZlFSOUJIMEVmUVI5Qkg0RWZRUjlCSDBFZlFSOUJIMEVmQVI4Qkh3RWV3UjZCSG9FZVFSNEJIY0VkZ1IxQkhRRWN3UnlCSEVFY0FSdkJHMEViQVJxQkdrRVp3Um1CR1FFWXdSaEJGOEVYUVJiQkZrRVZ3UlZCRk1FVVFSUEJFd0VTZ1JJQkVZRVF3UkJCRDRFUEFRNUJEY0VOQVF4QkM0RUt3UW9CQ1VFSWdRZkJCd0VHQVFWQkJFRURnUUxCQWNFQkFRQUJQMEQrUVAxQS9JRDdnUHFBK1lENGdQZUE5b0QxZ1BTQTg0RHlnUEdBOEVEdlFPNEE3UURzQU9yQTZjRG9nT2RBNWtEbEFPUEE0b0RoZ09CQTN3RGR3TnlBMjBEYUFOaUExMERXQU5UQTA0RFNBTkRBejBET0FNekF5MERLQU1pQXh3REZ3TVJBd3NEQmdNQUEvb0M5QUx1QXVnQzRnTGNBdFlDMEFMS0FzUUN2Z0s0QXJJQ3F3S2xBcDhDbUFLU0Fvc0NoUUovQW5nQ2NnSnJBbVVDWGdKWEFsRUNTZ0pEQWowQ05nSXZBaWtDSWdJYkFoUUNEUUlHQXY4QitBSHhBZW9CNHdIY0FkVUJ6Z0hIQWNBQnVRR3lBYXNCb3dHY0FaVUJqZ0dHQVg4QmVBRnhBV2tCWWdGYkFWTUJUQUZGQVQwQk5nRXVBU2NCSUFFWUFSRUJDUUVDQWZvQTh3RHNBT1FBM1FEVkFNNEF4Z0MrQUxjQXJ3Q29BS0FBbVFDUkFJa0FnZ0I2QUhJQWF3QmpBRndBVkFCTUFFVUFQUUEyQUM0QUpnQWZBQmNBRUFBSUFBQUErdi95Lyt2LzQvL2MvOVQvemYvRi83Ny90dit2LzZmL29QK1kvNUgvaWYrQy8zci9jLzlyLzJUL1hQOVYvMDcvUnY4Ly96ai9NUDhwL3lIL0d2OFQvd3ovQlAvOS92Yis3LzduL3VEKzJmN1Mvc3Yrdy82OC9yWCtydjZuL3FEK21mNlMvb3YraFA1OS9uZitjUDVwL21MK1cvNVYvazcrUi81Qi9qcitNLzR0L2liK0gvNFovaEwrRFA0Ri92LzkrUDN5L2V6OTVmM2YvZG45MHYzTS9jYjl3UDI2L2JQOXJmMm4vYUg5bS8yVi9ZLzlpdjJFL1g3OWVQMXkvVzM5Wi8xaC9WejlWdjFRL1V2OVJmMUEvVHY5TmYwdy9TdjlKZjBnL1J2OUZ2MFIvUXo5Qi8wQy9mMzgrUHp6L083ODZmemwvT0Q4Mi96WC9OTDh6dnpKL01YOHdQeTgvTGY4cy95di9LdjhwL3lqL0o3OG12eVcvSlA4ai95TC9JZjhoUHlBL0h6OGVQeDEvSEg4YnZ4cS9HZjhaUHhnL0YzOFd2eFgvRlA4VVB4Ti9FcjhSL3hGL0VMOFAvdzgvRG44Ti93MC9ETDhML3d0L0NyOEtQd20vQ1Q4SWZ3Zi9CMzhHL3daL0JmOEZmd1QvQkw4RVB3Ty9BMzhDL3dKL0FqOEJ2d0YvQVQ4QXZ3Qi9BRDgvL3Y5Ky96NysvdjYrL3I3K2Z2NCsvZjc5dnYyKy9YNzlmdjArL1Q3OC92eisvUDc4dnZ5Ky9MNzh2dnkrL0w3OHZ2eSsvTDc4L3Z6Ky9QNzgvdjArL1Q3OWZ2MSsvYjc5L3YzKy9qNytmdjYrL3Y3L1B2OCsvMzcvL3NBL0FIOEF2d0QvQVg4QnZ3SS9BbjhDL3dOL0E3OEVQd1MvQlQ4RnZ3WC9CbjhHL3dkL0IvOEl2d2svQ2I4S1B3ci9DMzhML3d5L0RUOE4vdzUvRHo4UC94Qi9FVDhSL3hLL0UzOFVQeFQvRmI4V2Z4Yy9GLzhZL3htL0duOGJmeHcvSFA4ZC94Ni9INzhnZnlGL0luOGpQeVEvSlQ4bVB5Yy9LRDhwUHlvL0t6OHNQeTAvTGo4dlB6Qi9NWDh5ZnpPL05MODEvemIvT0Q4NVB6cC9PMzg4dnozL1B6OEFQMEYvUXI5RC8wVS9SbjlIdjBqL1NqOUxmMHkvVGo5UGYxQy9VZjlUZjFTL1ZmOVhmMWkvV2o5YmYxei9YajlmdjJEL1luOWp2MlUvWnI5b1AybC9hdjlzZjIzL2IzOXcvM0ovYy85MWYzYi9lRDk1djN0L2ZQOStmMy8vUVgrRFA0Uy9oaitILzRsL2l2K01mNDQvajcrUlA1TC9sSCtXUDVlL21UK2EvNXgvbmorZi82Ri9veitrdjZaL3FEK3B2NnQvclQrdXY3Qi9zait6djdWL3R6KzQvN3EvdkgrOS83Ky9nWC9EUDhUL3huL0lQOG4veTcvTmY4OC8wUC9TdjlRLzFmL1h2OWwvMnovYy85Ni80SC9pUCtQLzViL25mK2svNnYvc3YrNS84RC94Ly9PLzlYLzNQL2ovK3IvOGYvMy8vNy9CUUFNQUJNQUdRQWdBQ2NBTGdBMUFEd0FRd0JLQUZFQVdBQmZBR1lBYlFCekFIb0FnUUNJQUk4QWxnQ2RBS1FBcXdDeEFMZ0F2d0RHQU13QTB3RGFBT0VBNkFEdUFQVUEvQUFDQVFrQkR3RVdBUjBCSXdFcUFUQUJOd0U5QVVRQlNnRlJBVmNCWGdGa0FXc0JjUUYzQVg0QmhBR0tBWkVCbHdHZEFhUUJxZ0d3QWJZQnZBSENBY2dCemdIVUFkb0I0QUhtQWV3QjhnSDRBZjRCQkFJS0FnOENGUUliQWlBQ0pnSXNBakVDTndJOEFrSUNSd0pOQWxJQ1dBSmRBbU1DYUFKdEFuTUNlQUo5QW9JQ2h3S01BcEVDbGdLYkFxQUNwUUtxQXE4Q3RBSzRBcjBDd2dMSEFzc0MwQUxVQXRrQzNRTGlBdVlDNmdMdkF2TUM5d0w4QWdBREJBTUlBd3dERUFNVUF4Z0RIQU1nQXlRREtBTXNBeThETXdNM0F6b0RQZ05CQTBVRFNBTk1BMDhEVWdOV0Exa0RYQU5mQTJJRFpRTnBBMnNEYmdOeEEzUURkd042QTMwRGZ3T0NBNFFEaHdPSkE0d0RqZ09SQTVNRGxRT1lBNW9EbkFPZUE2QURvZ09rQTZZRHFBT3FBNndEclFPdkE3RURzZ08wQTdVRHR3TzRBN29EdXdPOEE3MER2Z1BBQThFRHdnUERBOFFEeFFQR0E4WUR4d1BJQThrRHlRUEtBOHNEeXdQTUE4d0R6QVBOQTgwRHpRUE5BODBEelFQTkE4MER6UVBOQTgwRHpRUE5BOHdEekFQTUE4c0R5d1BLQThvRHlRUElBOGdEeHdQR0E4VUR4QVBEQThNRHdnUEFBNzhEdmdPOUE3d0R1Z081QTdjRHRnTzFBN01Ec2dPd0E2NERyUU9yQTZrRHB3T2xBNlFEb2dPZ0E1NERtd09aQTVjRGxRT1RBNUFEamdPTUE0a0Rod09FQTRJRGZ3TjhBM29EZHdOMEEzRURiZ05yQTJrRFpnTmpBMkFEWEFOWkExWURVd05RQTB3RFNRTkdBMElEUHdNN0F6Z0ROQU14QXkwREtnTW1BeUlESGdNYUF4WURFd01QQXdzREJ3TURBLzRDK2dMMkF2SUM3Z0xxQXVVQzRRTGRBdGdDMUFMUUFzc0N4d0xDQXIwQ3VRSzBBckFDcXdLbUFxRUNuQUtZQXBNQ2pnS0pBb1FDZndKNkFuVUNjQUpyQW1ZQ1lRSmNBbFlDVVFKTUFrY0NRUUk4QWpjQ01RSXNBaWNDSVFJY0FoWUNFUUlMQWdZQ0FBTDZBZlVCN3dIcEFlUUIzZ0hZQWRNQnpRSEhBY0VCdXdHMkFiQUJxZ0drQVo0Qm1BR1NBWXdCaGdHQUFYb0JkQUZ1QVdnQllnRmNBVllCVUFGS0FVTUJQUUUzQVRFQktnRWtBUjRCR0FFU0FRc0JCUUgvQVBrQThnRHNBT1lBM3dEWkFOTUF6QURHQU1BQXVRQ3pBSzBBcGdDZ0FKa0Frd0NOQUlZQWdBQjVBSE1BYlFCbUFHQUFXUUJUQUV3QVJnQS9BRGtBTXdBc0FDWUFId0FaQUJNQURBQUdBQUFBK3YvMC8rMy81Ly9nLzlyLzFQL04vOGYvd1ArNi83VC9yZituLzZIL20vK1UvNDcvaVArQi8zdi9kZjl2LzJqL1l2OWMvMWIvVC85Si8wUC9QZjgyL3pEL0t2OGsveDcvR1A4Uy93ei9CdjhBLy9yKzlQN3UvdWorNHY3Yy90YiswUDdLL3NUK3Z2NjQvckwrcmY2bi9xSCttLzZWL3BEK2l2NkUvbi8rZWY1ei9tNythUDVqL2wzK1YvNVMvazMrUi81Qy9qeitOLzR5L2l6K0ovNGkvaDMrR1A0Uy9nMytDUDREL3Y3OStmMzAvZS85NnYzbC9lRDkyLzNXL2RIOXpQM0kvY1A5dnYyNS9iWDlzUDJzL2FmOW92MmUvWnI5bGYyUi9ZejlpUDJFL1gvOWUvMTMvWFA5Yi8xci9XZjlZLzFmL1Z2OVYvMVQvVS85Uy8xSC9VVDlRUDA4L1RqOU5mMHgvUzc5S3Ywbi9TUDlJUDBkL1JuOUZ2MFQvUS85RFAwSi9RYjlBLzBBL2YzOCt2ejMvUFg4OHZ6di9Pejg2dnpuL09UODR2emYvTjM4MnZ6WS9OWDgwL3pRL003OHpQeksvTWo4eHZ6RS9NSDh3UHkrL0x6OHV2eTQvTGI4dGZ5ei9MSDhzUHl1L0t6OHEveXAvS2o4cC95bC9LVDhvL3lpL0tIOG9QeWUvSjM4bmZ5Yy9KdjhtdnlaL0pqOG1QeVgvSmI4bHZ5Vi9KWDhsUHlVL0pUOGsveVQvSlA4a3Z5Uy9KTDhrdnlTL0pMOGt2eVMvSlA4ay95VC9KUDhrL3lVL0pUOGxmeVYvSmI4bHZ5WC9KZjhtUHlaL0pyOG0veWMvSjM4bmZ5ZS9KLzhvUHlpL0tQOHBQeWwvS2I4cVB5cC9LdjhyUHl1L0svOHNmeXkvTFQ4dGZ5My9Mbjh1L3k5L0wvOHdQekMvTVQ4eC96Si9Ndjh6ZnpQL05MODFQelcvTm44Mi96ZS9PRDg0L3psL09qODZ2enQvUEQ4OHZ6MS9QajgrL3o5L0FEOUEvMEcvUW45RGYwUS9SUDlGdjBaL1J6OUlQMGovU2I5S3YwdC9URDlOUDAzL1R2OVAvMUMvVWI5U2YxTi9WSDlWZjFaL1Z6OVlQMWsvV2o5YlAxdy9YVDllUDE4L1lEOWhmMkovWTM5a2YyVi9acjludjJpL2FmOXEvMncvYlQ5dVAyOS9jTDl4djNML2REOTFQM1ovZDc5NHYzbi9lejk4ZjMxL2ZyOS8vMEUvZ24rRHY0VC9oaitIZjRpL2lmK0xQNHgvamIrTy81QS9rYitTLzVRL2xYK1d2NWcvbVgrYXY1dy9uWCtldjZBL29YK2l2NlEvcFgrbS82Zy9xYitxLzZ4L3JiK3ZQN0Ivc2YremY3Uy90aiszZjdqL3VuKzd2NzAvdnIrQVA4Ri93di9FZjhXL3h6L0l2OG8veTcvTS84NS96Ly9SZjlMLzFEL1Z2OWMvMkwvYVA5dS8zVC9lZjkvLzRYL2kvK1IvNWYvblAraS82ai9ydiswLzdyL3dQL0cvOHovMHYvWS85My80Ly9wLysvLzlmLzcvd0FBQmdBTUFCSUFHQUFkQUNNQUtRQXZBRFVBT3dCQkFFY0FUQUJTQUZnQVhnQmtBR29BYndCMUFIc0FnUUNIQUkwQWtnQ1lBSjRBcEFDcEFLOEF0UUM2QU1BQXhnRE1BTkVBMXdEZEFPSUE2QUR0QVBNQStBRCtBQVFCQ1FFUEFSUUJHZ0VmQVNVQktnRXZBVFVCT2dGQUFVVUJTZ0ZRQVZVQldnRmdBV1VCYWdGdkFYVUJlZ0YvQVlRQmlRR09BWk1CbUFHZEFhSUJwd0dzQWJFQnRnRzdBY0FCeFFIS0FjNEIwd0hZQWQwQjRRSG1BZXNCN3dIMEFma0IvUUVDQWdZQ0N3SVBBaFFDR0FJY0FpRUNKUUlwQWkwQ01nSTJBam9DUGdKQ0FrY0NTd0pQQWxNQ1Z3SmJBbDhDWWdKbUFtb0NiZ0p5QW5VQ2VRSjlBb0FDaEFLSUFvc0Nqd0tTQXBZQ21RS2RBcUFDb3dLbkFxb0NyUUt3QXJRQ3R3SzZBcjBDd0FMREFzWUN5UUxMQXM0QzBRTFVBdFlDMlFMY0F0NEM0UUxrQXVZQzZRTHJBdTBDOEFMeUF2UUM5d0w1QXZzQy9RTC9BZ0VEQXdNRkF3Y0RDUU1MQXcwRER3TVJBeElERkFNV0F4Y0RHUU1iQXh3REhnTWZBeUFESWdNakF5UURKUU1uQXlnREtRTXFBeXNETEFNdEF5NERMd012QXpBRE1RTXlBek1ETXdNMEF6UUROUU0xQXpZRE5nTTNBemNETndNNEF6Z0RPQU00QXpnRE9BTTRBemdET0FNNEF6Z0RPQU00QXpjRE53TTNBellETmdNMkF6VUROUU0wQXpRRE13TXlBekVETVFNd0F5OERMZ010QXl3REt3TXFBeWtES0FNbkF5WURKQU1qQXlJRElBTWZBeDRESEFNYkF4a0RHQU1XQXhRREV3TVJBdzhERFFNTUF3b0RDQU1HQXdRREFnTUFBLzRDL0FMNkF2Y0M5UUx6QXZFQzdnTHNBdW9DNXdMbEF1SUM0QUxkQXRzQzJBTFZBdE1DMEFMTkFzb0N5QUxGQXNJQ3Z3SzhBcmtDdGdLekFyQUNyUUtwQXFZQ293S2dBcDBDbVFLV0FwTUNqd0tNQW9nQ2hRS0JBbjRDZWdKM0FuTUNid0pzQW1nQ1pBSmdBbDBDV1FKVkFsRUNUUUpKQWtVQ1FRSTlBamtDTlFJeEFpMENLUUlsQWlBQ0hBSVlBaFFDRUFJTEFnY0NBd0wrQWZvQjlRSHhBZXdCNkFIakFkOEIyZ0hXQWRFQnpBSElBY01CdndHNkFiVUJzUUdzQWFjQm9nR2RBWmtCbEFHUEFZb0JoUUdBQVhzQmR3RnlBVzBCYUFGakFWMEJXQUZUQVU0QlNRRkVBVDhCT2dFMUFUQUJLZ0VsQVNBQkd3RVdBUkVCQ3dFR0FRRUIvQUQyQVBFQTdBRG5BT0VBM0FEWEFORUF6QURIQU1FQXZBQzNBTEVBckFDbkFLRUFuQUNXQUpFQWpBQ0dBSUVBZXdCMkFIRUFhd0JtQUdBQVd3QldBRkFBU3dCRkFFQUFPZ0ExQURBQUtnQWxBQjhBR2dBVUFBOEFDUUFFQVAvLyt2LzEvKy8vNnYvay85Ly8ydi9VLzgvL3lmL0UvNy8vdWYrMC82Ly9xZitrLzUvL21mK1UvNDcvaWYrRS8zLy9lZjkwLzIvL2FmOWsvMS8vV3Y5Vi8wLy9TdjlGLzBEL08vODEvekQvSy84bS95SC9IUDhYL3hML0RmOEkvd1AvL3Y3NS92VCs3LzdxL3VYKzRQN2IvdGIrMGY3TS9zait3LzYrL3JuK3RmNncvcXYrcHY2aS9wMyttUDZVL28vK2l2Nkcvb0grZmY1NC9uVCtiLzVyL21iK1l2NWUvbG4rVmY1Ui9reitTUDVFL2tEK08vNDMvalArTC80ci9pZitJLzRmL2h2K0YvNFQvZy8rQy80SC9nUCsvLzM4L2ZqOTlQM3cvZTM5NmYzbC9lTDkzdjNhL2RmOTAvM1EvYzM5eWYzRy9jUDl2LzI4L2JuOXRmMnkvYS85clAycC9hYjlvLzJnL1ozOW12MlgvWlQ5a2YyUC9ZejlpZjJHL1lUOWdmMSsvWHo5ZWYxMy9YVDljdjF2L1czOWF2MW8vV2I5WS8xaC9WLzlYZjFhL1ZqOVZ2MVUvVkw5VVAxTy9VejlTdjFJL1VmOVJmMUQvVUg5UVAwKy9UMzlPLzA1L1RqOU4vMDEvVFQ5TXYweC9URDlMLzB0L1N6OUsvMHEvU245S1Awbi9TYjlKZjBrL1NQOUkvMGkvU0g5SVAwZy9SLzlIdjBlL1IzOUhmMGMvUno5Ry8wYi9SdjlHLzBiL1J2OUd2MGEvUnI5R3YwYS9ScjlHdjBhL1JyOUd2MGIvUnY5Ry8wYi9SejlIUDBjL1IzOUhmMGUvUjc5SC8wZy9TRDlJZjBpL1NQOUkvMGsvU1g5SnYwbi9TajlLZjBxL1N2OUxQMHQvUy85TVAweC9UTDlOUDAxL1RmOU9QMDYvVHY5UGYwKy9VRDlRZjFEL1VYOVJ2MUkvVXI5VFAxTy9WRDlVdjFVL1ZiOVdQMWEvVno5WHYxZy9XTDlaUDFuL1duOWEvMXUvWEQ5Yy8xMS9YajlldjE5L1gvOWd2MkUvWWY5aXYyTi9ZLzlrdjJWL1pqOW0vMmQvYUQ5by8ybS9hbjlyUDJ2L2JQOXR2MjUvYno5di8zQy9jYjl5ZjNNL2REOTAvM1cvZHI5M2YzaC9lVDk2UDNyL2UvOTh2MzIvZnI5L2YwQi9nWCtDZjRNL2hEK0ZQNFkvaHorSVA0ay9paitLLzR2L2pQK04vNDcvai8rUS81SC9rditVUDVVL2xqK1hQNWcvbVQrYWY1dC9uSCtkdjU2L243K2cvNkgvb3Yra1A2VS9wbituZjZpL3FiK3EvNnYvclQrdVA2OS9zSCt4djdML3MvKzFQN1kvdDMrNHY3bS91dis4UDcxL3ZuKy92NEQvd2YvRFA4Ui94Yi9HdjhmL3lUL0tmOHUvekwvTi84OC8wSC9SdjlMLzFEL1ZmOWEvMS8vWS85by8yMy9jdjkzLzN6L2dmK0cvNHYva1ArVi81ci9uLytrLzZuL3J2K3ovN2ovdmYvQy84Zi96UC9SLzliLzIvL2cvK1gvNnYvdi8vVC8rZi8rL3dJQUJ3QU1BQkVBRmdBYkFDQUFKUUFxQUM4QU5BQTVBRDRBUXdCSEFFd0FVUUJXQUZzQVlBQmxBR29BYndCMEFIa0FmUUNDQUljQWpBQ1JBSllBbXdDZkFLUUFxUUN1QUxNQXR3QzhBTUVBeGdES0FNOEExQURaQU4wQTRnRG1BT3NBOEFEMEFQa0EvZ0FDQVFjQkN3RVFBUlFCR1FFZEFTSUJKd0VyQVM4Qk5BRTRBVDBCUVFGRkFVb0JUZ0ZTQVZjQld3RmZBV01CYUFGc0FYQUJkQUY0QVgwQmdRR0ZBWWtCalFHUkFaVUJtUUdkQWFFQnBRR3BBYXdCc0FHMEFiZ0J2QUcvQWNNQnh3SExBYzRCMGdIV0Fka0IzUUhnQWVRQjV3SHJBZTRCOGdIMUFma0IvQUgvQVFNQ0JnSUpBZ3dDRUFJVEFoWUNHUUljQWg4Q0lnSWxBaWdDS3dJdUFqRUNOQUkzQWpvQ1BRSS9Ba0lDUlFKSEFrb0NUUUpQQWxJQ1ZBSlhBbGtDWEFKZUFtRUNZd0psQW1nQ2FnSnNBbTRDY1FKekFuVUNkd0o1QW5zQ2ZRSi9Bb0VDZ3dLRkFvY0NpQUtLQW93Q2pnS1BBcEVDa3dLVUFwWUNsd0taQXBvQ25BS2RBcDRDb0FLaEFxSUNwQUtsQXFZQ3B3S29BcWtDcWdLckFxd0NyUUt1QXE4Q3NBS3hBcklDc2dLekFyUUN0QUsxQXJZQ3RnSzNBcmNDdHdLNEFyZ0N1QUs1QXJrQ3VRSzVBcmtDdVFLNkFyb0N1Z0s2QXJvQ3VnSzZBcm9DdVFLNUFya0N1UUs0QXJnQ3VBSzNBcmNDdHdLMkFyWUN0UUswQXJRQ3N3S3lBcklDc1FLd0FxOENyd0t1QXEwQ3JBS3JBcW9DcVFLb0FxY0NwZ0trQXFNQ29nS2dBcDhDbmdLZEFwc0NtZ0tZQXBjQ2xRS1VBcElDa1FLUEFvMENqQUtLQW9nQ2hnS0ZBb01DZ1FKL0FuMENld0o1QW5jQ2RRSnpBbkVDYndKc0Ftb0NhQUptQW1NQ1lRSmZBbHdDV2dKWUFsVUNVd0pRQWs0Q1N3SklBa1lDUXdKQUFqNENPd0k0QWpZQ013SXdBaTBDS2dJbkFpUUNJUUllQWhzQ0dBSVZBaElDRHdJTUFna0NCZ0lDQXY4Qi9BSDVBZlVCOGdIdkFlc0I2QUhsQWVFQjNnSGJBZGNCMUFIUUFjMEJ5UUhGQWNJQnZnRzZBYmNCc3dHdkFhd0JxQUdrQWFBQm5RR1pBWlVCa1FHTkFZa0JoUUdDQVg0QmVnRjJBWElCYmdGcUFXWUJZZ0ZlQVZrQlZRRlJBVTBCU1FGRkFVRUJQQUU0QVRRQk1BRXNBU2NCSXdFZkFSc0JGZ0VTQVE0QkNRRUZBUUVCL0FENEFQTUE3d0RyQU9ZQTRnRGRBTmtBMUFEUUFNc0F4d0RDQUw0QXVnQzFBTEVBckFDb0FLTUFud0NhQUpVQWtRQ01BSWdBZ3dCL0FIb0FkUUJ4QUd3QWFBQmpBRjhBV2dCVkFGRUFUQUJJQUVNQVBnQTZBRFVBTVFBc0FDY0FJd0FlQUJvQUZRQVFBQXdBQndBREFQLy8rdi8yLy9ILzdmL28vK1AvMy8vYS85Yi8wZi9OLzhqL3hQKy8vN3YvdHYreC82My9xUCtrLzZEL20vK1gvNUwvanYrSi80WC9nUDk4LzNqL2MvOXYvMnIvWnY5aC8xMy9XZjlVLzFEL1RQOUgvMFAvUC84Ny96Yi9Ndjh1L3luL0pmOGgveDMvR1A4VS94RC9EUDhJL3dQLy8vNzcvdmYrOC83di91dis1LzdqL3QvKzIvN1gvdFArei83TC9zZit4UDdBL3J6K3VQNjAvckQrcmY2cC9xWCtvZjZlL3ByK2x2NlQvby8ralA2SS9vVCtnZjU5L25yK2R2NXovbS8rYlA1cC9tWCtZdjVlL2x2K1dQNVUvbEgrVHY1TC9rZitSUDVCL2o3K08vNDQvalgrTXY0di9peitLZjRtL2lQK0lQNGQvaHIrR1A0Vi9oTCtELzROL2dyK0IvNEYvZ0wrQVA3OS9mcjkrUDMyL2ZQOThmM3UvZXo5NnYzbi9lWDk0LzNoL2Q3OTNQM2EvZGo5MXYzVS9kTDkwUDNPL2N6OXl2M0kvY2I5eFAzQy9jSDl2LzI5L2J2OXV2MjQvYmY5dGYyei9iTDlzUDJ2L2E3OXJQMnIvYXI5cVAybi9hYjlwUDJqL2FMOW9mMmcvWi85bnYyZC9aejltLzJhL1puOW1QMlgvWmY5bHYyVi9aVDlsUDJUL1pMOWt2MlIvWkg5a1AyUS9ZLzlqLzJQL1k3OWp2Mk8vWTM5amYyTi9ZMzlqZjJOL1kzOWpQMk4vWTM5amYyTi9ZMzlqZjJOL1kzOWp2Mk8vWTc5ai8yUC9ZLzlrUDJRL1pIOWtmMlMvWlA5ay8yVS9aVDlsZjJXL1piOWwvMlkvWm45bXYyYS9adjluUDJkL1o3OW4vMmcvYUw5by8yay9hWDlwdjJvL2FuOXF2MnIvYTM5cnYydy9iSDlzLzIwL2JiOXQvMjUvYnI5dlAyKy9jRDl3ZjNEL2NYOXgvM0kvY3I5elAzTy9kRDkwdjNVL2RiOTJQM2EvZHo5M3YzaC9lUDk1ZjNuL2VuOTdQM3UvZkQ5OC8zMS9majkrdjM5L2YvOUFmNEUvZ2YrQ2Y0TS9nNytFZjRVL2hiK0dmNGMvaC8rSWY0ay9pZitLdjR0L2pEK00vNDIvamorTy80Ly9rTCtSZjVJL2t2K1R2NVIvbFQrVi81YS9sMytZZjVrL21mK2EvNXUvbkgrZGY1NC9uditmLzZDL29iK2lmNk4vcEQrbFA2WC9wcitudjZpL3FYK3FmNnMvckQrdFA2My9ydit2LzdDL3NiK3l2N08vdEgrMWY3Wi90Mys0UDdrL3VqKzdQN3cvdlQrOS83Ny92LytBLzhIL3d2L0QvOFQveGYvRy84Zi95UC9KLzhyL3kvL00vODMvenYvUC85RC8wZi9TLzlRLzFUL1dQOWMvMkQvWlA5by8yei9jUDkxLzNuL2ZmK0IvNFgvaXYrTy81TC9sdithLzU3L28vK24vNnYvci8rMC83ai92UC9BLzhYL3lmL04vOUgvMWYvYS85Ny80di9tLyt2LzcvL3ovL2YvKy84QUFBTUFCZ0FLQUE0QUV3QVhBQnNBSHdBa0FDZ0FMQUF3QURRQU9RQTlBRUVBUlFCSkFFd0FVUUJWQUZrQVhRQmhBR1VBYWdCdEFIRUFkUUI1QUgwQWdBQ0VBSWdBakFDUUFKUUFtQUNjQUtBQXBBQ25BS3NBcndDeUFMWUF1Z0MrQU1FQXhBRElBTXdBendEVEFOY0EyZ0RlQU9FQTVBRG9BT3dBN3dEeUFQVUErUUQ5QVA4QUF3RUhBUWtCRFFFUUFSTUJGd0VhQVIwQklBRWpBU1lCS1FFdEFTOEJNd0UxQVRrQk93RStBVUVCUkFGR0FVb0JUQUZQQVZJQlZRRllBVm9CWFFGZ0FXSUJaUUZuQVdzQmJRRndBWElCZFFGM0FYb0JmQUYvQVlBQmd3R0ZBWWNCaWdHTUFZOEJrQUdUQVpVQmx3R1pBWnNCbmdHZkFhSUJvd0dsQWFjQnFRR3JBYTBCcndHeEFiSUJ0QUcyQWJnQnVRRzdBYjBCdmdIQUFjRUJ3Z0hGQWNZQnh3SEpBY29CekFITkFjNEIwQUhSQWRNQjB3SFVBZFlCMXdIWkFka0IyZ0hjQWR3QjNnSGVBZDhCNFFIaEFlSUI0d0hrQWVVQjVRSG5BZWNCNkFIcEFla0I2Z0hxQWVzQjZ3SHNBZTBCN1FIdUFlNEI3d0h2QWU4Qjd3SHZBZkFCOEFId0FmQUI4UUh3QWZFQjhRSHhBZkVCOFFIeEFmRUI4UUh4QWZFQjhRSHdBZkVCOEFId0FlOEI4QUh2QWU4QjdnSHVBZTRCN1FIdEFld0I3QUhyQWVzQjZnSHBBZWtCNkFIb0FlY0I1Z0htQWVVQjVBSGtBZUlCNGdIaEFlQUIzd0hmQWQwQjNBSGNBZG9CMlFIWUFkY0IxZ0hWQWRRQjB3SFJBZEFCendIT0FjMEJ6QUhLQWNrQnh3SEdBY1VCeEFIQ0FjRUJ2d0c5QWJ3QnV3RzVBYmdCdGdHMEFiSUJzUUd2QWE0QnJBR3JBYWtCcHdHbUFhUUJvZ0dnQVo4Qm5RR2JBWmtCbHdHVkFaTUJrUUdQQVkwQml3R0pBWWNCaFFHRUFZSUJnQUY5QVhzQmVRRjNBWFVCY3dGeEFXNEJiQUZxQVdnQlpnRmpBV0VCWHdGZEFWb0JXQUZXQVZRQlVRRlBBVTBCU2dGSUFVVUJRd0ZCQVQ0QlBBRTVBVGNCTlFFeUFUQUJMUUVyQVNnQkpRRWpBU0FCSGdFYkFSa0JGZ0VVQVJFQkR3RU1BUWtCQndFRUFRSUIvd0Q4QVBvQTl3RDFBUElBN3dEdEFPb0E1d0RsQU9JQTN3RGNBTm9BMXdEVUFOSUF6d0RNQU1rQXh3REVBTUlBdndDOEFMa0F0d0MwQUxFQXJnQ3JBS2dBcGdDakFLQUFuZ0NiQUpnQWxnQ1RBSkFBalFDS0FJY0FoQUNDQUg4QWZBQjVBSGNBZEFCeEFHOEFiQUJwQUdjQVpBQmhBRjRBV3dCWkFGWUFVd0JRQUU0QVN3QkpBRVlBUXdCQUFEMEFPd0E0QURZQU13QXdBQzBBS3dBb0FDVUFJd0FnQUI0QUd3QVlBQllBRXdBUUFBNEFDd0FJQUFZQUF3QUJBUC8vL1AvNi8vZi85UC95Ly9ELzdmL3EvK2ovNWYvai8rRC8zdi9jLzluLzF2L1UvOUgvei8vTi84ci95UC9GLzhQL3dmKysvN3ovdWYrNC83WC9zLyt3LzY3L3JQK3AvNmovcGYrai82SC9uLytjLzVyL21QK1cvNVQva2YrUC80My9pLytKLzRmL2hmK0QvNEQvZi85OC8zdi9lUDkzLzNYL2MvOXgvMi8vYmY5ci8ybi9aLzlsLzJQL1l2OWcvMTcvWFA5Yi8xai9WLzlWLzFUL1V2OVEvMDcvVGY5TC8wbi9TUDlHLzBYL1EvOUMvMEQvUHY4OC96di9PZjg0L3pmL05mODAvekwvTWY4di95Ny9MZjhyL3lyL0tQOG4veWIvSmY4ay95TC9JZjhnL3g3L0h2OGMveHYvR3Y4Wi94ai9GLzhXL3hUL0ZQOFMveEgvRVA4US93Ny9EZjhOL3d6L0N2OEsvd24vQ1A4SC93Yi9CdjhGL3dUL0EvOEMvd0wvQWY4QS8vLysvLzcrL3Y3Ky9mNzgvdnorKy83Ni92cisrdjc1L3ZuKytQNzQvdmYrOS83Mi92Yis5ZjcxL3ZYKzlmNzAvdlQrOVA3ei92UCs4Lzd5L3ZMKzh2N3kvdkwrOHY3eC92SCs4Zjd4L3ZIKzhmN3gvdkQrOGY3eC92SCs4UDd4L3ZIKzhmN3gvdkgrOGY3eC92SCs4Zjd4L3ZMKzh2N3kvdkwrOHY3ei92UCs4LzcwL3ZUKzlQNzAvdlgrOWY3Mi92Yis5djczL3ZmKzkvNzQvdmorK2Y3NS92bisrdjc3L3Z2KysvNzgvdjMrL2Y3Ky92NysvLzRBL3dIL0FmOEMvd0wvQS84RC93VC9CZjhHL3diL0IvOEkvd24vQ2Y4Sy93di9EUDhOL3c3L0QvOFAveEQvRWY4Uy94UC9GUDhVL3hYL0Z2OFgveGovR2Y4YS94di9IUDhkL3g3L0gvOGcveUgvSXY4ai95VC9KZjhtL3lmL0tmOHAveXYvTFA4dC95Ny9MLzh3L3pIL012ODAvelgvTnY4My96bi9Pdjg3L3p6L1BmOC8vMEQvUWY5Qy8wUC9SZjlHLzBmL1NQOUsvMHYvVFA5Ti8wLy9VUDlSLzFQL1ZQOVYvMWYvV1A5Wi8xci9YUDlkLzEvL1lQOWgvMkwvWlA5bC8yZi9hUDlwLzJ2L2JQOXQvMi8vY1A5eS8zUC9kUDkyLzNmL2VmOTYvM3YvZmY5Ky8zLy9nZitDLzRUL2hmK0gvNGovaWYrTC80ei9qditQLzVEL2t2K1QvNVgvbHYrWC81bi9tditjLzUzL252K2cvNkwvby8ray82Yi9wLytwLzZyL3EvK3QvNjcvc1AreC83TC90UCsxLzdiL3VQKzUvN3YvdlArOS83Ly93UC9DLzhQL3hQL0cvOGYveWYvSy84di96Zi9PLzgvLzBmL1MvOVAvMWYvVy85Zi8yZi9hLzl6LzNmL2UvOS8vNGYvaS8rUC81UC9tLytmLzZQL3EvK3YvN1AvdC8rLy84UC94Ly9QLzlQLzEvL2IvOS8vNS8vci8rLy84Ly83Ly8vOEFBQUVBQWdBREFBUUFCUUFHQUFnQUNRQUtBQXNBREFBTkFBNEFFQUFRQUJJQUV3QVVBQlVBRmdBWEFCZ0FHUUFhQUJzQUhBQWRBQjRBSHdBZ0FDRUFJZ0FqQUNRQUpRQW1BQ2NBS0FBcEFDb0FLd0FzQUMwQUxRQXVBQzhBTUFBeEFESUFNd0F6QURRQU5RQTJBRGNBT0FBNEFEa0FPZ0E3QUR3QVBBQTlBRDRBUHdBL0FFQUFRUUJCQUVJQVF3QkRBRVFBUlFCR0FFWUFSd0JIQUVnQVNRQkpBRW9BU2dCTEFFd0FUQUJOQUUwQVRnQk9BRThBVHdCUUFGQUFVUUJSQUZJQVVnQlRBRk1BVkFCVUFGUUFWUUJWQUZZQVZnQldBRmNBVndCWEFGZ0FXQUJaQUZrQVdRQmFBRm9BV2dCYUFGc0FXd0JiQUZzQVhBQmNBRndBWEFCZEFGMEFYUUJkQUY0QVhnQmVBRjRBWGdCZUFGOEFYd0JmQUY4QVh3QmZBRjhBWHdCZkFGOEFYd0JnQUY4QVlBQmdBR0FBWUFCZ0FHQUFZQUJnQUdBQVlBQmdBR0FBWUFCZ0FHQUFYd0JmQUY4QVh3QmZBRjhBWHdCZkFGOEFYd0JlQUY0QVhnQmVBRjRBWGdCZUFGMEFYUUJkQUYwQVhRQmRBRndBWEFCY0FGd0FXd0JiQUZzQVd3QmFBRm9BV2dCYUFGb0FXUUJaQUZrQVdBQllBRmdBVndCWEFGY0FWd0JXQUZZQVZnQlZBRlVBVkFCVUFGUUFWQUJUQUZNQVVnQlNBRklBVVFCUkFGQUFVQUJRQUU4QVR3Qk9BRTRBVGdCTkFFMEFUQUJNQUV3QVN3QkxBRW9BU2dCSkFFa0FTUUJJQUVnQVJ3QkhBRVlBUmdCRkFFVUFSQUJFQUVNQVF3QkRBRUlBUWdCQkFFRUFRQUJBQUQ4QVB3QStBRDRBUFFBOUFEd0FQQUE3QURzQU9nQTZBRGtBT1FBNEFEZ0FOd0EzQURZQU5nQTFBRFVBTkFBMEFETUFNd0F5QURJQU1RQXdBREFBTUFBdkFDOEFMZ0F0QUMwQUxRQXNBQ3NBS3dBcUFDb0FLUUFwQUNrQUtBQW9BQ2NBSndBbUFDWUFKUUFrQUNRQUpBQWpBQ01BSWdBaUFDRUFJUUFnQUNBQUh3QWZBQjRBSGdBZEFCMEFIQUFjQUJ3QUd3QWJBQm9BR2dBWkFCa0FHQUFZQUJnQUZ3QVhBQllBRmdBVkFCVUFGUUFVQUJRQUV3QVRBQk1BRWdBU0FCRUFFUUFSQUJBQUVBQVFBQThBRHdBT0FBNEFEZ0FOQUEwQURRQU1BQXdBREFBTEFBc0FDd0FLQUFvQUNnQUtBQWtBQ1FBSkFBZ0FDQUFJQUFnQUJ3QUhBQWNBQmdBR0FBWUFCZ0FGQUFVQUJRQUZBQVVBQkFBRUFBUUFCQUFFQUFNQUF3QURBQU1BQXdBQ0FBSUFBZ0FDQUFJQUFnQUNBQUVBQVFBQkFBRUFBUUFCQUFFQUFRQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUE9PVwiLFwiYmFzZTY0XCIpO1xuXHR2YXIgY2xhcCA9IEJ1ZmZlcihcIlVrbEdSc1JpQUFCWFFWWkZabTEwSUJBQUFBQUJBQUVBUkt3QUFJaFlBUUFDQUJBQVpHRjBZYUJpQUFBQUFLYi9qd0VOL21ZT1JSL01KY1FIUUFYakJyL1V6OGdleG1UUWFMeWd3c3F1NGNWZU44YzV3dy9pOGtYNjVCaFdLQmtzZUVBMlFSWXdwaHpxRGtZZE54UnNGWUFyM1FyMy9pY2FGeDV2S0c4cVl4K0tGdkFROEFrbTcremlSTlgxdVllcVNyRjl6NzdSZk1tdzFGN3NMUUxmOHhMM2svTjMvNHNQWkJkbUZOd1M4eFlDREtvQjBRK2JHeWNhVVFsSytGTHo4UEx0L2F2L2h3MkhEcjhGNWd6OENQMGYweU5TRzgwUTVQVm9GVVljSWd0cC9MN3NpL1RGK1lBRk93RndDQm42YU9kYjJ6M2d0dVlJMjdIdEtQeW0vaHdET0JQVEUyY043dzFGRTNrRTBQc0EvQi9zVFBaZi9PRDltdmFZK24vMG9mS3ErTFA5WlFQUjhBYjIvQU5vQW1iK2lBVlZBbkQ4UmdqMkFJWUVtQS9URWRBVXZCUzJDNllDb0F0UkNURUc3QWJKQW5VRWZ3SG44MWJ4d09xUjZwRDhJUDUrQlVNTDBRK0dFTDRDby94SitRN3g1dllTK2tIeTcrM3c5cEVBWEFGakNXVU40Ly9TOWMzNWxBQ3hDUFlDNEFOdy8xZ0Uxd09KQVZ2N0hQbS8rNXovN0FiaUE0UUpDd1paQnUwRnlRbWlCcjBBaC94VThCanhGL1pYOStiN3dQeXNCQ3NQMVE3SUNhWUVad2hkQllFQm53VkkvV24wSy9YUCthVC9qUUdUQTJmKzVmbWsvT0g2K3Z6MEFVOENiQUhFQWYvNTUvazNBT1A4UkFGR0NJTCtIdjJ2QkF3RzJ3WHMvMzBGR0FjVUJFRURidnZ6L0Y4QVRnWnFCTjM3QXZ2ZCtqbjNLdnNTQTJJRG1RQ2MvUW42UXZsWC9wOEY5Z2JaRE1nS1FBYkNBNVA4SC8yTCs5VDUrdnRrK283NHUva1MvUU1DekFHay9sei9ULzdqL29rQlVRQi9BYThFS2dRRUJqd0lid1FaQWc3OUwvai8rdU1BelFYZkFBQUJidi9DK2FEOUZmMWEvYlg4Ni9yaCsvVDZ6dnJQLzM4RkxBSmNBMEFBblAxTkF5WUNoZ1R2QStBRHFBY1ZDQWNGTndZb0NRVUZBQVJnQUdEOWUvL2lBU3IvTGYzNy9uMzltLzEwL1BqOVd3QzErNmY2V1ByZys5TDVaL2xDKzhMN3ovNEVBRWdEaVFIQUFhMEE2QURyLzRIK3QvN1BBUnNEamdQa0JXc0V0QUwvQUtZQjZnQUdBUnNDVndHSkFZVUFxdisrQUNJQmhQNjgvZlgvUVFFd0FWQUNxd0pmQURML28vd1AvbUlDcmdIci82ZitmdjJrL1ZqOTJQeFovbUlBYkFBOC84eit6QUJTQTR3RW9BSUFBa3NCZlFITEFUY0JQZ0dOQUwzL3hmK1cvd3NBNUFGK0FjSUJWUUF2LytJQUdRRE1BUG9BVi82Yy9DNytMLzhiQU92L3JRRG5BQnovaHY1Zy83VC91Zit2LzMvKzIvK1IvMHovaVFCc0FPZ0ErQUJyQWVVQ0tRSW9BZ2NEMUFPYkFyRUJoQUhsL2puL3JQeWRBYnI2OFNDVVEvWkhuRU1nSjA4U3lQaVcrNTNmZCtWSzZRRGlUZlVjMGFmQkZ0ZnQ5Yi8rSWVJZjZ0d0FDQVRrL2pBTVZSYkZHQmtlN1JPeUd0OFFwdXJzNmN6ZDl0dXM0a2ZaSmV5NzU5SU1leFFsRzA0VlhQVFFBcDM1d0FNKzZzRHpKUWUrK296OVF4WXBLZTBkK1JRNkQ5SWpWUzU3SW5NYmRSNmpEZFh1NE4yVDRWVDV4eGNVR2JzVDRRdEsvRG4vMitZTzBMZkgvOVlVNmIvd1VOeE8yNWJldGQ1UTdnN3lKUDRnQUZVRnhoUmpFbVVhU3pkUE5WOE5GUVpFQkdFUHJpWmJFeFFaVmh0M0VIMysrUVhpRE8zNFBPK0M1cWpWRk5HSjdIRDE5LzBuOXlQK0lRdGdGS2NlUEJOV0J5c1JuQTkrRFFNSUx3TFVCWGZ6Zi9jcTh5WHFwdm45OXpUc3FPWUU4QS8vUi8xcThrbjEvL3UxOXRvRDh3b1VEMmtCVnZSTC9ZVDMwUFBMQllVTG1oT3NKVlltNUNJWUdOc1FYUTJVQ3NBT1l3NU9FcE1iZmdRYS84SDZLT3Y3NkdUZTg5L2w1K2ZtWS9YLytYajVKL2toOEhUdW8ra3Q3ZmZyeHUvTCsxc0pmZ0crK2pFRWt2NVZDV2tRdHhNVEdjMFBQeHlGR21JWTBCelBFZnNQV3hCcEN0TDlJQUo3QjZNQ2IvY3U5VFgzOGZYbjlHTHdaZTlCOUdyKzhBQ3Uvb2o5dS9nVTlQUHlDZmpsQWdzRGd2Y3QrbXNNdXhDR0NZb0dQQkRWQy9zRzZBTklCbnYvcFA5YkIzYjliUGIzOTJEeU9mSEIvNWNDd1FEc0F0d0J4QVBOK3dENVB2NmErdWordHdjdkVkNFErd3NRREZ3THpRZ1FDdzhQcUEzSUJoUURWUDJsK3Z2NHpmUVMvZVQ5U1FLLyt0enowZmdJOWczME8vWS8vQ1Q5R2dUMUFTVUVpd2NXQTJjQ2dQbkIrNTM4c1BvWUFnWUZnUWVwQ1lzRHpnUzZCTjREdkFKVUJQY0ZBQU1qQmQwR2p3aDBCMDBEdndDNCtrNzdDL2RSOWJQMzdBSnZCVnorMkFNT0FnSUNkUC9OK0wzNytmdWIvc24vbGdJS0JRNytBUDBSQldnSGp3U0xBb3ovQkFRUUNLZ0hEQWNpQmNjQmZ3V1pDSFVDSUFYWkJzQURHd1FwQTBZRnlnRFgvZm9CZi8yeC9kVCtvZnVNL2J6OTJma2gveThFSkFFUUFoMEZSZ0krQWFRQ3pBTXRBWlg5RFFLTS84UCtydnhIL2FVQytQNjAra245SVA5VS9ybjlsd0pjQTJRQ0lQOUwvUFQ5S2dFd0JqZ0dzQVJCQmRRRktBVmpBemNEMkFNSkFNTUJqd0laQVpZRHp3SHIvb1g5dGY1YkFOQUEwUUs1QUtBQjh3QjgvZjcvZmdGekFJZ0RVUVZLQkNFQ1hnSXZBNXNCWlFNREJGa0NrZ0M2QVZJQi9nQlVBcEFCY0FDRkFaZ0JhZ0hIQTg0RFJRT1lBb2tBWS82VC9mbjczL3k1L3FiL1J3QnRBTXovOWYwd0FEc0RFZ05DQS9RREpBWEdCUThHZXdVTUJDMEZ3Z1JzQTNJQ2V2K3ovRFA3WFB3dy9tYitNdi8yLzdyLzlRQldBREgvSnY5cUFJWC9rUDdtL3AvKzMvN1gvbi8veC85ZC8wc0E2Z0FYQW9JQ2dnTDRBOTBGR0FWeEJVb0dJd1orQkY0QmN3SXNBWHdBNWY3dy96MEErQUJtQVQwQitBSS83RXZpQmZaeEcrc1pTeEl1RUdrRzNBU05EUDhZUmdBTDhsdjRCZkxMNkhmcWZ1YjAxeno3QkJ5aEJHZ0czUW1iNTdIZTV2MlFJYU1WK0JGQUIxc1E4Zzg1Nlg3NkRRZXdDVG9JU0FVWkF4Z0N1aFdURzhrZkVoQnEvTHNPYndicTYzanRBZkgxN2J2N05BOXNEL1FWTnhsS0V6OE5yZ3E1Q1B2MkcremwyYnJkTnZCbS9IMy80ZjkvL0pUMEd3aHg3MmZ5SVF3ai90QUxyQkhiQUZNSjJ3c0RETWdSeHdiWkNNZjZGdUc2M0ZEbitPWTY0QWppaGVwcjljSDdUUFA1L3ZZZXJpNC9LMUlXc3dRU0Jad016djVHQTBjYlp5QlZJR1FjQnhwUEZVTU9qUTRUSEFFYzJRZHUrM0Q2L3ZrQS9rem1JZWRUN3Uzd3dlOUg0SWIzN2UrQzZVenJVK3FIL0lYMmtPd0k4Qmo3NlBuVzdhUHMydkxjOExiNm9nVk5CVklFRFFsdUdmWWVCeFFwRktNZmdCZEdHczRUa2cybkV5MEdUL3duK3RuNVJQVXo4VmYzTFFUby9qc0J3d2IxQWNUeHB2UFE5WDMyYi9KODhjc0NuZ1p5L3dJQUtQd1E5Zm40RHZtQisxNytMZ2g0QW1qN2t2bzcrMkFCcmd6VEJJMEdNUTNLQlNzRyt2L1JCa0lIbFFBQkFzNElTZ3NJRTNJYTFROWFCVndDeGdWVisxZnlZT25NN3BYeDFPVzk2RUx1VFBscC90TUJiUVZiQmRvQ3YveGlBTGtCTGdnOEZ3VVgzeGJyQzJjTHl4RTlEc2NMS1Fqd0F6b0F1dnBoOFgzMkV2dkYvbFVBOHdDcEJKYjk0L29QL2pvRlRBTzIvMHorVGZ6ditWYjZ2dnl5LzdNR2UvdzMvR1lDdFB6cUFRQUFCZmtsOXNIelpQcm1BZ0lJbkFSd0FIb0JFUVVvQTRVQzJnSHhBVTBESmdQeCsycjMydnpUK3IwQ1VBWEFCVHNDanZZazltUDdRUURhQW5BRDh3TmxCc2Yvb3Z6bi9YWC9td0N2LzNnREJnWUxCUDRHUHd6U0I0SUZwZ0NmK3YzMDN2Y1kvdUw4dy9yOStRWDVFZjR5QWdjRDNnVitBOU1EMC8vYytHYjdPdjJhL3VyL0t2NFBBVDRCT0FBQUJMa0UvZ1FvQkk4QW12L2dBc3dDVndPbUF3VUVrZ1h6QUVuOTkvMEJBRTMvbHdLREF2VUdUd2ozQlFVQnYvNjkvYkg3VGdFeUFQUDdJZnJZOTZyN2pQemUrL2o4eFBzWC8wbi9CQVM1RWcwTjVRR00vOHNNdmgvZklaZ20vaGtlLzM3MXRBYjQ5WnZPMWVmNjRWalgrdVpROE53SVV1V283Nm9INmcwZTlxdnlNQktBRGlIeWl2bmNFcUVqVFNJMERSc2VzaUR5SWFraG9ndTFCTEVDV3lOTUp1UDJVT3NPNUpEZTF0Sy8ya1BYZjk1czhRVHUzZGJvNVRNRXgvejA4QmZaWi91WkRGd095QkpTN0x6UVU4NHRBSTRiaVJ0cUUvQWp4a3dxWUJvN0FSS1c5eHYvMVJrWEdLTWE4aHg3RHNBRWhRSGIraUR0cThpbjJLZjBMZjBKOXB6dGV0eHEzc2J2Zmh3OEdmei9lZ1VxN2kvYURkNnU5eXoyYi9VYkMzWUpReEhXSHR3WTRpWGVLMFljSHY5cDVPN2g5L0Q3NFovNFJ2MUMzWXJ0cENoakdTZjI2UkE1SHgwaVB4YmtHRUFTM3d2ZC9GenBrZlVNNG52ZTh0eWQyOUVCaHZjbi80NzZGTkxxOGNzZnp4Tm9Gem9wOEM0T0ovc0xodTBsL1o4U1NoU2VDVmJ4R2ZyMENiN3hGdGVmMUw3RWJzeEMxRGpNQ2JwVzF1a0tJUnVlTC9WRFJWRmNOeEFpVHg4cEVNME5BeERnQ3hRRWZQeVFBejRPekJaM0ZJQWVWZitqL1cwcWxRTmR6NVhNUDlWczVqM3B2TTFoeWZXNEpkSi80RkhzWkJ2K0NhUVRQUjNHRHh3TTJ3RFM2YlRpeXZxR0IrOE5EQ0NISzhMLzZRV1pHVDRXYVExWUFkY2YwaHJTQSs4Vm1nRjgra0gyWS9LVi84UVVGQUUyOWhJSGhmMXAraGZxTS9PVjdTYnBwZWVGOVNENzJ1OHgvSDRPZlJvdkRNY1daUTA2MzNuVFplK1pCYnNSYmg0bEZkVUYvUHFERGxQemJ1WnREZDBhb3lCL0RzRVdrUmo4SXI0Y3ZnS1grUFhnbnVuODZXZjJUZ0JTOWgvOU92cG5BTm9IUVBkNzVCWGJmT1dWK1lUL0xpVDlEY0wwYmdNeUFFNEtMUW1JOEtmNmZnbmtBVlFOZHhYRkdDMGNHd3ZzQlJRTTlRaGw5aDhDc0FHWEE2bjNETkYxdi9UY0dQWm03MHI0ZC9JbTlZamkwZHYvMkUvZmFQRkFDeGdlcGhDUUhZMGREaDVQS0dnNFRVTFpHU3YxMS9ydjdTeno5ZkNTNWRuMzBQaDNGZ1FrNmhUYysvM2xtL1NwQVRENTZmbXA5aGpuN2VRMzQ5SDNVQXdoQTh2L3Jma1FBWFQzSnd2R0d2QUltaGRySFpZUk5nb2ZDMjREa2dwZkVPUDk5ZzBERkV3R0dQK2E4Ly8wRk91WDljVHp1Zms5RVlYM3VBUFdBZ2pkMmV0YjlTUHBsT2x0OUtmdkRQQXUrMW9MaUFyMjhFWDd3ZXlzK1BzQk9QNGFISDBlcFFOTjlWOFVqQ0xMSVNzYXBCbVJGNW9nSGg0VkZnZ1RtQldVRHRENEh2bzI3NmpPSHRGVThMTHExZWRZNW52ZlMrZVAzYmZoUHU5WDgvSDQrd09JL2pnQVN3N3hCRVlSY1JxeEV6b2tiU0F3QUJnT2loWWhFSkQ4Sk4rWTYrWGhRdUhlK1FrRU1oTjlIUmNMd0FnU0ZISUZJZi8rK1IvNk9QUXU0ZkxjcmNsMjJZMzFud1ZiRDJBUWpnTVRFbWtBTGZYZURRMGJSUi9CSHdjbWFCb1hJa1VpVERITklpd0xDUDVjM3pEaTB1NVc4akRyS3RISHpTdlpFTi82NDBYMEtmRUI2RXJ4QVBLbUJGSVI2UjcwTFBzNW1EaStLRndUMVB4bDhkSGxDZDFRem8vaE4veW4vRHNMb0F5K0VTZ0ZSUVBNOUtMdktQZVMrSWNYV1JYc0dFVVVadktXOCt6cEErSlc3MVh3SisweThJaitIZzFhRVk4WGNEQkdNWWtkcEFyZ0dqSVQzUUVsOUhYMEgvbjkrZDhGUmZlLzh3ejVJUEdXNzVUbHBmaFEvQ0x1cGc2RUFEdjFSKzRIN0ZueDRlTEk4cHNCK2Z1ZDl4SUdLdzgvL0tzRlNoUktIaGNXcWgzNExJMFlSeFNnQmRmNVpQcWc3NXIrT1BqMS9vQU9aQkxyR0RFTXlmNDE5SVhzS09hZzVtbmwzTmlkNUlidldPajE0SUhMU09jU0F5b0UrQXdmRFlBUDZCZlNHTHdWeFNBQkdSMHBBek13SmVzV1RRNEdCaFAyNHV2NTRXZjFpd0hnOE5udy9QZzE3Ky9xM2dENERhZ0hTUHZXNjNQaC9lblQ2NDd2MmZ5dTk3MzJUUGJyL0VjR1ZQN1M5b0xwUVBsR0RSa2sxaWxtSy9NeFd4MGxGQklFRysrbytjUU1iUmVjL3p6NnpnZnNEZUFLYS93UkJXSHZ0K0d4NGxUZVFkVmp4bnpSWXQrazVkajkzUXJmRHJVUW9nanRDY1FDTEFlaEZGa1NOZ244Rkx3Yy9BbUxDd0VJaXc2VEkva1h0Z3JnQlFFRjgvNXM4cnZ4UHdpaEY5d1NKQWY1K0lUdk91MnAzOWpUZSt1Ny8vejVqUGEwNGxiamNPVzc3QWJ1N2VidTZacjRod0pPQzBBc2lDejVIaU1mRlNNOEZpa1JhaGRCQjNrTUtCTmxDTklLTS9lYjZlUG9EdXZrN1pud2V2aHc4dUQxQ1BJQS9KVUNyUHpMQ3lrRmlnaktEbDBOd2hJakFuN3JuUHVSOGdicFJBVjFCRno0Zys5NzMzL1BSOXk5Nk5qcC92d0hCc01hVEJ2REhnWW4yU0lPRFdNQjNSV2JJRXNjTlNRa0k2b2Z5U0I1RmdzUGxQcW4rRnozSHZNeTNDbkhVTXdmMEpUUnZOYlU3YXZ1UE5wdTU4ditMUTAxQzlrTVpBOE9GVGtUWGhVakRCWC9Xd2JwQlJUMFd2NENDZ2tJS2cyTEJBMEJqUDNEQW5FR1RnTTFCZGJ5L2ZuNDk2ZndRd1lCLzVFRWVBNEFEaFFNQVAzbzlONzlhd3c1RkJzY2NBZGk5eUlCaFBhdzlSUDlTd1VKRVVBVWpBNkg4MVR1MHY1VzdBanVLL2s5Ky9mOUVRZDNET0QvemdmeUJ5ZjhrZmJNNk9QcUtmR04rcUgvb2dBQkVIRVIyUXRBLzVUMEovVnpCVFg3MlB3UTk0NzJ5QUZ1OVBYMEJnWEVCM2o3Ty91aUFQd0N1Z0xwQzVvUWdSV0VFU2dHL0FGaitSUUNoZ1lVOHhmNW12c2IrMGI5alFUSEF4RDgvd1ZUL3IzNGtmZUgvVlFRVlJESERPWVFBUkdZQ0FJSGgveEI5RHYvS3YzOTZoSG5jOXdRNHNqaE85OC81N0xqcitzWDYwWDVHZ3RZRDNjUW1SRFRFNHNSbGhVZURIRVFCQ0lJSVJRVFl4aDhIUlFsZEM3NUhRb1NwZ1hVQXFRQXBPc1I0Ty9nR3VmZjJpWHBGUEpFNWJIbmNkMHU0U0RlbmVCZjc0citVZ2pXL29uOVcvTW8rcG9NZ2hQRkY1MGlnaGNqSFJNcitTeXhMcFlacXhyRUZMMEVGZjI1OXV6dlZPbm41VWZteWVuSThDUHgxL0RMN3pmcmYrWWs0ZzdwM2ViZS9Da0kxZnhtQkdjTUVoTzRJTXdRcWhhUkZnb0pDZ09oL21ZSGV3TE1DNThLU3dCZEFOMEZ2eENJRFp6OXl2Tko3bi9xL042cjQ4Znh0L09kKzVVQjQvNnhBOTRGblFVWUJua0hseERsQ1pYNTB2aDE5eDhFL2hVQ0VHOEw4UDRvOS9QOWNRSVovMlAzUFB0VitSRDZlZnllOVRUNC9BQ2tBakFDUEFEUDlFUDd1dndWKzF2K2FnR2RCWE1IRFFpVkRlMFo3aGtwRm9FUW1BdEJDblFCbFBSVjhHVHQ1UCtpNnBMcCtQMkQvNDhGRlB5VDcvM29OKzRwNGozZzlPMlcvcGdQYmdteUI4RVB2aFVWRlBRWWJSUWREWUVMTGdXVUVRc1RRZ0tMK2lYeWdQQkwrNzMrZS9ZVTZvRHlTZ0xHQmRyNll2endCSnNEVkFRdS94TURaZ0x0QkVZTEUvMk4vUVFGTGdjOUFwRDFzZlliOGVQcVplZk82SkQzai80UEN6TUxYZ1FIQ1c0S0NBLzlGT3NHWmdtN0E5Ly9td0hJOG8zcFMvRnYvZGdEYmY3Tyt5SDZBUVRQQlBrRnVnbnFCL3dUV0FoUUJaZ0ZPaFVCQ3dEMHYvckEraXo5YXZ2bkFHTUo1UHh2OXh2MTB2QkQ2WHIyeGZxUTljOEVMUDdLL0pvQzNRSnpDVG9IM3cvd0FrNEFFUkpRRC8wUDVCQWNCK0gvRFAyMytENytOZnk5L0FuMTkrcjc2WjN1bk93VTcvbjF6UGN0Qk5jRHZBZmpGbEVYbUJyc0VLVUxQUkNoQ2RJSHEvdzUvREg1VS8wTUJNMzNIZnU1QStnRHRmcmk5Um9DK2doNENKSC84L3dvOVRMeDZlMk40akRvSmVwUjkzdjFPL3grL1hyN1F3MTJFRUFKVmZERjlHRHZyL1J3QVBrSEpSd3pJTXNmWnhEU0R1NEk0Z1R3QWNvRHBRZzE5aDc3cHYrLy9YSUJpUFFxK1lzRlFmd3oraEQ1OGY3eUNDSUVJLzFxOWNIeGxQSHIvdXI4bHZXaCtycjhCdndGQVBQNkovZnovZVAvT1FWNy93WUJoZzF6RFAwUEZSaWJHcmNVZXhHS0ZDMFQ5ZzlSQmZyMzVmbFIrN0g1eGZSSDkzcnZ4UEdhN3dQbXJ2QXk5aWJyRCszNitkOEJzdjh2K2tVQUxnQXRDQzhQWUE1NkJjLzIvdTduOEhMMEcvengvdVA3ci9tVitxSUNkZ2U5QTFjQ25nb3NDNlVTamhDQ0Rzc09JQVpVQ1kwSGtnY0pBWTBEZ1FlRkJGTUxuZ2dYK203MW5mVmw4Z0w0TlBrZCt4ejd6ZjIvL1NIK0ZQM1UraHoybXZPK0FOVUVKUkN6RHVyK0hBS1NBRHo4L2dIeEFVQUJ2UWpmQ0VZRU5BZ0pBNTRIR2duUC9hZ0M5ZjRSOThUK1EvMHM5ZC94bC9CdDc4enE2ZlZ1QVpnRnFnYjgvcGNHTEFic0FiRCtHZ1B5QXpvRC9BdnJCOUVHVUFCd0FBLzJkUE45OUIzckZ2TDE5WnI0VmYxSkNqQUtBUUs5RXg4Tmd2dkdBUG9NdXcyMkI5OEZXUC9EQVRzRzN3TEFBd1QrN1BnNi9URCtqZ01lQmpZRUFmcXQ5QnI3bmZlcCtUZjZzZmU1NzdEM2Jmdm4ra1AxLy9jai9JejdVZ1pkQ0FZSkd3V2JDVmdUWHdYYkFuNEhDd3NqQjZRSjh3WWwvYno4Zi83TUFrNEREZ1V5QWN2OUF2OG1BQjc4VWY0OUJpSUVSQUpWQW5QMTJQN05BNVg5RlArVS9ZbjVYUE9oK3p3Qk9nUEFBWS84Y2ZwaS9pVDdDdkxoK0xuN012WkM4TkQzaXZnRkFPUUR5QVRvRHBJUDVneWxCQXNJelFuS0JsMEkyd0lyKzNMMXgvZTgrUEgrRmdWUS93djg2Zk56NjMvcXJ2UFcrdDM1ZXdCYUNtWU1HUS9CRTEwVTd4VlBGQjBPM1FJOEFOY0EwLzRCQUVmNVdmMXIvWDc3SXdpUUJFMEM4UUZpQWt6K093RTkvejM5a2dBQi95UUZUUVhVQVA4QUJ2MCs5SXIwa1BPdTlSZjZjUHJXK0ZMNFhQYW85UlA0RmZjQitxUDRhL0hYN21MNU9BSnpBMlFKZXdwT0RMd1A3d3dEQ1lRRERnUzdCNFFHZVFtWENPa0JlZ09mRGJRS0xnTmFCU2dDeWdpYUQxNExrZ1ZqQWJrQlB2MXA5U0gyL3ZoeitzSHowZkd2OW4veThQS1I5di8yNFBFWjd6cnl1L2RtOW5YMDZQOGRBbVlHT2dPcC9ib0ZnUWViQnA0RkxBTUhCWk1FTGdsVERnVU1vQXY4RGFrTS9na1lDc0VNOUEycEQyb05OZ056L2REMit2bjUvbEQ1QmZaVzl6MzRGdmhtK2dYNVpmZDUvTkVBendFbkFtQUFkZjNkKzRMNjQvbDI5Vlg1aHZuWjlSMzhkQVdXRHBrS3lnUUpCY2NFQUFOdUFvMy84UHoxL1lmOXFBQlQvcXIzVC91MjlXMzNrL2tyL0duLzBQeS9BK1lFTlAwVy9hMy96d0U4QlliL3NnV2ZEamdLVFFXSkNqb0tIUWcrQlY4QzkvbDA3dUh1UC9UTS8rb0FuZjFFKzJIOG12MFFBbHdCYkFLV0NNTUQyUUtlLzQzOWx2K0ZBMThFeHYrNi9iOEFUUUlUQUxNRC93YndBQ0FEWUFxMEM0MElkd1B1QVU0S3dnWjQvbWdBSlB1YitYUDZydmkrL0FvRFB3R3MrZHYwK1BRYStCWDNWL1pXK2FMMnEvZms5My83R2Z3Rys1Zi9JZ09WQjVRT0N3NmJDMjRPbGdYSS9kTC9DZjZrL2JiOTZmMUdBQ0FFRHdXaUE4Z0J0QVJtQitmK3FBSm5COUgvUnZpdzlVcjczd0Z1QmRRREh3VlNBL2IrK2dGSUF1disxUGEzOU1MeElQZDUvaVAwYS9hdisxb0Fvd09jQUhQL2RnQjlBNm9BcmdCaEFSajhNdjVIQmZzSGx3Y2JCQndCQkFhOEM2b0pqQWRCQWJ2OU1RSVdCSklHSmdPdy9LMzY1dnFPKytYLzVBUThCdzBEZ0FDOS9hbjA2UEpLOC8veHlmZUg5bno3Ti80cCszWDhlUGtwK29QL25nZUVCV2NCQXdYQkJWSUlkd25RQy9JSmhndjhCbHNDK1FwK0NOQUNXZ1R1QXJQKzlBQTMvdHI5VnZ0Zi9Zcjl1ZnpwL2hYNUtQZ1o5c0wxRXZ1Ry9kcjlPUHpQOSsvM04vbmcrMFgvdWdCZkFoMEQ5d0RSQmlVSkt3bDVDYndLUnd2M0NORUgzd1liQmswQmNnTmJBU242N1Buci9DNy9rZjVRKzJmNEIvbDcrc3I4ZVFDa0FHYitGLy9hL3owQjVQOU8vVHovc3Y5Ti8va0JyQUp0L3BUNnl2bHkrNjM0b1BnRi90MysvdjRDQldNR2h3RURBdElCTmdnckNPd0hCQWNmQS9BRXdnYnpDcWtJR0FHWC8rWCtvUDZHL21ML2F3Q2hBUFlCWFFFRi85TDlFUU9CKzZuNGV2MUorNS82SnZ2Qi9kVDZ6ZmJsOWRQMUFmZkE5QlQ0bnZ5eEFBOEU5Z1Q2QnJjRGpRVm1CV0VDMUFKekJHVUpyZ3B0QmRvQ0J3TDRBbmIvOS92dytlVDJIdmNOL1BYK2ZmeXUrNWdBYmdhQUJMWUJ2d0g4QlU0SEtnUXovNDM4MHZoeDl1ajdyUUEzQURnQlRRR04vV1Q5U1FCZC9qLy9WQUlnQW8wQmgvODFCTlFFVkFYTkI0NEZkUVZPQWtmOVl2OTcrNy82TS9oKzlXLzdqUHgvL21RRHJBRTUveS8vOWY3akFoMEZQQVZlQVhBRjNRZkNCc0FFQUFCUy85MytYUUVyQUxyK05BQUEvZHY4VVArNi81c0JhQUZWQXpFRGVnSS9BNUFCYXdNWkI0NEZaUUtaQVlqLzUvKytBSEQ5UC9tVCtMNzJtUFhBOWE3NFhQM09BR0lBMUFPTEJwY0RpQVJ5QlBnRGd3TEgvNEQrblArMUFJMER4Z00xQlBjQi9maFo5aEw0bi95aCsyMzlWUDhJLzZEK0FmNUZBY3NBS0FFQUJHWUdIUVFWQXVFQ1hQOXAvd3IrcmY3N0FXZ0Njd0t3QVJBRVhnT21BNWdEV3YvWUFXRUJ6Z0RvL25mK3NmK1EvejhDdWY4Wi9kTCtMLzlWQVhQOXNQaGMrQlA0R2Z1Ni9TYjhZZnBUK1R6Nlkva2MvbHNFRndJU0Fua0JQUDhsL2c4QlN3VWdDS2tHSFFmOUNNY0o4QVoyQXhZRXVnRVVCVnNHRGdOYi8xejllZjFBKzlENlZ2NGIrMVg1YlBjQitOSDR5ZlJlK3JiNmt2djVBZmdGc0FUTkJWUUlKZ2kyQkp3RjlnYVhDRklGb2dNOEJpVUdMd1B5QUl3RWlnU0lBa3o5by8yNC9nTCsrUHFqK0JqNEt2Vnc5eWIzY2ZrRS9MRDUvUG5IL0MzKzUvN2IvNmtBVFFSREJ2b0hMUW5MQjY4RmZBTi9BTi85TWY5TUFBWC9jZjc0L2VZQWpnSHRBWVVCVi80Ly9nci9IdnlvL1VUL0tBT2tCV2NDcGY5US96MEN2UURBQWFzQmNBQ1gvd3o5SHZ5cC9NajlvUUd2QWs3LzdQNmMvaE1BcGdITkFSMEVuZ0FNLzRNQWZ2NVZBSzMvZmZ3eS90QUEwd0NkQUxBQVdmOUhBUVQrelB6Ty9Kb0F0d0ZwL1ZiLzJRSVdBdUFDTUFYZkFXWUV2Z1NmQWY4Q2J3UnhBckwraGY3YS9xbjlzLzZHL0d6NEVQcUcrVXI1QmZtcitJZjVKL3pnQWdJQ0pRU1NCaEVHVndjbkJxd0lJd2NuQmJVRFJnQmpBME1ERlFTaEExVUFILzVwL25IOFJQb0kvUUQ4ei8yVS9RWDlLZ0NJLzRVQ1pBRzdBaGdGRGdVaEJyWUZLUWIvQkpFRlRBQ2MvTDc4elBtditOUDVYZnNTK2Z2NGovbzYvTUQ2eFByKys1bjdudnk5KytQN3R2cU0rb3o4a3Yvdy9wVUFYZ1NZQmRjRml3WFhCYUVHc2dpeENzNExjZ202Q1gwSzl3aitCMEFFUmdGMS84ei80djZHL0p2N3lQa0Qramo3QS80Yy9hMzZuUHQ1K2dENklQemwvQ2Y5di8wTEFZOEFSL3pVKy9IK29mL1hBbElCZ1ArR0F3d0YxZ05FQTlvQjN3S2JDR2dJcHdZakJnMERCZi92K3duN3d2dWEvSno4eS8zcCs3bjhWLzUvL0s3NzRmeTQvWjM4ZGYvNy8zUC9ULzU5LzlBQnh3QUZBSDMvRXdHeEFiZi9yUDdSLzQ0Q2NBSWNBSjRCUWdOL0FpZ0NIZ002QTVmL0pQMzUvMHYvaWdEVEFhc0JUZ0prQUJ2K05mM2ovU0QraHY0RC9MUDkwUHhGL2NYK2pnQ2VBYUVBSEFRV0JPNEQxQU5qQVF2L3FmN0NBZDhDOWdPRUJpSUZiUU0zQXZ6L1JBRnMvUy8vai83WSsyNEFVZjFNL1FML3hQeXovZmo3VnY1SEFzY0J1UUl5QStZRDJnVUdCeXdHZEFaUUJSQUJnLzdSL2ZUOWx2dU4rRmIyS1Bscis5YjhyZjRGLzZEK2F2MnhBR2YvUC8wQy9TditrLzl5L2JYK2FmOWcvNHYvOS8yUy94VCtyd0dkQXJqL0dBQWdBb0VEcFFWQUI4TUU5QU1sQkw4QzZQOTRBT2NDeGYrRS9WLytmdjN3L2ViK3BBR09BMUVDUEFMRUF2VUJOd0U0QWRFQ1pnS1RBREgrbHYzU0FNd0JGd0xhQVJBQ1lRUzNBbUVBUXYvUC96TUFSZjZ6L1diOXdmeWkrOUw5dWYyVy9QbjlEUCs0L2FYNmp2eE0vOFA3V2ZxRS9WZ0FhQUJJQWRjQjVRR1ZBbVFCZWdLZEFlRUJxZ0diLytQL0MvL3JBQk1CRVFDMi9RRCtZUUN2QVpnQzZ3VGxCZWtFbGdZUUJMSUFodi95L0RYOHJQdTQvVy8vc0FCLy9nbi81Z0NQQUdvQ01RRkFBQWNDc0FGNEFIWC9VUUNwQU1qK2NmOWEveXNCTmdJQ0FjQUIvQUpDQWc0QW92K2NBQllBU3Y3Kys5VDZiUHV4L0gzOXQvM3IvOW4vL1FEU0F0OEJid0p2Qk5rRFN3T2tBdW4vNWY1Vi9UTDlPZnpLL2FiL1kvMkMvZUQrWFA5MkFPd0JUZ0EvLzl6L3ZnSk5BM29CQ3dMc0E4WUY1UVNyQWQwQUpmL3kvTWY3NmZzMC9lWDhsLzV5L2NiK1R2OEYvOHIvNFA3U0FDSUJ4d0hiL2d2K253Qk5BSUFCTXYvby9yTUJOUU40QTNnRFZBWFFCRFVGWEFVVkJSQUZmd1BWL3cvL3VmNFgvQS81VHZycy9GYjcvUHdsL1pqOHJ2c3ordTM3M1AxS0FKd0Fud0lzQXowRHZnVDRCT0lES0FQUkF4OERBd1A0QXVRQWEvOW0vL2IraFArdkFBa0NzQUh0L29mL2N3QnUva1AvaHY5cy9tVDhCdjlCQUM0QXNBQ1AvMkwvemY0REFKZi93djd3L2lQL1JmMC8vU0wvandHSkFvRUFQZ0FoQUozL2p3QUdBSnYvOXYrbC9oRUF4d0VkQW5jQ3RnSXBBUkVDd3dHdi85Zi9WZ0FPLzR6LzFRRlNBdVFCSndJSUEvd0M2d0RBL2dmLzAvL0gvMW9BVy85Yy9qTC8vZi92L2ZIOFV2NGovZUg4VlAzRi9RNEFsLzRSL1FUL29mNTNBR2dCM0FMb0FrSUJSUU5mQXlNQzBRRTVBdnNDZEFQa0FuQUNNd0w4QVh2L3hmNVBBdGNDMWdJaUF1MEFiQUI3QUlvQWJ2OFkvL0QrYi84dy8xYi9KLy9LL2gwQVF3RXQvK0wrLy81cS9mRDh4Zng0L1pmOGJQMCsvSWI4Q3YxbC9YcittUC9nQUIwQXBQL3Ivd1QvR1FEYy80My9kZ0U5QVlnQk1nRjFBR3NDY0FIS0FBd0RXZ0hKQVA0QXB3S1FBU0lBRGdIVkFWQUNJUUs0QWUwQnpBQU1BRXIvWVArakFFc0FCd0U4QVpZQk13SDFBTVgvYXY2VS9zNytEUDc0L2lRQVFBQ2JBUlFCT2dEUi8yNy92ZjdUL2gzL2p2Mk0vVFA5cHY3Ky94c0FEdjgzQVBRQUVnSExBYW9DZndFOEFMOEFCZ1BlQWtrQkhBTFZBTGIvQ1A0cC8zb0FQd0JBQUlrQWpnRTlBa2tDWHdINS80ai9Md0N4LzlIKzB2d1cvdXYvbi85di8zUCtWQUJoQWk4RGl3UFNBcUlDOGdIbkFQci8zUCsxL25qOU0vMVAvdkQrUXY4aC8zRC9mZjl2L2szK1N2MDUvb3NBSWdFOEFhZ0FEUUZ4QXFvQ2hBUFVBNEVDTGdERS83VC9SUDRRL3ZuOG1mM1kvVDM5ZC8yYi92djk1LzZlQUFnQlFBQ3EvMFVCb2dFakE1QUM1QUJPQXNVQzJ3TFVBMU1FV2dXV0JPOENoUUUwQWJ3QUx2OFovN1Avai85WkFGZ0FQUDhSLzVUOTgvelAvWUw5Yy81ay9vWDlSLzBUL1ZEK2d2NmkvemtBS3dENy90NytyZjlyLzM4QU1RRWlBR2YvN2YvR0FEVC9WUDdnLzQwQXdBQ3BBRTBBOVA4SkFZQUN4Z0lVQTFZQ2JRTFdBL0FDNUFGSEFYb0JJUUlOQWR6L0FQLy8vZXI5Zi8vNi92ZitSUDlXL3pIL1ovM20vU0QvRFFBZEFOVC9sUDQzL20vL3BmNTcvb2YrV1A3Vi9oVC94di9mLzJjQVdnRmVBYUFCOHdGckExZ0Vjd01nQko0RExRUWlCU3NFV3dOR0FTSUJHd0h5LzZILzVmNnovc2YrbGZ5Tyt3djlMZnk0L1A3OW12MHEvcWIvU2Y4UC95OEFvUUJwQURNQWZ3Q2lBSkFCWmdBK0FQUUFqd0daQTlZQ1dBUHpBZ2NDbXdGTEF0c0Nqd0huL3pUL0lQK0tBRVVCS0FEWUFCRUFaLzZnL0l2OW4vM3UvTFArbnY2bi93QUFuUUIrQVhnQmhRRnVBQVlCRHdGOUFJQUFBUUR4LzQ3L3RmK0UveEgvZGY0di8yYi9jLzhXQU9uL1BnQ0xBZmdBd2dDQkFZc0J3UUZQQUlYK2tmNFIvNy8vei8rYS9yRCt1ZjZ3L3I3L1FBQnlBbXdEWkFJTEF3OERsd0hZQUhvQXVnRGdBTlAvWGdEUkFHZ0ErditBQUhNQVN2K0svdUwra3YreS85LytPZjdtL2dYL1NnQm0vNXovNHdIY0FFRUFtLytqLzYzK2x2NGUvK2dBUkFHKy80b0EyZjlsLzNIL2IvK2gvNjcvY1A1TS9oVC80UDc4L3Q3K1N2OVlBQ1gvWC82di9vVCswLzlrQVZnQ1J3TGNBazREeGdLZEFkZ0JJUU9kQXBrQ0hnTXNBK01CeS8vaC9XbjlkUDBjL2kzKzBQeG0rMS84dWYwaS9rZ0FwZ0JNQUZzQlJ3SHJBUkFEa2dLMEFxa0NIUUtJQXZRQndRRm9BclFENXdOYUFrc0JiQUEyLzNML3QvOTEvNkwvL1A4R0FBQUFsUURKLy9QLzYvOWMvMHIvclA4RkFKb0FSd0ZiQVdVQmhBSHZBUklCTWdEWS8rYi9ZZit6L25qK1Z2NVMvcEg5Ly93RS9iYjh1dndoL2VmOW9QNWlBQllBd1AvRy83RC9Hd0hwQWNnQmtRR0xBOW9DMVFLZkEvNEJYUUdzQUlNQSsvOU1BQ2dBVUFBQkFSb0JVd0Q2LzhuL1pQOHJBQ1VBaEFEYi82Zi9yZ0NUQUVjQURnRFIvOVgvai8vYi9pRC84Zi9wLzkvL0gvOGwvbVQrVy8rMEFKVUFlZ0JNQU03K1IvOFhBRUVBNHdDc0FYUUNuQUgyQURVQkpRRnZBV3NCTkFHWC8zRCtkUURyQUJ2L2RQNU8vajcrNnY0aC9oejlhUDBaL3N2OSt2MUUvbGIrbi81YS80UUFKQUUwQU0vLzJBQVdBY01CRGdKZkFnOEQ5d0t5QWtvRGhBUFVBeElFamdTOUJBa0Uyd0xLQVNrQkNnRHIvOUgrdGYyMC9mNzlvdjRpL20zKzkvMTMvYWo5cHYwSy91ajlOUDYzL3NYL0ZnQVhBRFlBNi85TEFFY0F5Z0NNQUlrQUlBTE5Bb2NCQWdFU0FSQUNRZ0tmQVlNQjBBRVFBc1lCOGdIaUFjSUFBd0NBQUYwQWJnQndBTlQvV3Y4cS93TC9OUC9zL2pmL2gvOWNBRWNBaWY2by9wVCs4UDM4L2JEOU1mNTIvK3IvR1FENS95SUFlQUR6L3BiKzRQNC8vdzBBSndDbUFGUUJxZ0IxQUxJQVJnQWxBYTBBeVA5bEFOSC9sdjlrLzdYL05nQWlBQmdCZkFIWkFZUUI3Z0JPQVVNQThmODBBRnNBS2dIVkFYa0NQUUkxQXFzQlpnR1lBU0VDb1FHc0FIRUE5ZjhoQUhZQWZRRHEvL24vNXY4K0FLUUFaUUFqQUFjQWNBREQvL3ovOS84dS84bitIUDVjL3VIOHNQenYvSy84RC8yTC9mUDl0ZjVkLzJzQTR3QlpBTkVBNlFCdUFRY0JJd0hVQVpZQjNRR3hBYndCekFFeUFyb0N5UUlsQTlJQ0xBR1JBUkVDMndDY0FOMEErdjhtLzBYL28vNFgvNzcvL3Y0Yy92YjlGZjdhL1ovOTJQMGovMC8vTmdCWEFJRC9sLzkyLy9YL2JRQ2lBUFVBUFFFQUFmVUFLZ0VlQWZUL2YvN20vaEgvZlAvbC8wSC9BZjlILzNML3cvL2JBT0VBNUFEcEFPRUFXQUZpQVFBQ0hnSm1BajhDc0FML0Fxd0M2Z0xwQVJnQm93QUwvNUwrTy84bi93ei9ldi9TL296K0R2OWYveXNBakFCd0FHWUE2UC9LQUYwQmVBRjNBSC8venYreC83Zi9NQUNELytuK012K1gvNWYvS3Y5dy8wY0F0d0J4QUFZQkxBR3FBQ2NCUVFHZkFQTC9xZjlQLyt2LytQOXgvMzBBV2dIaUFSc0Nhd0lOQXVnQlV3SGxBRkFBUGdBaEFIdi83UDRCLzFYL2N2Ly8vdmo5ZXY1cS9wWCtXdi9sL3U3K1ZQK04velVBZ0FIaEFSUUMrd0g5QWYwQm9nRzNBZG9CalFFYUFWRUJUQUhtQURBQUpRRFQvNVQrY2Y3UC90NysyLzdzL29UK2JmN04vbjMvby8rRy94ei8yUDRLLzEvL0NBQVFBUFVBb2dHdkFvWUQwUVBmQXcwRHR3SmNBc0FCcmdEOC8rei9RUC9WL2l6K0JmNDYvZ2ordFAxdy9ZNzlBUDdLL3Y3K1N2L1QvMGtBWlFER0FHOEEydjgxQUU4QUlBRlFBYjhCYkFIZEFMUUFlUUN5QUc0QWpBQmVBRFVBY0FBdUFGQUFpQUIvQU44QUNRSHBBQVVCdGdBOEFPUC82UCtCLzdMKzNmN3Eva2ovTS8veC8ySUFZUUNzQUFrQUpBQUhBRTRBaXdCSUFDQUJYZ0dsQVRjQ1VnS2NBaDBDL3dHTEFtZ0N0d0ZMQWUwQUJRSFZBUFFBc0FDUi85di9MUURLLzFYL3NQNEUvdXY4Uy93ay9EVDg3ZnlCL2UzOUpmNDUvdS8randCR0FiUUFCd0h2QVdNQ1d3SkVBcVFDTXdOWEE1a0NFUUpXQXNJQmxRRWhBWWNBaEFCUUFBc0FzUDlkLy92K3hQN0EvaXIvVnYvWS9yWCthUDRLLzlyKzVmNTEvNXYvKy8reS80Z0E5d0FPQVU0QmN3RmxBU2dCTVFHR0FFY0E1djhkQUM0QXZ2K1AvNEgvM2YvNy8zdi9wUDY5L2h2L0YvKzIvZ3IvR2Y5cS84Ly9KUUJjQURjQWJBRFdBTzRBaVFETkFHNEJLUUxrQXUwQ0t3TWRCT01ES1FUMUE2MERvUU9KQW5NQ3dBRldBU1FCd2dBMkFIei9vdjQ3L3Y3OXR2MisvV2Y5WC8xeC9SejlWUHdHL0NIOFd2eTgvTW44di96ZS9HUDlrUDdxL2p2L1dnQ0VBUllDa2dJK0E4SUQrZ01hQlBzRG1BTmtBOEFDSlFKZkFmb0F4QUI4QUh3QVJRRFAvMDMvMy81bi9vTCtZZjZPL25YK0MvNHAvb0wrRHY5ay94QUFld0NzQU40QTNnRHhBUEFBTGdGbkFVc0JlUUhUQWVVQnZBR29BU2tCYlFGMEFTOEJvQUZXQWZBQXJBQ2hBSWNBYVFCWEFJai9LLzhXL3dUL1N2N0QvWHI5aWYyMC9ReitxUDRwLzdUL1FRRFBBQWdCMUFFR0E4a0Q3d09YQTBRREtBTzRBa3NDT2dGSUFOSC9RditSL3ZEOUZQNGQvZ2YrOGYxMC9nVC9qdjkvLzJ6L1ZBRHpBTllBUGdENi81UC9IZitML3VMOUkvNGovdDM5Ni8zSi9iSCtPZitHLzUzLzlmOVdBSWtBUVFGaUFhb0I4QUVYQWpJQ3l3RUNBckFDeXdJakFwY0JGQUVmQUo3LzEvOUFBS1FBR2dHbkFSSUMzUUc4QWFzQmRRRS9BYTRBWndBWEFOYi9oUC85L2svL1MvKzkvc2o5UWYydy9VeituUDZpL2tUL2Z2OWQvL2IvUXdDYkFEb0JKd0djQUs4QW1BQjZBUDRBT3dIekFIVUFEQURiL3dJQTZQL3IvNWYvWS84TUFQbi9jZ0NQQUpFQXpBRGlBRUFCTXdHdEFlVUJCUUpxQVlFQXBRRHlBQmtCd0FBaEFBRUFzZitMLzJ2L0QvL1Uvc3IrNFA0Ny8xYi9vUDhKQU92L0Z3QlJBQVVBNFArMy85TCtoLzRIL3dqLzB2NjIvckQrNWY1bC82Ly9Bd0JkQUxvQTd3QURBV1lCNHdGbEF1SUNid1BmQXkwRWZ3U3JCTmdFb2dROUJIb0R3QUlsQW1jQmZRQlUvMjMrWFAxMy9QNzduL3Y5K3lMOFcvejYvRDM5cWYzOS9VRCtmZjdGL2xiL0NBQktBSk1Bd0FDOEFId0FYQURjQURBQjlBRUVBcmtCcndIS0FlQUI5UUgzQVpFQmd3RTBBUTRCSmdIcEFNd0FOQURpLzRyL1RmOGgveWIvSnYvNi9qVC95ZjUyL2tmK092Nkwvc0QrK3Y1Uy8yUC9yUC9oLzczLzQvODhBTFFBR0FGREFUMEJMd0ZRQVlNQkZ3R3lBTkFBRmdINkFDb0Ixd0RrQUhJQlFRRUhBYkFBNWdBSUFjWUFud0F1QVBML2V2L3ovc1QrdXY1Qi82VC9yZjkyLzVELy9mOVlBS0lBcEFEa0FCVUJ3QUMzQU40QU1RRUFBWDRBWUFEYy81SC9ldjlkLzA3L0JQODcvN2IvRkFDdEFDZ0JMd0VIQVZVQlVBSHJBTFVBbndDREFKc0F5Z0NFQUtZQWF3QTBBQ3NBYWdEQUFMY0FuQUQxLzhqL25mK2QvMy8vZXYrVi8rLys3LzVrLzNIL1RQOTUvOHIvR1FDZ0FKVUFkUUNVQUhJQUlRQXVBSTBBRkFHdkFjWUJvUUd3QWFvQm53RmlBVkFCc3dBWEFQUC90ZjhlQURBQU13QllBRDRBQ2dEby8rWC9rdjh5L3c3L0ZmOG4vOVArc2Y3RS9yeitDZjluLzMvL3d2L0cvOFQvei8rMC94VUFLQURlQUZrQlpBRjJBWnNCdndIYUFSQUN1Z0ZlQWJ3QU9BQkdBSG9BU2dCVkFLTUFxZ0JYQU9UL2J2OEUvNXYrMHY0dC96My91djhNQUFVQW9RQU5BZWNBZ0FEay85ci9NZ0FVQUxULzVmOURBR1VBb0FETUFLWUEzUUFHQVNjQld3RVNBYUFBUUFETS8rMy83UDhBQU92L3gvODhBR2NBWWdCaEFISUFpZ0RKQUk4QWFRQnVBQ1FBbmY4Ry8vditDLzhTLzVULzZQLzQvK3ovdWYvcy8yZ0FQd0hJQVpRQlp3RVBBWHdBS1FBV0FKWC9EdjhmLys3K3V2N3QvbWYvQVFCeEFGUUFDZ0FyQUJ3QUpnQ1BBQUlCZndIOUFTVUNPZ0lLQXRzQmd3RXNBU01CclFBbkFOZi9sLzl3L3lILy8vNFcvd24vQ3YrTC8xOEFHd0c3QVNFQ0VRSnJBcHNDU2dJTUFxZ0JOd0VUQVRFQkFnR29BRElBK3YveS8rRC9XdisyL2hYK0JQNFYvdmY5M3YzWC9ReitDLzRrL2pUK1R2NkovbVArdHY1bS82Ny9EUUFYQUpVQTR3Q2NBSWtBalFDYUFNb0FLQUZOQWFnQm13SGpBVFFDSkFJTUFnUUNJZ0lWQWdrQzZRRzZBVVFCeEFDbEFGQUF3djhMLzVQK1N2NWsvdWIrdlA3Ry91NytFZjhmLzEzL3N2L2wveXdBVFFCK0FJMEFwUUFrQVhNQmN3RUxBUlFCRXdFa0FXY0JFQUVtQVRVQlFRRWxBUjhCM3dCdEFHRUFwUC8wL3JIK1R2NHAvaVArSVA0UC9oeitoUDcyL24vL1JnQ3BBRGtCbVFHbkFXY0JhUUdlQVc0QmRRR1lBYzBCYmdGWEFWTUI5QURKQUQ0QUdRQlpBQm9BeWY4NC85ais5LzdQL29QK3BmNnMvcC8rdGY2UC9yYit3LzdpL2tQL2x2OHpBSXNBOVFCekFiVUJYQUxRQWk4RFFBTXpBejBETmdNMUF4VUQyZ0tiQXB3Q0ZBSzFBVndCcXdEY0FNVUFMZ0NSLy9mK1FmNnIvWEw5L3Z4Ty9YejkvL3poL0g3OTV2MHMva3YrSy81Zy9zVCtOLzh6L3ozL2p2L0MvelFBbVFEVkFCZ0JWZ0YyQVh3QitRRjJBbjhDaEFLUkFqRUNwd0Z1QVZFQklRSGZBSjBBaUFCZEFFd0FPd0FSQURNQUxBQVNBTnYvbGYrSC81VC9ldjlLL3pML0VQOE4vLzcrS1A5WS81RC8wdjg2QUxjQTJnQXdBV2dCRFFIT0FOd0FOUUZTQVFBQjJnQ2NBRkVBU1FCWEFBSUFsZjljL3ovL2YvK0IvNWYvb1ArcC94TUFuQUMvQUdvQUVBQjUvMHYvaVArNC93VUFTQUJvQUVRQVlnQ0pBTklBRVFHckFENEE4di9QLzlQL3JQL00veWNBYlFEYUFESUJTUUYyQVpzQm53RnFBUWtCdlFCWkFORC9oUDlsL3czL0l2ODIveHovUi8rMC96b0F3d0Q4QUNvQlh3RWdBZDRBTmdEeC8rci9qLzk3LzFML1R2OXQvOWYvQ2dENy80Y0E3QUFRQVd3Qm5nSG1BZHNCeXdHK0FYMEJLd0VPQVJJQjF3QzlBSm9Bb2dDaEFJZ0FlQUFBQUdULzR2NkkvazcrQWY2MS9aUDl4LzN1L1NmK2ovN1MvZ2ovZFA4bEFPQUFZZ0cvQVNZQ2pBTFBBdUVDVWdPMkE1OERrUU1ZQTBvQzBBRTFBU2dBWlAvVy9uNytYLzRxL2l6K0NQN2ovZEw5N3YzNi9mUDlKUDQrL216K3Z2N2ovblQvTWdBY0FCa0FCQUJvQUJVQkRRSENBTVFBOXdEMEFPa0E0QURWQUo4QXhRQlRBWllCMUFIK0FVTUNVQUpGQWo0Q0d3TElBWTBCamdGTEFmY0FnQUR0LzJ6L052OEYvOGYrZ2Y1ZS9qNytQdjVaL25qKzAvNEsvekwvTnY5Ui84ci9iZ0N4QU5jQUJnRXpBWFFCUFFIdEFNY0FvQUNtQUs0QWx3Q0JBSDhBZmdDaEFMRUFCd0VhQWZRQWpRQlVBQ3dBRUFBd0FCc0FCZ0FEQUw3L1AvOFcvd3ovMC81My9nLytDLzR6L2tMK3pmNGovMlAvZWYvci8xVUFzd0JKQVpvQjlRRTBBcXNDUlFOeEExVURRZ01sQXkwREtRUGFBbjhDSkFLcEFWVUI4Z0J5QUszLzJQNUkvdG45bC8xVS9UbjlTUDA5L1V6OVV2MVEvWXo5M1AwNS9waisxUDR6LzVYLzUvK0pBQkVCblFFbUFxc0NDUU5yQTVZRHF3TzBBMjhESUFQZkFzWUNMQUpxQWVNQUxnQ3EvenYvOGY2TS9oLysxdjJtL1o3OWZmM0ovUmIrVHY1eS9xLys4UDVlLzY3LzBQOExBRk1BbEFDNkFDWUJkUUZTQVJzQitRQ2dBSGtBaEFCWkFFb0FOUUFsQURBQU9nQTdBQlFBNi84S0FDWUFOUUFwQU1IL2kvK2kvOVQvU1FDL0FCd0JTd0ZpQVVnQkp3SGRBS3dBdndDaUFMQUF1UUMvQU93QTJ3QzFBSjRBbWdDY0FLSUFmUUNvQUFNQlVBRkdBVkVCWlFFUkFjVUFSd0R0LzNYL0t2L2YvblArQS83WS9lWDk4UDBxL29qK3hQN0svaHIvTXY4ci96ai9pUDhIQUk0QTVnQUNBWFFCckFIekFXOENvd0xxQW1JRG9BT1lBNlFEcFFPVUF4NERoUUw3QVlNQjB3QU9BRzMvMWY1My9qditMUDdML1pUOWZmMVovVzM5aHYydC9lYjlTdjd3L2tQL25QOGlBSTBBbFFCbkFDZ0FBUUFBQUM0QW9RRFBBQkFCWHdHckFSY0NpUUt1QXBVQ2Z3STlBdlFCMmdGbUFkWUFyUUJUQU9qL1RQK0svaXYrM3Yyai9ZYjlsUDNEL2RMOUJQNFcvazcrNy81cy80UC93UDhKQURRQWNRQ0NBTkVBNXdEb0FBTUJDUUZ6QWNnQjBBSHdBU01DWWdKbEFnc0M5Z0VKQXI4QlZBRUxBZVVBMFFDREFFWUFSZ0JMQURnQUlnQXpBSFVBckFDVkFHNEFJd0RiLytEL3ZmOTcveTcvK2Y3Ti9vUCtKUDdLL2N2OTd2MzIvZmY5Ky8wTC9tWCtzdjQ2Ly8zL2RRRFNBQ2NCc0FFOUFwQUMvZ0tOQXhzRWtBUmdCTVVES0FPSkFyVUJBd0Z6QUI0QUFBQUtBQ1VBQkFETC84RC93LytMLzF6Lyt2Nm8vb0QrVlA1QS9saitiZjZtL2dEL1EvOVcvenovSy84OS96UC9JZjk2LzcvLzdQOFpBRHNBVndCbEFJa0EwUUQ5QURBQmxBSEdBZVFCSUFMN0Fic0Jjd0VvQVRvQm5BSGVBUllDWXdLTEFvWUNKUUpmQWJVQU9nQ2kvMFQvM1A2WS9uLytNZjR2L25UKzFmNFEvLy8rSWY5Ty8zLy9zdi9FL3lNQWh3Q2VBSThBTkFEcy83My9udjlnLzBML2RQK1kvNTMvcFArdy8zTC9aUDk1LzNEL3hQOFlBRWtBZ2dDeUFOQUE4d0FFQVNNQkpBRWNBVDhCQWdISEFNVUF5d0ROQUx3QTBBRFFBTzRBOXdEL0FBb0JBZ0hOQUljQVhBQldBQ3NBQUFEKy8vai8vdjhHQUQ4QWJ3Q3VBUE1BWVFHNEFiSUI4Z0VqQXRnQll3SC9BSWdBSmdEWC8zLy9NUC9SL2wzK0dmNEIvaFQrWS83SS9rRC9iditqLy9uL0NBQTZBSFlBYlFBcEFCUUFFd0FBQUNZQU53QkRBRXdBUkFCQUFEc0FWUUExQUJFQUpBQnJBTk1BNVFDM0FOVUFBQUVIQVJJQktnSDZBT1lBNHdEeEFPWUFrZ0JFQUFBQTBmK2IvM1QvS1Avei92LytTLytRLzZyL0JRQnRBTHdBNFFBRkFUOEJXd0U3QWZrQTNnQzNBR0FBOWYray8zei9WUDhiL3dELy9mN1QvdW4rSGY5QS8yLy9xZi9ZL3hnQVh3RE5BRElCWmdHa0FjRUIzd0VqQWxVQ0x3TGxBY2dCaFFFcUFmSUFwUUJRQU4vL3dmL0wvNVAvUy84Ni96VC9EZi85L2duL09QK0kvODcvL3Y4L0FGOEFmQUIxQUhNQWRRQ1ZBTFlBMVFBcUFXUUJzUUh2QVJVQ0J3THhBZXNCdFFGMkFRWUJkZ0FNQUtyL1RmOFAvK0wrMy83Mi9pWC9VZjh4L3gzL0gvOHEvMFAvWmY5Sy93My9PdjlWLzNiL3hmLzQvendBZWdCL0FJOEF3QUFUQVZzQmtnRy9BYlVCcEFHQUFWZ0JSd0h0QUxNQWp3Q2pBS1lBWndBUUFMTC9mLzlVLzJUL1VQOWkvMlQvZC8rYy8zdi9hLzk4LzNYL2R2KzIvKzMvKy8vMi93RUErLy9uLy9uLytmOExBQ29BSXdBbUFDOEFXZ0NEQUdzQWd3Q3NBS1FBb2dCUUFFZ0FZZ0JYQUk0QXp3RDZBQ29CVVFGa0FWVUJLUUV1QVJNQnBnQmJBRFVBTUFBL0FDY0FGd0FhQUEwQURnQXFBRW9BZWdCdkFFNEFXQUJRQUhrQWx3Q3RBTndBQ1FFUkFmd0F6d0I4QUU4QVFRQXpBQ3dBRmdBS0FPei8ydiszLzRmL2VmOUkveS8vUHY4di96di9XZjkrLzZIL3QvKzIvNkQvZi85VC8xNy9nZjlxLzVYLzVmODFBSE1Bb2dDcEFFVUErLy9QLzhqLzJmL1Qvd0VBZ3dEYUFBY0JSZ0ZIQVVJQkNRSGtBUFlBQVFFS0FRa0JGUUg4QU5ZQXd3REJBTllBNEFEWEFQSUFId0ZEQVdFQlhnRm1BWFFCWndFMEFld0FxUUJ0QUVzQUtnRHovNHYvSC8vZC9wYithUDVxL283K3NmN2MvaDcvUC85Ui8xbi9VUDl2LzVuL3lQL3AvL3ovOGY4T0FFOEFpUURsQUNnQlVBRm9BVkVCK1FDYkFFNEFFQUQ3L3dFQTgvLzAvd2NBTHdCQkFEMEFRQUJrQUlZQWdRQ2RBSjRBZ3dCYUFDc0E3Ly9ZL3dZQUN3QlhBTjhBSmdFaEFmZ0E3UUR4QU80QTZBRExBSkVBWHdBWEFQci9CZ0Q2Ly9IL0JBQWVBRThBZVFCeEFFTUErUC9vLzhUL3dmL2gvL1AvK3Yvci94SUFGZ0FOQUJJQSsvL3AvKy8vQXdBM0FLWUF6Z0N5QUtrQW1nQjJBR1VBVUFCQUFEOEFYZ0NiQU1zQUV3RmFBWElCWlFFVkFad0FJUUNpL3o3L0lmOHYveDMvQ1A4RS95Zi9YLytTLzh6L0tRQmhBSDBBandDMEFOc0E4UUFaQVZzQlZnRUdBZXNBeWdEREFNTUFnUUEzQVBML3ovK2UvM3Yva2YraC82WC9zdi9YLy9yL0NnQU1BQzRBT1FBOEFGc0FoQUMwQU5BQUNBRk1BV0lCandHMUFaRUJTQUVKQWVJQXNnQm1BQU1BdVArSS80WC9mdjlxLzJML2F2OVAveDMvQi84YS95di9OLzhoL3pML1dmOVcvMzMvbHYrVy8zLy9uZi9sL3pBQW9BQURBVTBCaFFHMkFkVUIzZ0c0QVpvQmx3R1lBWWtCV2dFN0FlY0FsQUJiQUJRQSsvL2kvOC8vMS8vaC94d0FjQUMxQU93QS9RRHRBS29BY2dBWUFLNy9iZjh6Ly9qK3R2NlgvbS8rVGY0OS9sSCtrUDdsL2t6L292LzcvM3dBQVFGVkFYTUJpd0dSQVdzQllnRmlBWDhCb2dHdEFiWUJsd0dQQVc0QklnSDFBTDBBalFDR0FHa0FYQUJ4QUZjQUJRREIvM0gvWWYrTC83Ny9MQUJtQUU0QUVBRFcvN3YvcHYrYy80VC9YZjg0Ly9YKzB2N3AvZ2IvRVA4ZS8wZi9pLy9XLzB3QXp3QVNBVmdCYWdGbUFZVUJqQUZxQVQwQkdnSGtBSzhBZkFDR0FJTUFRd0FmQUN3QVhBQmNBSDRBa3dDYUFNc0EvUUFLQWR3QXZ3Q3BBSGNBUlFBRUFPSC94ditpLzdEL3IvK3UvNzMvcy8rUi8yci9lZjk2LzdQLzhmL28vK3ovOXYvNi93WUFGZ0FmQUZjQWt3RFRBUEFBM3dEZEFLb0Fnd0J3QUhFQWNRQmRBR3dBZVFDTUFJRUFWUUJoQUcwQWZnQitBRWNBL2YvVi85RC94UC9ULy9ELzdQL0gvNWIvZC85Vy95Yi9DdjhlL3ovL1RQKzUveThBT3dBa0FBMEFOQUNZQU53QS9RQWhBUW9COUFBSUFVc0J0d0c4QWJVQjF3SHJBZUlCcndHSUFYMEJSUUVLQWNRQWN3QkpBQndBRlFEWS80My9SZjhTL3hIL0tQOUYveTMvRFAvdC91citBUDh4L3piL0t2ODAvMHovYWY5OS81My95Zi96L3lZQVRnQmxBSXdBc2dEa0FBNEJVUUdEQWNNQkZBSkZBbVVDYUFKRUF2TUJpZ0VuQWVRQWZnQTFBQW9BNy8vcS8rTC8zLys5LzNyL2EvOVMvMTMvaC8rMi84ci81UC80Ly92L0FBQUFBUGovenYrcS81RC9mLzk3LzQvL3VmKzUvN3IvM2YvMi94TUFNQUJVQUk4QTV3QlNBWlFCbFFHSkFYVUJoZ0dVQVpJQnJ3R3VBWG9CaWdIRUFkc0IwUUdTQVZJQjZBQmhBUFAva2Y4MC8rWCsxZjdnL3ZUK0NmL3QvcnorcmY2cS9yZit3djZzL3FUK3FmN1AvZ2IvTy85cy80SC9sUCsrL3hFQVdnQndBSXdBeWdENEFBZ0JKd0U4QVY4Qm5nSHRBU01DTFFJd0F1TUJxd0Z3QVFNQmt3QWFBTGovaHY5aC95Ly9LdjgwLzBUL1NmOHcvMEQvVWYrSy8vai9jQUM1QU5NQTFBRFZBTjRBQUFFckFXRUJrZ0hkQVNVQ1ZnSjFBbUVDUHdJa0FpVUM5Z0dHQWZFQWlRQXNBUFAvM1ArWi8xVC8vdjZUL2tEK0FQN1UvYm45cHYydS9iWDl5UDBWL2wzK2d2NmwvdG4rTi85MS83Ly9DZ0JEQUtvQStnQU5BU2tCUUFFeUFUQUJLQUZPQVprQjh3RlVBbklDZVFKaUFpa0M5Z0c4QVp3QlJnSHRBS01BZ3dCWkFDY0FGUUR4LzcvL2Z2OWwvMnovWmY5bC8wVC9NZjlTLzAvL1JmOVQvMlQvbC8rLy83UC9qdjlSLzBQL0xmOFIveEQvR2Y4Ky8xRC9kUCtpLzdYLzVmOHBBSDhBNlFCWkFiMEI2QUVNQWhZQzhBSEJBWnNCaVFHTEFYd0JYUUZIQVNvQjlBQ3NBR1FBTHdEay83bi94Ly95L3pNQVBnQXFBQTBBMS8rUC8wdi9KdjhNL3dUL0MvOGUvMDMvZWYray83ai9KQUNtQU5BQTNnQVBBWElCMmdFRkF1MEJ6QUdyQVg4QlZBRWZBZWNBeXdDcEFJWUFYQUFyQU9yL25QOWMveFQvNHY3SS9yNyt3LzdVL3M3K3pmN3gvZ0QvTFA5bi83di9EZ0E2QUhFQXVnQVNBVnNCaHdGM0FYUUJhQUU4QWZvQXZRQ0pBR0VBV2dCMkFIZ0FVQUJUQUZnQUxRQVRBQXNBN2YvTy83Zi9ydi9ELyt6L0NBQVVBTzMvKy84MkFFVUFNd0FmQUFNQSt2OGVBRmdBeFFBU0FUVUJaZ0ZuQVZzQlF3RVNBZWtBc3dDQUFGUUFOZ0FiQVB6L0pRQkRBSGNBendEaUFQNEE3d0RvQVBVQTZ3RGpBT1VBNUFEakFMSUFYQUFNQUp6L1JQOGkveEwvQmY4di95Ly9Edi8vL3Y3K0VmLzgvdmIrRVA5QS80ci95UDhXQUlzQTFBRGdBTTRBeEFDekFKY0F2Z0RCQUxVQW93QjNBRkVBTHdBT0FNWC9odjlWLzJQL3B2LysvemdBY2dDcEFNTUF3Z0RRQU0wQWVRQllBRkFBU0FCL0FPOEFUUUZ3QVdnQk53RWNBUzhCTXdFVkFja0Fkd0FsQU5UL3J2K04vM0gvWVA4Ky96TC9PZjg3LzFML1cvOWEvMkwvY2YrZi8vTC9SQUI3QUk0QXFRRE5BTklBMEFESEFNUUEzZ0RjQUxFQWdBQlVBRG9BRlFBQUFBQUFFQUFmQUMwQU9nQThBQkVBNVAvRy81Zi9pditpLzhQL3dmL1MvL3YvQUFBcUFIY0FxZ0RGQUxNQXRRQzFBTU1BQmdGTUFhRUIzUUg1QWVnQmZ3RUFBWUlBSndBR0FQTC84djhFQUMwQVJRQk9BRTBBUUFBNUFEd0FPZ0FuQUI4QU13QTdBRFVBS0FBekFFc0FUUUF5QVB6L3h2L0MvOHYvdFArdy81bi9sUC9FLzczL3JmK1cvM1QvVS85RS8zSC9rdi9DL3dBQUZ3QmtBTFFBNXdCQ0FZTUJqQUdJQVdvQlF3RXlBUklCMkFDOUFKb0FhZ0JaQUdVQWJnQldBRlFBZndDWEFISUFOUUFBQU5yLzMvL3ovK0wvMVAvZy93RUFCZ0FNQUNJQUVRRHcvLzcvSVFCQUFFNEFPQUFYQU9iL3ZmK2QvNUgveWY4S0FDSUFOd0IzQUxVQTZRRHRBTHNBbUFDaUFKY0Fmd0J1QUN3QTh2L2YvOG4vdnYvQy84di8yLy9vLytyLyt2OFNBQzRBVVFCUEFFWUFVQUJLQUcwQW5BRFNBQnNCV0FHdUFlTUI5QUVlQWkwQzJ3RldBY3dBYkFBakFNWC9XLy85L3F2K2kvNlkvcXoreC80RS8xYi9xdi96L3lrQVdnQlhBRHdBV2dCNkFMSUE0Z0RzQVA0QUVBRWpBUzhCT3dGQUFRRUJ4QUNaQUdzQVB3QTZBREFBQXdEWS84bi8rZjhEQU96L3ovL1QvK2ovNWY4QUFDb0FOd0FuQUJjQS92L2gvNzcvMVAvZy8rSC9CZ0FiQUJFQS92LysvL2YvN2YvaC85VC8wUC9LLzlqL0VRQW1BQ2tBVlFCMUFLUUExd0RpQU9ZQTVBRHBBTzRBK1FBWEFTRUJLZ0VpQVFFQnVnQmFBRG9BSndBbEFEQUFKZ0FGQU1EL2JQOEwvN3orb2Y3TS9nci9UUCtmLzlQL0VnQTlBRmtBYlFCeUFITUFaZ0IrQUtvQXZ3RE1BT3NBd2dDaEFKd0FyZ0FGQVZBQlVBRU5BZVFBdmdDbEFLd0FpUUJoQUVRQUxRQUJBT0gvei8vRC84RC9wZit6Ly83L0lnQVRBQUVBQ1FBY0FCY0FQZ0MxQUZNQjB3RkpBbndDZVFKbUF2MEJmZ0VFQVlnQUhBREcvM2YvTnYvKy90aiswLzdpL3ZQKzYvN3Mvdi8rRmY4Zi96UC9XZitVLzh2LzgvOE1BQ0lBS2dBR0FQZi9EQUFwQUVjQWVnQzZBT3dBS3dGYkFVWUI4UUNiQUdVQVNnQTRBRVFBWUFCOEFLQUFzUUN2QUk4QWhnQ2VBSk1BYndCRUFEMEFOZ0FuQURJQUxBQWlBRDBBWVFCbUFHOEFsUUM2QUx3QXJ3QzBBTEFBbndDTUFIY0FLZ0RoLzhmL3FmK0wvMnIvYWY5ei81Yi94UC95L3hzQUx3QTZBQ1VBS0FBaEFCa0FFd0RvLzhIL3h2OEhBRElBT0FCNEFNWUFCd0VyQVNrQlNRRnpBWVlCVVFFd0FTSUI4d0RZQVBrQUhnRWxBUlVCQ1FINkFNSUFpUUI0QUdjQU9nQUxBTlQvdi8rdi8zMy9XdjhsLytMK252NWYvaS8rUi81ZS9uUCtrLzYzL3VQK0ZmOWgvNm4vQndDTUFPTUEvUUR6QU9JQTZRRDJBQ2tCWlFHYkFib0I0d0VEQXZvQjlnRURBaWtDUFFJMUFoVUN6QUdzQVl3QlNnSDlBSzRBV0FEMC83bi9sLytNLzR6L2pmK0UvMmIvTnY4Ry85dit1ZjZUL21EK1ZmNVQvblArdVA3di9pai9kUC9iLzJJQXBnREZBUFFBQUFIOEFBQUJDd0VxQVVFQk93RXlBU2NCRUFIZUFKb0FSQUFHQU9yL3l2K3kvOWIvNFAveC94MEFSQUJIQUZVQVlnQlJBRm9BVHdCVkFINEFuQUM3QU40QUJBRktBV2NCZkFHUEFXNEJPd0gwQUprQVlnQTdBUFQvbS85Yi96ei9GLzhDLy9mK0FQLzEvdXYrSGY5QS8ySC9oditlLzhULysvODVBSVFBclFDUEFIZ0Fjd0NMQUxJQThnQUpBZU1BeVFEQ0FNd0EwZ0QzQUNzQkt3RVZBUkVCRndFVkFmOEEwd0NNQUU0QU1nQWZBQWNBM1AvQS82ei9sZitVLzQvL3FmKzcvNmova1ArSS81bi9wZit4Lzc3LzJmLzMvL24vMXYreC84VC8rZjg1QUc4QWtnQy9BUDBBR1FFcEFTSUI0UURKQUxjQWx3Q0VBR2dBU1FBMEFEZ0FQUUJFQUVvQVJ3QlRBRlVBVGdCTUFGNEFYUUJYQURvQUd3RDYvODcvdi8rZi8zei9iUDkyLzM3L2YvK2gvK0QvT0FCOEFLTUEzZ0RvQU5VQStRQWhBVHdCUkFFY0Flc0F0Z0I5QUV3QVBBQXRBQnNBSHdBd0FFZ0FRQUJHQUhFQWNBQi9BTG9BdFFCN0FFb0FNd0FoQUFRQTBQK2ovNEwvZC85Ky80UC9tZitqLzdQL3l2L1kvd1lBT3dDTUFPRUFLd0ZBQVE0QjdRRHhBT2tBcEFCMkFJWUFsQUNDQUZjQUZBRDAvK24vOGYvVi83Yi90dis2L3dNQWFBQ2VBTTRBN1FEOUFBUUIrQUFBQVJFQkV3SDJBTUlBaHdCRUFBY0EvUC9iLzdML2d2OU8vMTcvZWY5Ni8zei9uLy9VL3dFQUZ3QW9BRXdBUlFBZEFQZi8ydi9jLzlqL3ovL2Evd0VBVlFDZ0FOc0FBd0U3QVRJQi9BRGNBSzRBZ1FCNUFKSUFrQUJYQUFrQTZ2L2cvK2YvNlAvaS8vZi9HQUFtQUNVQUtBQW1BREFBUmdCZEFKRUExZ0FSQVNJQkFnSEdBSWNBVVFBbkFBWUE2UC9MLzhiLzR2Lzcvd1FBOWY4SkFEa0FSQUJxQUpFQXVRRDZBQk1CQ3dIa0FLMEFqd0IzQUhBQVlnQlRBRU1BRkFBQUFCRUFId0FXQUJJQUdRQXZBRllBV2dCV0FHUUFUd0JSQUdRQVV3QjdBTE1BeVFER0FMUUFqd0E1QU92L3YvK3QvNXovbS8rdi83RC9yZitWLzVEL24vK2svN24vNmY4bEFDY0FDUUFIQUNRQU9nQktBR0lBU1FBWkFDTUFPZ0JSQUdBQWNRQjlBSFVBZ1FDTkFHb0FTQUJHQUNrQUd3QVpBQkVBRndBZkFFQUFXUUJhQUY0QVZ3QkRBRThBZ3dDakFKNEFnQUJOQUFJQXovK3ovNkwvc2YrMy85TC85LzhlQUY4QXJnRDhBRmNCdHdIUUFjNEJwUUZFQWVBQXFBQjRBRjRBWkFCYkFGY0FYZ0NRQU04QUJBRUhBZFlBcEFCbkFGMEFXZ0EzQUJZQTgvL1AvN24vcmYrTC8zUC9UZjlBL3o3L1cvOXkvNEQvZnY5OC8zLy9vUC9mLytULzRmL1ovOTMvOGY4WkFGOEFqd0MyQU1ZQXBRQ0VBSFlBWlFCWUFHY0FjZ0NBQUp3QXBnQ0lBSEVBaWdDMkFMc0FpQUJXQUJzQTR2K3gvNGYvZlArTS83Ny80LzhEQUR3QWhBQ2pBTDRBMXdER0FNRUE1Z0FQQVNBQkhnRVFBZmNBMWdDckFJd0FmZ0NEQUpVQWtBQnpBRjBBVlFCWUFFd0FDd0RTLzdyLzFmL3Yvd0FBRVFBSUFBNEFGQUFRQUNNQVB3QkpBRXdBUUFBdUFDb0FPQUF2QUI4QUVRQU5BQTRBQlFENi8rSC8wUCs2LzV6L25mK24vN1QvMi84RUFESUFYd0NyQVBZQUl3RWNBUUlCNHdEY0FPNEE0QURlQU5NQXVnQ1RBRThBRXdEcS85TC95UC9ELzhQL3V2L1cvOWovei8vMC94WUFXQUJyQUg0QW5nQ0JBSHNBZ1FDSkFKNEFyQUNxQUpjQWJnQTlBQ0VBR2dBUkFBY0FHUUE1QUZvQWFRQnJBRzRBY3dCcUFFRUFBd0RQLzdEL3F2L0cvK1gvQ3dBM0FFa0FYUUJoQUZBQVN3QmtBRjBBS2dBVUFQNy80Ly95L3hRQUt3QXJBQ2dBR0FBS0FQSC80djhEQUFvQStmLzYveWdBZXdETUFQd0FHZ0U5QVN3QkNBSGJBTUFBMWdEakFBRUJGQUVMQWRvQW9RQ0VBRTRBRndEcy84WC9uLytFLzJmL1hmOWsvM3Iva2Yrbi85WC9Hd0JtQUtnQUFBRkdBV1FCbHdHa0FZWUJaQUZOQVVBQkdRSHdBTnNBcndCeEFEMEFDUURQLzU3L2ZQOXkvMXYvTFA4Qy8vLytJUDh6LzAzL1h2OXYvNC8vb3YrZS82Ly94UC9aL3dFQVB3QnFBSWNBdkFEMEFEZ0JTQUZSQVZBQk9BRWxBUU1CNHdDWEFEb0FBZ0FBQVBuLzBQK3cvNWYvbVArWi81TC9rZitiLzdqL3ovLzUvenNBa2dEWUFPOEErZ0FrQVU0QmFBRlZBUllCMndDUkFFUUFHd0Q5Ly9iL0FBQVJBQnNBQWdEbC85Yi93ZitxLzVYL2YvOXkvNHovbmYrZC83bi85Zjg0QUhnQXVRRFJBTzRBRFFFMkFUd0JOZ0VzQVFzQjhRRE5BTWtBekFDeUFKUUFmd0I3QUhNQWFRQitBSU1BY1FDTkFLQUFtZ0NkQUtBQW5RQjlBRVVBQlFDMy8zZi9RZjhmL3czL0R2OGUvekwvVmYrVi8rMy9GZ0JaQUk4QXBnQzVBTW9BOVFBYkFVUUJWQUUzQWY0QXpnRGNBTnNBcWdCdUFDY0EvZi9GLzViL2UvOXgvNGYvcVArNi84ai8yLy9WLzgvL3h2L1QvdzBBTGdCcUFKRUFhZ0JZQUZnQVhRQnNBSE1BbUFDK0FMQUFvZ0NnQUtrQW1nQnlBRW9BSFFEMi84ci93Zi9VLytmLzdQOENBQ1FBUXdCbkFJa0FqQUI1QUV3QUJ3RHcvdzRBT2dCNUFLd0F2UURRQU9RQTZ3RHlBT0FBdFFDZkFJWUFjZ0NBQUpVQXFnREVBTk1BeWdDZ0FJTUFnZ0NSQUs0QXF3QjhBRWdBTHdBUUFObi91UCtvLzV6L21mK1YvNC8vYXY5SS8wdi9iZitLLzViL2hQOWwvMC8vV1A5Ly83WC9BQUFpQURjQVZnQi9BS3NBMGdBWEFXSUJtQUc3QWVBQjR3SHpBZjRCekFHRkFTTUIxUUNjQUZ3QUpBQUNBT2Ivdi8raC81ai9sZitoLzhILzRmOFJBQzhBTEFBbUFCVUE5di9tLzlQL24vK0UvM3IvWWY5WS8xVC9WUDlVLzNIL3N2OEFBRHNBZGdDbEFNVUE2UUR1QU5jQXZBQ2NBSk1Bb1FDOUFBc0JPQUZHQVZJQlZRRk5BVTBCUlFFUUFkSUFtQUJoQUNnQTdQKzUvNHovZGY5Zi8wZi9VLzlTLzB6L1BmOGQvLy8rNHY3dC9nei9KdjlKLzJ2L21mL1cveU1BYlFESEFDZ0JiZ0c1QWZBQkJnSWVBakVDU0FJeEFoOENEQUxDQVY0Qjh3Q2dBSU1BZ2dDTUFKUUFjZ0JMQUJnQTAvOTkvemIvOFA2cC9vVCtoZjZNL3B2K3d2NEcvMXIvby8vYy93Z0FLZ0JNQUg0QXFRQ2tBSWNBbFFEREFPWUFBd0gxQU9VQTNnRE5BTVVBeFFEVUFPUUExZ0RCQU1jQXV3Q0xBRUFBOGYrMi80My9lLzl6LzMzL2dmK08vN1AvMHYvVi85ei80UC9oLysvLzgvLzEvL0gvQVFBb0FFUUFaZ0I5QUlvQWtRQ2FBS29BNWdBbUFWRUJld0dLQVpnQm1BR0dBWVFCaEFGbUFTUUJ6Z0JoQUFJQXV2OTcvMHYvSmY4Si8raiszdjcxL2h2L092OWQvNW4veGYvNS96a0FVd0JzQUhjQWNBQjVBSDBBZUFDUEFLb0F2Z0RGQU9zQUd3RWJBZU1BdlFDMkFKTUFjUUJMQUI0QTMvK04vMUwvVFA5Yi80Ny91Ly9aL3cwQUpRQXRBRFFBSFFBQkFQci8vZi83L3dBQUZ3QWpBQ2NBTWdBNEFFMEFUZ0EyQUN3QUlRQXRBRUVBTGdBWkFCQUFId0FhQUF3QU5nQnJBS1FBMmdBRkFTc0JMZ0V1QVNFQkFnRUhBZXdBd1FDUkFHSUFSQUFjQUFRQUJ3QVZBQ1VBS0FBd0FGWUFqUURMQUFjQkRnSGxBT1FBN1FEdkFOb0FwQUJZQUJrQTNmK0cvemovQVAvZS90SCsyLzd0L2duL0hmOHAvMG4vYnYrWC84Yi8rLzg5QUhrQXNnRE9BT0VBNlFEc0FQRUE5Z0FCQWZjQTlnRG5BTjhBMUFERUFMSUFvd0NjQUxjQTFnRGhBTkFBbFFCYkFDRUEvUC8xL3dNQUVBQVFBQmtBR3dBbkFCOEFKd0JPQUdVQVdnQk9BRmtBYVFDT0FKa0FrQUNUQUprQXJ3RERBTE1BaVFCbEFENEFLQUFYQUNjQVVRQkpBRDhBS2dENS84ci9udjkrLzFuL1NmOVQvMkwvZWY5Mi8zRC9nUCt1Ly9ML0tBQlhBR3dBZndDY0FKb0FtQUMxQUxRQW1RQ0tBSDRBYXdBOUFBRUE4UC9uLzhYL3J2K2QvNUQvZGY5WS8wMy9hditpLytQL0x3QnlBTDBBL0FBa0FWQUJnUUd2QWNvQjF3SFFBY1FCc2dHUkFYSUJWd0VsQWUwQXNnQitBRlFBT0FCRkFFMEFOd0FmQVBUL3BQOXEvenovRy84Vi93My9CLzhaL3ozL1d2OTMvNHYvbC8rcS84ai84LzhOQURvQWt3RHNBQThCR1FFT0FmQUEzUURTQU5nQTJnRGVBT0VBMUFEY0FPd0E1UURSQUpjQVp3QkhBRTRBY1FCM0FINEFiZ0JhQUVBQUZnRGwvK24vSFFBYUFCUUFKd0E5QUVnQU9nQXBBQXdBOVAvbi8vUC8zUCt2LzVmL2UvOWUvMC8vVGY5Uy8yMy9odisrLy9mL0tBQmxBSnNBc1FDbUFLMEFxd0N1QU1RQTB3RGNBTk1BMHdEZ0FNc0Fud0I2QUdJQU13QU1BT1QvcVA5Mi8wbi9KLzhiL3pQL1hmK2UvOS8vSEFCT0FIMEEzZ0JFQVlZQm53R3VBYWtCaUFGYkFSd0I2d0M2QUhFQUxBRHgvOXovOHY4RkFCWUFEQUQ0Ly9ULytmL28vK0wvOS8veS8vWC9Hd0JGQUYwQWJnQjNBSGtBaXdDYUFKb0FqQUJtQURrQUF3RFAvOFgvMWYvei94RUFDZ0FaQUVBQVpBQnhBSVlBc1FEaUFQZ0E1UURSQU1NQXBRQitBR1FBWmdCekFIb0Fmd0NKQUpBQW1nQzVBTEVBY0FBNkFEQUFLd0FIQU9yLzIvKzcvNVAvZHY5ei8zZi9nUCtjLzZYL3JQL1Mvd3dBVndDSEFKY0Fxd0M1QUxVQXNBQ1FBRThBSHdEMy85VC94Zi9CLzZML2hmOXovMkwvV3Y5WS8zYi9wZi9hL3lzQWZRREpBUDhBTGdGaEFZZ0JpQUY1QVY4Qk93RS9BVkVCVndGYUFUTUIrQURYQUxNQWh3Qm1BRk1BR2dENS8rai94UCtULzREL2wvK04vM1QvWlA5SC95Ly9MUDgzLzBYL1lQK08vOEwvNS84R0FDTUFSUUJlQUlRQXBnQ2tBS3dBamdCbUFHc0FvZ0QyQUVRQmpBR3VBYjhCcWdGL0FVZ0JJUUVHQWM4QWdBQTlBQjRBQmdENC85bi96UCs5LzUzL2wvK2cvNkgvbmYrNi8rVC9FZ0E4QUVzQVN3QmtBSWNBaXdDS0FKZ0FoZ0NEQUkwQW5BQ3NBSlVBZGdCbUFGZ0FNZ0FYQUFjQUN3QVFBQ0lBTHdBbkFDVUFOZ0E5QURBQUxRQW1BQ3NBTFFBckFCb0E3Ly9RLzZQL2hmK0IvNGYvay8ray84SC92LysrLzlYL3ovL1cvd2NBVGdDY0FOQUE2UUFEQVEwQi9RRHNBTUVBa2dCZUFDb0FBd0R0LytML3lQL1YveE1BV0FDZEFOVUE3UUR1QVBZQUFRRVBBUjhCQmdIWEFKQUFZUUJvQUk4QXF3Q3NBSzhBbmdDRUFJQUFkZ0JaQUZVQVd3QjNBSVlBaHdDUkFKRUFod0JpQUVvQUp3RHovOGIvcVA5Ly8yUC9XLzlXLzNQL2kvK1AvNUwvbnYvQS8vdi9TQUIrQUt3QXZRQ3hBS3dBa0FDTEFKSUFuQUNmQUlBQWl3Q3RBS2tBZXdCREFCSUE0ZisyLzRmL1cvOHkveDcvRFAvOS9nbi9NLzlxLzUvLzUvOHpBSDBBc2dET0FPWUFCUUVjQVQ4QldRRjRBYWdCdndIZkFRNENGUUxxQWM0QnJBRldBUW9Cd1FCNEFFd0FHZ0RQLzVYL1cvOHcveTMvSGY4SC8vZisyLzdLL3N6KzN2NEMveWIvUlA5ZC8yYi9jUDl6LzViLzFQOG9BSUlBMVFBZUFVVUJrUUh1QVRFQ1pRSnJBbE1DTUFJQ0F0Y0J0UUdGQVUwQi9BQ1FBRE1BQWdEOC8vSC8yZi9FLzZUL2J2OUgvekgvTlA5TS8xLy9ZUDllLzNIL2YvK0YvNUgvbVArZy82Ny95di8wL3lrQWFRQ1ZBSzBBd0FETkFPQUEzQURTQU5FQTFnRG1BTzhBOGdEdEFOY0FwUUNBQUZzQUxRQU5BUGIvK2Yvdy84Zi9uditLLzR2L2pmK2gvOVQvKy84TkFBc0FDd0FwQUUwQWN3Q2VBS2tBcUFDaEFMSUF3QUN0QUtBQWxBQnNBRW9BUHdBdkFCY0FFZ0FsQURBQU9RQThBRDhBUEFBMEFEMEFTQUJUQUhFQWl3Q0pBRjhBUndCQkFEY0FHZ0Q4LytyLzZmL3ovd01BSkFBc0FESUFQd0JBQURBQUVRRHkvOUgvd1AvTS8rRC9BQUFYQUEwQS9mL2svODcvMGYvMS95WUFXZ0IrQUpvQXZ3RFRBT2tBR0FGSEFXc0Jtd0dtQVlzQmtBR0ZBV2NCUHdFR0FjSUFhUUFPQU1EL2YvOC8veFgvQXYvZy9zaisxUDdmL3ZuK0RQOFMveHIvTXY5ci80Ly91Ly84L3pJQVRnQnVBSTRBbmdDL0FNd0F0d0NrQUtVQXJ3RE5BQU1CTEFGWEFXc0JjQUZqQVRrQkJ3SGVBTTBBbndCOEFHd0FXQUJCQUNZQS9QL1IvN24vdHYrOS83WC9zLy9CLzkvLzdmLzMveE1BS0FBMEFDNEFJUUFtQUN3QUl3QVdBQjRBT3dCS0FGa0FWQUJCQUVFQU53QTNBRFlBSlFBTkFQMy9CUUF5QUZFQWJRQ0NBSG9BYVFCdEFJNEFwUUM3QU5BQTZ3QVlBVElCUkFGSUFUc0JId0g2QU84QTN3REJBSHNBTHdBTUFOVC9qLzlUL3lmL0dQOFgveUwvTXY4dC96TC9OUDh2L3luL1BQOWUvNHYvdC8vbC8wTUF0UUFsQVg4QjRnRkhBbkFDWWdKSEFnNEMwUUdVQVZVQkVnSGpBTElBZHdBOUFBSUE3UC9nLzh6L3dQK28vNUwvZ3Y5OC8zZi9mZitGLzMvL2EvOVUvMmIvaC8rai84Zi95Ly9ELzhuL3kvL0EvOFgvNVAvci8rei9EZ0F1QUVNQWJnQ1BBTGtBN1FBWkFVVUJjQUdjQVprQmV3RlJBU01CK2dEbUFOTUF0QUNUQUdzQVR3QXJBQU1BMnYrbi80TC9WdjhpLy9iKzBmN0cvdFArNlA0Ty95My9VZitFLzdyL0FBQkFBSGtBcWdESEFBSUJNZ0Z2QVprQm53RzJBYnNCc2dHSUFXRUJOZ0gyQUxjQWpnQm5BRG9BRUFEaC83Zi9oZjluLzEvL1QvOVEvMXYvWnYrQS82UC95di8wL3hJQUtnQTFBRHdBV0FCeUFINEFmQUJwQUY0QVlRQm1BR1VBWndCbUFGd0FiUUNFQUlFQWRRQmVBRllBYmdDUUFMQUF5UURCQUpnQWNBQlBBQ2NBQkFEeC84Ly9uditELzVIL24vKzcvL2IvTmdDQkFOWUFFd0ZDQVdZQmRRRnNBV1lCV1FGS0FUSUJGd0h6QU1rQWtBQkpBQWNBdGY5MS8xSC9PdjhqL3hYL0R2OEkvd0QvOXY3aS9zLys3ZjRML3g3L1JQOSsvN1AvM2Y4cEFINEE1UUJJQVpnQjZ3RUpBaFlDTmdJL0FqRUMvQUhIQVpjQlVnSCtBTGNBblFDTUFGb0FIUURsLzdYL2ZQOVkvMDcvUVA5TS8wei9RLzlEL3piL0hmOE0veDMvSmY4di8xSC9hZitELzZ6LzB2L3Avd3NBVGdDckFBa0JVUUdjQWR3QkhBSkNBa3NDVkFJOUFoVUMxQUdSQVZRQklRSHZBTElBY0FBc0FBQUEzZi9HLzdmL252K0MvMnIvUFA4Ti8rNysxdjdIL3N2KzRQNEsveC8vTlA5Vy8zZi9wZi9jL3dRQUVnQXBBRllBZ0FDekFPOEFKUUZaQVcwQlRRRXhBUkFCQUFINUFNOEFtd0NLQUhZQVZRQXpBQ2NBRWdEeC8rWC8wdi9HLzhUL3RQK2ovNW4vbVArWC82UC92Zi9XLy9YL0pnQmlBRzRBVmdCUkFHd0FlQUJ2QUlFQXFRRFBBTnNBNFFEdkFBNEJPUUZMQVVJQktnRUdBZDBBMFFEZ0FNOEFvd0NDQUZZQUtRQUtBT24venYrdi81Ly9wZitkLzU3L25mK3ovK3YvTGdCZ0FHa0Fid0J2QUhrQWd3QjRBRzhBWlFCSEFCUUEyLytrLzQ3L2t2K0MvM1gvZC85Ky81VC9tLyt6LzlILy9mOUpBSU1BblFDeEFONEFBd0VEQWQwQXlRREFBTk1BN3dEaEFMd0FqUUJkQURvQUtnQXdBQzRBTmdCYkFITUFmUUNBQUpBQXNnRGhBUGNBNlFETkFLZ0FpQUI0QUlvQWx3Q1FBSmdBb0FDYkFJWUFmQUNIQUpFQWdBQmFBRFVBSVFBRkFPUC90LytELzFyL012OE4vd0wvRmY4di96Ny9SUDlCLzFEL2IvK2QvOG4vNy84dUFJTUE0Z0FqQVdRQm1RR1ZBWG9CVndFNEFRb0Iwd0NYQUZjQUpBRDQvOHIvcnYrdC82VC9uUCtTLzVUL3VmL2Mvd2dBUFFCa0FJa0FzUURWQUFFQkJRSGlBSzRBZlFCeUFHQUFUZ0JBQURzQU53QWlBQlVBQmdBUkFDWUFKQUF5QUUwQVlRQnNBR1VBV3dCVEFGNEFmQUNQQUtrQXVRQzNBTE1BdHdDK0FMVUFuQUNCQUc4QWVRQjFBRjBBVHdCRUFDUUE5Ly9pLzhuL3N2K2gvNVQvaGYrQS80VC9oditSLzZyL3hmL1UvOTMvM2YvaS93RUFMUUJZQUhBQWZRQ2lBTkVBL3dBWEFSSUJCd0g5QU5RQW1RQnJBRm9BWUFCVkFEY0FQUUJMQUZrQWFBQmxBRjRBVGdBdkFBMEE4di9oLzlqLzQvL3gvd3dBSlFBMEFFa0FWZ0JVQUVrQVJBQktBR0VBY0FDQUFJWUFnd0NMQUprQW93QzhBT0lBOEFEc0FOMEF0UUNIQUdZQWFBQldBREFBRVFEdy85RC93disxLzdIL3dQL2EvL0wvKy84YkFCOEFGd0FkQURjQVZRQk1BRWNBUGdCQUFFNEFQUUE2QUQ0QU5nQTBBQnNBL2YvKy8vbi8ydit4LzVqL2x2K2gvN1AveFAvay93Z0FPd0JnQUc0QWVRQ2JBTW9BN2dBWUFVUUJaQUZpQVZBQk5BRVNBZDhBbndCMUFGQUFKd0FLQU8zLzJ2L2EvL1AvQ0FBQUFPMy80di9YLzluLzF2L3IveVlBV3dDVUFNY0Evd0FnQVNNQkl3RUpBZVFBc1FCN0FFNEFJZ0FEQU9YLzFQL0svN3IvcXYrZy82My95Zi9nLy9QL0JRQXNBRjBBZUFDSUFJQUFnZ0NWQUp3QWxBQ0hBSWNBZ3dDUEFLTUFvQUNQQUhnQVh3QTBBQWtBQlFBVkFDRUFIQUFkQUJzQS9QL2YvOHovdy8vSi85TC80UC9wLytiLzUvLzEvd3dBRWdBYUFDMEFNQUEwQURvQVVBQnFBRzhBYVFCL0FKZ0FyUURUQVBBQStnRDRBTzhBNFFEcEFPY0ExQURYQU9JQTVnRG5BTzhBOHdEVkFLMEFlZ0E2QUFjQTkvL2IvN2YvdFAreS83RC9xUCtZLzMzL2RQK0UvNHovbi8rNi84di96Ly9pL3hBQU1BQllBRzRBV2dCTUFGRUFhUUNJQUpFQWxRQ1BBSHdBZHdCekFJa0F1UURZQU9JQTN3RGlBTW9Ba3dCc0FFMEFUQUJmQUdZQWRRQnlBR3NBYlFCdkFGOEFTZ0E2QUNZQURnRDQvOVgvdVArbi82TC9wZitsLzd2LzRmOENBQmtBRWdEei8rTC82di95Ly9ELzZmLzcvd2dBREFBWEFDUUFJQUFQQUEwQUV3QVpBQmdBTFFBMkFFVUFYd0IxQUhrQWhBQ1JBSndBb2dDdEFOQUE4QUFIQWZZQTJ3RFFBTWNBdFFDYUFJUUFjd0J5QUhFQVVRQVRBTTMvb1ArRS8zRC9WZjlWLzJYL2dQK3QvOVQvNy8vNi8vai83di9qLzlQLzJ2LzUveE1BT3dCM0FLUUF1Z0RLQVBRQURBRWtBVjhCcWdIeEFSb0NJd0lGQXN3QmRnRVVBYlFBWEFBaEFPbi90LytlLzQvL2d2OTEvMlAvVVA5SS8wUC9TUDlZLzNUL2pmK1ovNjcvdlArLy84My80di92Ly9uL0NBQWlBRG9BWHdDTEFMRUF4QUMrQUswQW93Q1VBSDRBY2dCK0FJUUFjQUJiQUZ3QVh3QlRBRmtBYWdDRUFKQUFld0JqQUVrQU1nQWhBQkFBQ1FBRkFCNEFOQUJKQUZrQVVBQkZBRG9BTWdBcUFDVUFJUUFMQVA3L0FBQVFBREFBU3dCVEFEMEFMUUFuQUNVQUl3QWxBREVBUmdCWUFHWUFkZ0NFQUowQW53Q1JBSDhBY1FCZ0FFd0FQZ0E0QURZQUd3RDAvOHIvc1Arai81Ny9yZit0LzdIL3VQL0wvOTcvNnYvOC8vci82Ly9qLytqLzRmL2EvOTMvM3YvcS93RUFId0EvQUc0QW53REdBUFlBQ0FFUEFSZ0JIZ0V2QVRvQlBnRS9BVDhCSFFIbUFLMEFlUUJPQUNnQUdBQUlBUDMvK1AvZS83Ly9xditlLzViL2hmOTYvM2IvZC8rQi80Zi9mdjk2LzRQL2xmK3cvOFgvMnYvei93Y0FIZ0FzQURNQVJBQlVBR2NBaHdDK0FQQUFDZ0V1QVZrQll3RklBU0VCOXdEYUFNUUF0QUNSQUZVQUhnRHkvOUwvc3YrVi80di9oZitILzRqL2pmK2MvNmovdHYvTS8rWC85LzhJQUJnQUl3QW1BQ3NBTWdBekFEZ0FOd0E1QUVBQVBnQTRBQzRBSlFBb0FFTUFhUUNHQUpJQW5BQ3RBS0VBamdCK0FITUFiUUJqQUZzQVN3QTJBQnNBQlFEdi8rUC8xdis4LzdUL3IvK24vNlQvcWYrMC84ci84LzhNQUJFQUh3QTBBRlVBWndCWkFFQUFJd0FKQVB2Lzd2L24vK2ovNy8vKy93Y0FFd0FmQURJQVJ3QmZBSElBZWdCN0FIMEFpZ0NlQUt3QXJ3QzBBTEVBbmdDS0FIZ0FiUUJoQUVzQU9RQXNBQ2dBTXdBOEFEWUFJUUFTQUE0QURRQUpBQUFBNy8vby8rWC82UC9pLzg3L3YvKzUvOEwvMVAvcC93SUFGZ0FrQUNvQUlBQWdBQ2dBSVFBaEFDd0FPd0JIQUVzQVRBQlRBRm9BVkFBK0FDc0FKQUFnQUI4QUhRQWdBQ2dBT1FCSUFFOEFWUUJwQUhVQWRBQjRBSFlBY3dCc0FHQUFVd0E3QUNVQUV3RDgvK3ovM2YvUS84SC9zditvLzZUL28vK28vN0QvdVArKy84UC95Zi9SLzkvLzcvOEhBQ1VBUGdCV0FIVUFqUUNWQUtBQW53Q1dBSThBZmdCd0FGOEFTd0ErQURJQUtnQWZBQnNBRWdBS0FBY0Evdi8zLy9MLzlQLzUvL3YvOXYvdy8vWC8vUDhEQUEwQUZnQWVBQ0VBSXdBakFCd0FHZ0FkQUJrQUhnQWxBQ01BSWdBbUFDTUFIQUFlQUNjQU9RQkpBRTBBU2dCSUFFSUFNd0FqQUJJQUF3RDIvK3IvNHYvZy8rai85djhFQUJJQUhnQW9BQ2tBSkFBa0FDY0FMd0EyQUQ0QVJRQklBRThBVEFCS0FFWUFQd0ErQURjQUxnQW1BQ1VBSWdBZkFCOEFHd0FkQUI0QUhnQWNBQk1BQWdEMi8rMy81UC9iLzlML3pmL0wvOG4veXYvUC85ci81UC9yLy9YL0FBQU9BQm9BSXdBeEFEMEFSZ0JSQUZvQVlBQmlBRndBU3dBN0FEY0FMd0FtQUNNQUhnQVRBQW9BQUFEeS8rZi80UC9iLzlqLzJ2L2cvK0gvNWYveS93SUFFUUFmQUNzQU9nQkpBRllBWXdCbUFHSUFXQUJQQUVJQU5nQXNBQ0FBR1FBWkFCWUFFZ0FOQUFBQTh2L20vK0QvM2YvYS85ai8yZi9lLytmLzdQL3QvL0QvOXYvOC93RUFDUUFWQUI4QU1BQkhBRmdBWVFCcUFIRUFjUUJxQUdFQVdBQlNBRXdBT3dBa0FCUUFDUUQvLy9ULzZ2L2cvOW4vMS8vYS85Ny80Zi9qLytYLzYvL3QvK24vNXYvbi8rbi83di96Ly92L0FnQUlBQTRBRlFBWEFCZ0FIZ0FnQUNNQUtnQXZBQzRBSmdBZ0FCZ0FEd0FKQUFRQS8vLzUvL1gvOHYvdi8rNy84UC95Ly9iLytmLzcvd0FBQndBS0FBc0FEQUFLQUFjQUJRQUhBQTRBRlFBV0FCY0FGd0FiQUNBQUpRQW9BQ1lBSkFBa0FDSUFId0FaQUJVQUVRQUxBQVFBQUFBQkFBVUFDUUFLQUFvQUNRQUlBQWdBQmdBR0FBZ0FCd0FHQUFVQUFRRC8vL3ovK3YvNC8vai8rZi82Ly92Ly8vOENBQVlBQ0FBSkFBb0FEZ0FSQUJRQUZnQVdBQk1BRUFBTkFBa0FCd0FGQUFJQUFBQUFBQUFBLy8vOS8vMy8vdi8vLy83Ly9mLzgvL3ovL1AvOC8vei8vdjhBQUFFQUF3QUVBQVVBQndBS0FBd0FEUUFNQUF3QUNnQUpBQWdBQmdBRUFBSUFBUUFBQVAvLy8vLy8vLy8vLy8vKy8vNy8vdi8rLy83Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL0FBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQT1cIixcImJhc2U2NFwiKTtcblx0dmFyIGNsb3NlZEhhdCA9IEJ1ZmZlcihcIlVrbEdSc1lZQUFCWFFWWkZabTEwSUJBQUFBQUJBQUVBUkt3QUFJaFlBUUFDQUJBQVpHRjBZYUlZQUFEQy8rVUFIZjBXLzZNRDBmK0svM01DRFFDQS84RUFUUS8yL3FIVTZBdU9Hemo0NnZtaEVhc05ZdEhLOWJjbGcvK2xBRmNMUCtHZy9DY1cwZi9JODFmNzVBN3VBT1ArZHhOTjYrVGhreGVnRTRmc2xoKzYvRFRBaEJzV0c0ZjErZndRRXZMMk0rVnBEUUVPVFAyRC8rUDNTUnFHOWZQVlZCVnpEekQ5VFAxTEJSMEdyZkk0K2lRTGR3TGQvdDhILy9ieEJNa0FmT2JMQlRrUlBBRFUvTDhpTk5tVjM1QW5md1VCL244RkYrMXkrcVFUQnY3YUFKQURpZS9XQkRnS3B3U1lEaExrK2VLN0hxMEdtQVNQRUluWHB2dUlGeW9DMnZyeUFROENHZnlxQWFNQmF3S3hBVnY1ZHZ3cEJEd0Z0ZnZBL0pZRWFRS3ovNTRSNS8wZjBlb0xCQnZYK0NVRU5RZFg2MndBV1FuNitCd0dKUVhDK3NZSWJ2OVY2eFVOQ0FmLytmWUFJd2hDL0c3d0lBaE5DT1g3M3dBNUJjcjVIZnA2QnpNQnpnRWZBb0wyYmZ5NERYSDYwZzh2RTdpOUNmNmlMeTM1NHZWRkpLZmNuZUJySnpNRkwvVnBBbDROYmU5bzk2VVFsLzlvL3FZYXZ1Tm8ya1VsUWcyVzlKVVM0dkdNNU5NVkxRaXo4QUFHSXduMStyUC91d09FL0RMK0xnUXEvNndCSVFrcDc2ajZDQkFOQUhzTXB1MmQ2T2dkMkFFU0FCRVM5OVN3L2VrZ1hmckUrYzhhQXUyVTJ6QWFnd3U0K3A4SDd3T2Q2YmIvWEE2OC9qa0hmL3JIODI0SUpQNk4vNjhITC8wYkFudjlSd0tlK2s0ZXF2bUJ2NGdnTmgzRjdtdi9VQ0hQMmNma2Z5bkJBSzcyY3dBVUR4WDl6K09uQ3pvUG8vaGlCZThHUWV1Vys4VVBFUUJGL1ZzSE94TyszaUhzbFIyVUF4dithZ0UwOXZFRStRUVovTFlZM09NbjdFWVlTZ016L2tUL1dBaG0vOWp2NFFJa0NzLy9YZ05kQTBUODZlcGJCWHdLMFFNMyszZ1BrQWF6MDBBSitSZkcray85cGhWNzZ0VG5JaGJkQjB6NzBmL3JBUm9BbXY3NUEwMytILzJxK2pFUzloaGp3RmorOWloMCtaWDQ5Z09MQjBIM2JQclRDZC85clFqbSs1RHJyQThlQmdyN2NBNnM5L3ZnQ1JVQURaMzZGaGd2MmZUeDdDQnUvUlQ3V1FGRkJSYjYwUTdHK252aitBdFZEcnI4VWY5NEY1SGt6T2NESUl3QVZnR3ZENS9kSmZzeEYwUUFudnFDQVZ3Q2h2NE1BQ0lBa0FBQ0FFTUFDUUFOQUpFQXJnQVFBenY3UlAxRUJFQUMrUHlIQys4Tlg5eG43aGdnWHdUaCt4a1VOT0FpK0tRU3VnbG1CZkhqYmdIN0R4RUFZdnVBQk9FRWFQU0RBQ0lJVGZ6Uy9kUUNzQUhZQVA0QU9QNDUvVm9CZ2dKaUFnQUF3L2N4K3BZTjJBdU83aWY3c3djbS9oZ0hLdnRhQ3BNUU44L0ZCV1FkUFBrazk0TVJJd1BtMk00UjF4RVk5QnNENUFuWjdoVDd6QkFuL0NBQlovN1hEVHIvMDltZERYTVRaZnJ3L2FZSmZQZGk5UlVQaXY3WERvTDRUZDdzRUFNUFhmcmdCWGtFRCt2dS9RVVFNQUJDQW5FQi9mbG0vcnI2b2dOUUE4c0V2dzFWNk0zMlFoQ1hBalgrSVA4cUNBYjd6L1VDQmkwR1F2MkNCdU1NWmQ0RytUZ2FPdi92QWU4QlJQRm5CWkFJNVBhRy9wa0dyLzcyLzZRQTFnMGQvVTdod3dvWUVrSDRWZ0lIRTBmaUsvY1BGQkVCR2YxeEJhOEdNUElCOWlRS0NRWXBBRG9QZHVqWjlkWVFGd0dBL3cwQmd3b2Q5NGoxR1FWWUJFYjlrUHkzQnBrQnNmMFJCQThBYi9mVUFyUUU3Zi93QVJvRFJ2UlJDYndGTytrZkJzSUpHQUFpL3l3QVpST2E2bmJwamh3WEE1UDNSUU5KRkkzblR1eDJHaHdLNlBjRTh0TUVKUWN5L3gvKzJBSUIvendWayt1MzV6MFh0d1RTL1ByKzdBTWpBcDM0aVA4K0JXd0FLUDVSRW56ejZPQnNGM2NQNy9zUzh3WDZpd3QvQWhjQWNnRUpCeTMxOWZOK0N3d0NIZ0Q3QURBRU9RSms5bjM3L1FjeUExY0RlZjVlOHM0RitRVW4vaTM4TlFjQ0RScnBvZnQ3RE93QU5RRFgvVllUQ3ZIWDUyc1QyUWZrK3U3K3ZnVkEvNmYzM1FQTkEvSC93Z2NKODRUNUxnMmdBTzBCVXdmNjc3djJuQXdSQ2IvOU8vVldBaGNEbGdHSUFPLy9uQUFhQUNZQTZmODlBRzhBb1FBZEFTei9FdjZKQVk0QnhnRmErSUVCVUFNUC9VY0RmQU5sRG5UcDZQTEZGd3ovTi8xWkVVM21Odmh6RXdZQ0IvZ0hDNWNKQjl5ckNJVVR1UGkyL2ZZS0V2bmE4ZGdMb1FSNy9YTUdRZjRmOGRRRGxBaWVBL3IrTnZXaUE0Y0dqZnRkL0EwR1FRSzYvS3NGdS93ZStaY0dDQUphL1c0Q05nSE4rbU1CeGdKZEFBTUFYeFR4NVhMcDJ5R3VBWWIwd2hRczhzUHEzaEZMQ0tuM0JRaUFDdkhnVEFUdEVZTDdxdng3QTVBQjdmdWZBTXNDQ0FLUEJjcjkydXNLQjNBSjB2N1gvc3dGWVFwTzU2djlrdy9QLy9qOHVBTDlCUzMyTC84akNHejdYZnRkQmV6L1ZBR2gvclVHVHd4MTRSNy8yQkdlL2hMOVJnYjQrc0g4WndKZERTUUFvdUtxQ3JjTFRmMHcvczBCSVFFay9vb0Eyd0ErQUU4Q2sveHgvcWdERkFDZi8xRUNJUCtsKzB3RHh3Qy9BZlAvVUFwRytMTG9BZy95Q1piNmZRQXNBYVVJK3ZpdDhiQUxkZ2FxK2VRS0F2NWg2aWNMUXdlQitTTUNmQU5RL2tjQnhnQzkvQm4vVFFVdy9Fa01hd05WM3B3Slp4Q0wrM1Q5U1FTN0E1MzJWLzVYQjUvL053RWsvMEw2YmdVVkFmOEwyZlZvNjFNUHJnWUsvSTRGd2YrazlFWUVFUVZ3L0ZYL2t3TkNBQW9BNXdIVy9rRDhBQUQyQkVIK3JRK2g4Y0RzUkJINEJVWDZQQWk3QVRqdU5RUkhCNUgvV0FDTC9xRUYvQUVoOFc0RUh3b0wrVTRIZGdxTzN6NEZ3aFFLK01EOUl3TmpBRUQrUkFIdUFhTUNYdnpoK2pNQXdnVjgvMTBOL3ZNZzd6c1FFQUZ2L1JVQ0d3R05BVWtBL2ZvUi94MEdRLzBMRFEvNHlPb3hEd0VGQ3Y5NC9Jd0ttZ0JwNkxZTG9BcUwrUG9BN2dEcEFNTDlUZ2dtQ083aGpBTnVFV3Y5RC92Y0J5b0pSdVZQQS93UHAvdk8vYzhJaVB1Nzh0UUlzZ1hOL1cwR3BQcEY5TklIaWdNVUFFa0tmZkp4K0NzTXFBSk1BYWYxZFFGYUJyNENBZ2J0N21YOTl3c1VBS24rdlF0LzhWcjNyZ3l0QWNiOTdnTEhBNkx4cGdZa0JLTUNQZ2xTNTRZQkdBM2QveXY3cXcwQStRSHVjd3hvQjJENVZRaTVBdXZvUUFvbENtNzY2ZjgrQnVIOGYvcDJBTWNCSlFPZi92UUxuL1E1ODJjTkxRSnUvWG9BYVFFeC95QUN0QVZxK1pyMkR3Y3hCVEw5TWYrMkEra0hQZkx0K1BzTWN3QnNCUlA3WWZRdUNKOEVxZjZ2Q0hYME92bE1DWkFCS1AvR0FnOEZOZlN6L1pRSDhRUTAvRkQ2Q1FQeUFQRUJ3Zi9KQVVnREd2b3ArODRHSmdGaUF1Z0RQdktaLzBFSWRnQSsvK1FBL0FieSt1enpzZ1lEQi92OGVnVE4rcmo3bWdVeUJ0OEI3TysyQTRZR0cvL1kvMW9GdnZ4MTkxRUdGQWFrQTRIeVIvK25DWFA4bmYzeEF5NEJUUDRZQWpvQVdQekZBYUFCMlA5dC84RUZlUU03OG12OTlRZXFBU1grMWdGbi96c0NRd3A0N3IvNzh3c3VBS3IrSHdFdkFBYitGd0ZUQVFRQTZnRzYvSXYra3dPRUFZSUtqdkJCOVdNUU9mL2lBcDBES1BJQUFYWUlvZjl6L2RVTWovS1o5VlVQZGdDbS9LTUFLZ011L2I3K3d3TGIvOTcvb0FEUi95My9xUUVzL3d3RHBBRTYrT2Yvd3dhcC9RSUNpUTN4NkdYN1NSQTYveDM5Y3dJYkFZYjc5d0haQWFYL0dRRHVETFh3Ri9TK0Q2NEJSUDBkQU1jRWovM1UrVlVFTkFLTy8zeitkUUtvL2JFSjBnQW02Y2dJd3duNCswc0FZZ0JQQ0N6N1AvTk1DQWNEZVAvWi91RUp3dm03OUxZSHZRUHYvWjBEWUFXbThTd0Jud2EyQXJRQTkvZGJBQ1VITlFZTjlQUDd3Z2piQUpyK0JnQlRBNmY5QWYxUEEva0FUdjhGQWxRQVlQdVBBYkVDSUFEOEFLNzdqZ09yL3QwTWhQalc2NThQNFFUaC9GeitNd3R6K05uek1nclVBeGo5VUFQMkE1ajByUCtZQjl2L3V2KzQvVEFDVVFqOTlDejhHUWU5QUJFQUJnRVhBSS85R2dHREFXa0Fkd0ZzQUFyODBRTk0vanI4WVFOTUFOTUNBdjBuQ1gvOUJ2SHlCMXdGUS80bC80c0I3ZitSLzVrQVNnQ0tBTFlBM3Y2Vy85Y0FWUUZQQUFzQy9mc1Evc1VCNXdqMUFKcnVsQVUrQndIK1lnQm4vL3NJd1BrbzlNOElrZ1gxK3BVRk93UkM3MFVFb0FoYy9Xei96Z0RWL3l3QW53QzdBT2NDbnZ2UC9Nd0Z3UDdxQ2YzM0VQTnRDeUFEMmYweUFEd0NydjJMLzNJQzd2LzJCVHI4TlBWb0J6MEVPdjFJL3BrQjZnRkNBT2tFclBsaytuOEdWUUZ2QUtiOUxBZHFBUUx3WEFYZEJ3bjlMZ0JOQU1zRFpBRTQ5WGdCdkFhNy9rSUNJUUZ5K1JZQmxBT0Yvd29DRFA5Vy9aQUJSZ0hsLy84QWIvODMvbmNBWEFLckJhejVBL3Z3QlB3QjV2OGcvMElDQndHTys3b0F6QUtSLytuL2xRQ09BRjMvM3YrNUFGOEF0Z0IwLzlyLzhBS0dBYmI2Si81RUF3RUJVUDd6Qko4Q2pQYmZBQjBFb3Y4OEFkditMd1RkQS92eDJRRXRDSjMraFA3K0FuY0M3ZmVwQUowRjEvN2tBVW9EQS9lNC9zNEdsZi9DL29ZQk53WjErS3Y3OHdhai8rZjl1d0YyQVVIL0x3RGVBQ3dBamY1bUFkOEFrdi9qL21zRnRBQlg5TmdEd3dYdy9kVUFTUUtSL0xyL0ZnSnFBTVg5VGdHZ0FPRUR2Z0tBOUxRQjFBV3ovd3ovaWdCSUFSYi9jUDhwQVVzQTMvK1JBQzBBcXY4QkFCUUJVdjlDQWJyK09nSWIvZVlIV2dTcDZPa0hRd3FoL0x2OXhBaDUrMHIxbkFpdkFrbitId0NJQUdQLytBQURBQ3NCWHdGSy9PSC9ud0x5QjhyMlh2bi9DT0wvQ3Y4NkFhUUFyQUhzL2p2OXFBQnhBb1QvRGdGdENFN3pTZnhaQ2ZmLzFQNTNBRWNCSUFVLytSTDYyUWRrQWZqOWVRR2tCcGIyVS95V0J6WC8yQVBtL1NUNmV3TmhBeS8rOEFSdy9ocjNsQVZLQlZMOFR2M1FBUXdDNy8vOS8wNEJQQVQ3K2FMNjRRYjBBVzhBbnY0SC9iRUJqd0t0L3pVRFgvc0QvY1lFM3dNekFKNzNEUVBxQWVJQTdQN3FCUG9BTVBXOUEwOEVoLzhzL3dRQkdRQkRBTG4vcWdDMC82Y0FUZjhlQXJnSXcvQUkvdmNKWmY3RS8xb0FWUUdBQUYzK0ZQOEtBb2dBNy8vekJxRDM5UGxjQ0tJQVgvOElBTVVET3Y1cStoY0Rud0xVQXczN0IveFZCTlFBVHdETC80WUNBQUV6K2Q4QkVBTURBaHNDUnZlcEFVc0RJUUVsL29ZRWVnSHM5UGdEQXdWRy9zMy9pUUR6QkdUOFZQZzFCck1DMXY2eUF3cjdhdjBLQkg4QVFQOUhBY0gvendLWkFUNzNtZ0poQTZiLzRQNEtBOGdCaS9rZEFVVUNuZ0FuQU1UL1h3THcvcm44UVFMT0FlVCtYUUlVQUdMOW1nSEMvWXdBamdHQkFKZ0Fid0x0L2N2NzNBSmlBcW4vcndCL0FsTDd3djZ0QTNnQWRmN2oveHdCY3dGSC9xWUVFd0dWOVlzRFF3UlQvMnovQkFFUUFuYjh4UDlSQXBvQTl2NVdCZlA5di9aeEJRb0RZdjg2LzRBRmgvd1IrbFFFZUFFb0FNSC9qd0QrQUI3L0dQOXdBV3NBcC8rWUFtMzlTdjR2QXdvQWpQK0VBUFgvb2dDbC82b0R4UUhjOVZBQjVBV2wvckVBVGdSMStqRCtlZ016QUVJQUtBRUZBODM2YXY3ckF4b0FNd0ZqQUFqOUN3R2ZBYy8vZS8rWS81b0FpQUY0L3owQmxRUUMrTVArdXdSQUFBQUF3djh1Qmd2NXQvdFlCL2YvNy80N0FQNEF5UDhqQU1UL2dRQk5BUHYvWHdodjllSDZvQW5ZLzlIK2JnRDVBOEg3Q2YxOEJMOEFSZitKQVByK2VnSDIvbG9Fd0FIejlIVURrZ1RqL2xRQWF3TncvSm45bXdNT0FBdi9NZ0NhQVJnQWF3S24vVVg5RWdKSUFWai8wUUtjQWRMNStnQzhBcGovNlFDa0EvdjZyLzA5Qk1ZQVBQK0hBTE1BVGdCVi9pRURhd0hWK0xNQ0FBTG5BYlVBbVB2Q0FPa0J0d0MvL3prQXFnR28vbkQrTGdKWUFNTC9Vd0NiQU5NQlhmMGIvMkVCTFFVeC9aYjRWUVplQVpVQWNBSFQrajRCeHdGTkFNZi8xZ0VoQXo3NTgvK2FBN2IvZmdDQS8rOEVsUHdYKzZVRUxRSFcvWDhDM3dHVCszOEF1d0hCQU1IL0lBRnNBcFA3U2Y1RUJQei9lZ0VVQUFMOGRBSHRBZXYvTXdIQi9yWCtUd0hJQVMwQytmdGovd3dDdlA4dEFkZi9ZZ05oL1dENzFRUmFBSm9DM2Y3WitnVURrQUV6QUlUL0hBTDBBRWI2WkFLTEFsSUJJUUNvK2dvQ1dRS08veDRBTkFETUF3TDlKZnlEQTZJQUJ3Q3pBdTc5bmYxZkF2ci9yZ0NsLzdjRHR2NjQra1FENGdDWUFCLy8vd1B2L25UNnBRSmpBZ2YvQUFMTUFWejZxd0RDQWlRQTBQOWVBRDBBVkFSQSt4ejg4QVM2QUk3L0x3Q2JBbnorN1B1aEJQUUJxZnRIQU53Qm9nRFoveW9BWWdBV0FEd0E4Zjh4QUd3QVBRRDdCRlA2SGZ6UkJRNEFIQURLLzZEL0VRQjlBTTRBWmdBWEFyLzk0ZjE4QXF3QXNBQzIveW4vK3YvcEFUc0FoUDVBQUhNQTlRQXJBSFVBcFFKMS9QSDlxQU5JQU5yL3dmL0pCRVQ4ZVB1ZEJJQUFkQUFSL3dVREN3SDQrU01CbVFNTi8zWUJOd0tVK3BnQW5nSmJBSkgvV1FKM0FPSDZQQUxSQWNzQWR3RkwvR1VBZGdIbUFIQUN3UHpCL200Q3lRQ3ovNDBBQWdKMy9vSCt2UUNhQUs4QVNnQUFBZkFBSGY1Uy84Z0I3UCtCLytZQXZRQVhBM1Q4cS8waEE3OEEvUC9rLytzQURRQkEvNmtBWlFCakFLdi9kUVRnL0RiNm9BVStBVlAvYXdKWi9hbithZ0w3LzVULytRQllBSHNCTGdEcy9HSUFPd0ttLzI4Q3UvOEwvRndDZ1FBZEFEb0Fhd0tLLzJIN3dnUEJBSG9BVEFJWCt5TUF5d0l2QU56L2xBSTAvamY5b0FLcEFITUFOZ0ZhL2tEL2p3RWlBTEgvMlFEMy8xd0RtUDNUL0x3Q3R3QlNBUGovbVFESEFlaitTUDJJQVo0QjZmOFVBUDRBdnY2SEFHWUE5QUdxQVFiNWNnSU5BejRBTndFMC9BVUJ4UUd6LzVnQXgvL0Mvd2dBNmdBY0FIUUJ2d0NkL01jQVZRRTFBSEFBSlFCUUFsUCtlLzM0QVNRQjh2L0pBVUgvSmYzZEFSRUJuZ0QwQVo3OHd2K3RBV2tBQ1FDQkFjNEFjL3dqQVMwQlRRQ3UvMGdDZHdEMiszd0JVQUVZQUZVQUFnSnIvaDcrQ1FKQUFQY0FYd0JWL3BFQVNBQzZBRHdBWmdENUFndjhNditlQW4zL1hnQ2NBQlFBZmdDOUFJRCtRUUJMQWRUL2p3QWZBWnYrN2Y3SEFWc0FId0IrQXdmOGJQMFpCQ3NBTUFCRUFnUDlqdjdtQWprQUlRQ2FBckQ4eGY2UEFuSUE0ditKQVBqLzQvOWFBQzBCemdIMSsrMy9xQUlzQUFrQUpQK2dBRG9Bc0FHd0FOYjhxUUNOQVU4QTRQOGNBZ0wvcWYzZ0FZVUFyZjljQUxBQWpnQmwvK1QvOGdDa0FHWC90Z0FaQWE3OWNnQnhBWS8vTVFDZkFFMENFLzVrL2hNQzJ2OFRBSU1Ba2dDOS81OEFtUDlMQWs0QWJ2dnRBWmtCQVFBU0FQTUFXZ0Q3L2s0QWF3QlVBR3dBOC8vYS8xOEFaUUF2QURjQU13RE8veFFBdUFEcUFZYit4LzV1QVk4QWdmOTNBVDhBYlA2TUFIb0F4QURoLzZBQzcvMzAvUjBDekFEay84RUF2d0gzL0RRQTV3R3UvODcvYVFDUkFNTUFYUUNiL2s4QUJRSG8vd2dBVWdBTUFqUC9BLzVhQVZRQjAvOTcvOXYvRHdFS0FIQUJ5UUMwL0RNQllnR3QveVlBaXdCMUFJVUF3djlGLzZRQW5nQTlBTy8vUXdBYkFCZ0E0LytkQWNrQXpQMXhBS0lBY0FDQUFPNy9od0J0QUliL3ZmOUxBVy8valFFcEFrMzZJd0VoQTJMLzZmOThBQ3dBQ2dCWEFBOEFzZ08rK3hqK2RBTjVBSlgveGdBUkFtNzg5LzlrQXZMLzQvOEJBclgrMVAwc0FwY0FQUUFwQVlEK2t2OWRBYlQvQndDMUFGWUFPUUNOQUVBQTl2N3UvLzRBT1FBY0FDNEFJZ0FLQVBUL1BRQTBBVndBNGYwWkFjOEF1Z0FaQVVMOVJBQmtBUmtBV0FDZUFVbitLZjgxQVdFQVdBQmZBRElBZS84MEFJUUFOZ0RqLytFQ2UvMGwvblFDQUFBdEFHY0FIZ0FVQWJyL2IvN2pBQzBCYXYrTkFRWUJ6dnVSQWQ0Qnl2K2hBUVArTS85MUFZd0Evdi9rQWFmK05mN1hBVVFBdkFBNkFjSDkxdjliQWFvQVh2LzhBUW9BMFB5QUFWTUI3di80LzFZQzdmMkEvaElDUkFBbkFCZ0FiQUFwQUJRQTZ2K0FBRUlDRS8yKy9rWURiUDlnQVFzQWsvMGRBZlFBTEFBVUFGY0FEQUJNQU9QL0lnTC8vb3o5RmdLdkFLYi85UCt1QUVvQUdBRmYvOXYrRkFGeUFHTUFSd0NtL3hJQWp3QXhBQ0FBemY4dEFKOEFhQUMyL3hNQ01QOVQvU1VDMlFEWi93OEFLZ0d2LzZiK093R0tBUDMvSHdDWkFPSC9BQUFqQUl3QmJnQ1ovSHNCYmdIQ0FBb0FjdjU2QVBVQUJnQlNBUm9BQ2Y3ZEFMWUFRZ0JMQUdJQjFmNEYvNm9CT1FDci84Ny8yQUJMQUMwQTJnSFUvVFAvNUFGZUFMMy9yUUYyL3pUK1lBRTlBRDBBWkFBekFDa0FNQUF6QUN3QU5nQTBBRE1BSkFBckFEZ0FQUUJZQURjQURBRHQvNVVBelAvci8xZ0EwQUZ6LytUOWt3RjBBWG9BUFA1Y0FNWUEydi9qQUtIL3FRRUpBR2I5UlFGM0FXVC9LZ0hyQUVYOXNnQm1BUmNBOVArdEFMWUFHdjQ1QVZzQUd3SFNBT3o4NVFCNUFRZ0FIQUNhQVdyKzl2NUJBcWIvOGdEd0FGMzlxQUJQQVR3QXhmOGxBZE1Bbi8yb0FPc0FEUUJlQUM4QVJ3QWVBSUVCMGY3SS9vVUJxQUNZLzUwQi92OWIvYlVCMVFCcEFOOEFJUDRyQUZrQkJBQmhBUWYvSXYvWkFJc0FGUURIQUE0Qjl2MDJBUDRBWGdBQUFFRUIwdjlkL2drQnJBQW1BQlVCTnY5Ky85Z0EvLzlNQUhNQUZBQ1JBS0VBci80ZkFEY0I0Ly9FQUo3L29QK2JBQkVCdkFEQS9aOEE3Z0FWQUJVQTR3RGNBREQrVXdEZEFFZ0FpUUMyLzlyL1FBQkhBSGdBRmdBaUFhbi9uUDRQQVljQVd3QzRBQmIvOFArS0FFTUFmUUI3QU1IL2xQK2ZBRjhBZndCUEFELy9Md0NjQUQwQVRnRHAveDBBRkFBc0FIVUFNd0FwQUMwQVJ3QlBBTkFBV1A5SC85WUFWUUQ1LzhJQTFRRFgvaGdBbUFBckFEMEEzQUFGQUMvL2VRQk1BRDRBYkFBMUFlTCtudi9pQVBUL2x3RCsvM1VCWi8rTi9qY0JuQUFrQUFVQVJnR3ovN0grMUFDUEFFTUFEd0ZXL3cvL1R3RktBRjRBSkFGdC90bi9Jd0UwQUJJQldQOHkvenNCTkFEWEFCQUE3ZjZRQU04QUl3RGMveHdBVFFBc0FLZ0Fmd0FVLzBJQVVRQjNBQWNBcVFDdUFJSCtWZ0RJQUVZQTF2OFRBZmIveGY2ckFJVUFMZ0FQQURjQUlnQVpBQ1VBSndBaUFESUFKQUQ4L3gwQU53QWZBRTRBTkFDbS93d0FZZ0JKQVBqL3l2OHBBRjRBK3YrQkFQUC9pZjltQUFJQUlnQXVBQThBRXdBZkFBc0FCQUFkQUJNQUR3QVNBQTRBRVFBTkFCQUFEUUFOQUJBQUF3QWFBUEQvaWdDcS80ci9lUUFkQU92L0x3QUtBTC8vSVFBV0FBUUEvUDhnQVByLzQvOFJBQWtBL3Y4RUFBTUEvUDg9XCIsXCJiYXNlNjRcIik7XG5cblx0dmFyIHNhbXBsZXMgPSBbXG5cdFx0YmFzc0RydW0sXG5cdFx0Y2xhcCxcblx0XHRjbG9zZWRIYXRcblx0XTtcblxuXHQvLyBNYWtlcyBzdXJlIHRoZSBtYWNoaW5lIGlzIHJlYWR5IHRvIHBsYXlcblx0bm9kZS5yZWFkeSA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzYW1wbGVzTG9hZGVkID0gW107XG5cdFx0XG5cdFx0Ly8gZGlzY29ubmVjdCBleGlzdGluZyBzYW1wbGVycyBqdXN0IGluIGNhc2Vcblx0XHRzYW1wbGVQbGF5ZXJzLmZvckVhY2goZnVuY3Rpb24ocykge1xuXHRcdFx0cy5kaXNjb25uZWN0KCk7XG5cdFx0fSk7XG5cblx0XHQvLyBkdW1wIHRoZW0sIGFuZCBsZXQncyBzdGFydCBhZ2FpblxuXHRcdHNhbXBsZVBsYXllcnMgPSBbXTtcblx0XHRcblx0XHRzYW1wbGVzLmZvckVhY2goZnVuY3Rpb24oc2FtcGxlLCBpbmRleCkge1xuXHRcdFx0dmFyIHNhbXBsZVBsYXllciA9IG5ldyBTYW1wbGVQbGF5ZXIoY29udGV4dCk7XG5cdFx0XHR2YXIgYXJyYXlCdWZmZXIgPSBzYW1wbGUudG9BcnJheUJ1ZmZlcigpO1xuXHRcdFxuXHRcdFx0c2FtcGxlUGxheWVycy5wdXNoKHNhbXBsZVBsYXllcik7XG5cdFx0XHRzYW1wbGVQbGF5ZXIuY29ubmVjdChub2RlKTtcblx0XHRcblx0XHRcdHZhciBzYW1wbGVMb2FkZWQgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcblx0XHRcdFx0Y29udGV4dC5kZWNvZGVBdWRpb0RhdGEoYXJyYXlCdWZmZXIsIGZ1bmN0aW9uKGJ1ZmZlcikge1xuXHRcdFx0XHRcdHNhbXBsZVBsYXllci5idWZmZXIgPSBidWZmZXI7XG5cdFx0XHRcdFx0cmVzb2x2ZShidWZmZXIpO1xuXHRcdFx0XHR9LCBmdW5jdGlvbihlcnIpIHtcblx0XHRcdFx0XHRyZWplY3QoZXJyKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0c2FtcGxlc0xvYWRlZC5wdXNoKHNhbXBsZUxvYWRlZCk7XG5cdFx0fSk7XG5cblx0XHQvLyBLaW5kYSBoYWNrcyBmb3IgdGhlIHRpbWUgYmVpbmdcblx0XHRub2RlUHJvcGVydGllcy5jdXJyZW50UGF0dGVybiA9IHBhdHRlcm5zW2N1cnJlbnRQYXR0ZXJuSW5kZXhdO1xuXHRcdG5vZGVQcm9wZXJ0aWVzLnRyYWNrcyA9IHNhbXBsZVBsYXllcnMubGVuZ3RoO1xuXHRcdFxuXHRcdHJldHVybiBQcm9taXNlLmFsbChzYW1wbGVzTG9hZGVkKTtcblx0fTtcblxuXHRub2RlLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XG5cdFx0c3RlcFRpbWUgPSAwLjA7XG5cdFx0c3RhcnRUaW1lID0gY29udGV4dC5jdXJyZW50VGltZSArIDAuMDA1O1xuXHRcdHNhbXBsZVBsYXllcnMuZm9yRWFjaChmdW5jdGlvbihzYW1wbGVyKSB7XG5cdFx0XHRzYW1wbGVyLnN0b3AoKTtcblx0XHR9KTtcblx0XHRzY2hlZHVsZSgpO1xuXHR9O1xuXG5cdG5vZGUuc3RvcCA9IGZ1bmN0aW9uKHdoZW4pIHtcblx0XHRjbGVhclRpbWVvdXQoc2NoZWR1bGVUaW1lb3V0KTtcblx0fTtcblxuXHRub2RlLmNhbmNlbFNjaGVkdWxlZEV2ZW50cyA9IGZ1bmN0aW9uKHdoZW4pIHtcblx0XHQvLyBUT0RPIGNhbmNlbCBzY2hlZHVsZWQgZXZlbnRzIG9uIHRoZSAnY2hpbGQnIHNhbXBsZSBwbGF5ZXJzXG5cdH07XG5cblx0bm9kZS5zZXRTdGVwID0gZnVuY3Rpb24odHJhY2ssIHN0ZXAsIHRyaWdnZXIpIHtcblx0XHR2YXIgY3VycmVudFBhdHRlcm4gPSB0aGlzLmN1cnJlbnRQYXR0ZXJuO1xuXHRcdGN1cnJlbnRQYXR0ZXJuW3RyYWNrXVtzdGVwXSA9IHRyaWdnZXI7XG5cdH07XG5cblx0ZnVuY3Rpb24gc2NoZWR1bGUoKSB7XG5cdFx0XG5cdFx0dmFyIGN1cnJlbnRQYXR0ZXJuID0gcGF0dGVybnNbY3VycmVudFBhdHRlcm5JbmRleF07XG5cdFx0dmFyIG51bVRyYWNrcyA9IHNhbXBsZVBsYXllcnMubGVuZ3RoO1xuXG5cdFx0dmFyIGN1cnJlbnRUaW1lID0gY29udGV4dC5jdXJyZW50VGltZTtcblxuXHRcdGN1cnJlbnRUaW1lIC09IHN0YXJ0VGltZTtcblxuXHRcdC8vIFRPRE8gYWxzbyB3aHkgMC4yXG5cdFx0d2hpbGUoc3RlcFRpbWUgPCBjdXJyZW50VGltZSArIDAuMikge1xuXG5cdFx0XHR2YXIgY29udGV4dFBsYXlUaW1lID0gc3RlcFRpbWUgKyBzdGFydFRpbWU7XG5cblx0XHRcdGZvcih2YXIgdHJhY2sgPSAwOyB0cmFjayA8IG51bVRyYWNrczsgdHJhY2srKykge1xuXHRcdFx0XHR2YXIgc2FtcGxlciA9IHNhbXBsZVBsYXllcnNbdHJhY2tdO1xuXHRcdFx0XHR2YXIgdHJpZ2dlciA9IGN1cnJlbnRQYXR0ZXJuW3RyYWNrXVtjdXJyZW50U3RlcF07XG5cdFx0XHRcdGlmKHRyaWdnZXIpIHtcblx0XHRcdFx0XHRzYW1wbGVyLnN0YXJ0KGNvbnRleHRQbGF5VGltZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dmFyIG9sZFN0ZXAgPSBjdXJyZW50U3RlcDtcblx0XHRcdGFkdmFuY2VTdGVwKCk7XG5cblx0XHRcdC8vIERpc3BhdGNoIGV2ZW50IGZvciBkcmF3aW5nIGlmIHN0ZXAgIT0gb2xkU3RlcFxuXHRcdFx0aWYob2xkU3RlcCAhPT0gY3VycmVudFN0ZXApIHtcblx0XHRcdFx0dmFyIGV2ID0gbmV3IEN1c3RvbUV2ZW50KCdzdGVwJywgeyBkZXRhaWw6IHsgdmFsdWU6IGN1cnJlbnRTdGVwIH0gfSk7XG5cdFx0XHRcdG5vZGUuZGlzcGF0Y2hFdmVudChldik7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gVE9ETzogQ2hyaXMncyBleGFtcGxlIGhhcyB0aGUgdGltZW91dCBhdCAwIGJ1dCBpdCBzZWVtcyBleGNlc3NpdmU/XG5cdFx0c2NoZWR1bGVUaW1lb3V0ID0gc2V0VGltZW91dChzY2hlZHVsZSwgMTApO1xuXG5cdH1cblxuXHRmdW5jdGlvbiBhZHZhbmNlU3RlcCgpIHtcblx0XHRcblx0XHQvLyBBZHZhbmNlIHRpbWUgYnkgYSAxNnRoIG5vdGUuLi5cblx0ICAgIHZhciBzZWNvbmRzUGVyQmVhdCA9IDYwLjAgLyBub2RlUHJvcGVydGllcy5icG07XG5cdFx0XG5cdFx0Y3VycmVudFN0ZXArKztcblxuXHRcdGlmKGN1cnJlbnRTdGVwID09PSBub2RlUHJvcGVydGllcy5zdGVwcykge1xuXHRcdFx0Y3VycmVudFN0ZXAgPSAwO1xuXHRcdH1cblxuXHRcdC8vIFRPRE8gc29tZXRoaW5nIHNvbWV0aGluZyBzd2luZyB3aGljaCBJJ20gaWdub3Jpbmdcblx0XHQvLyBUT0RPIGFsc28gd2h5IDAuMjUgLSBtYXliZSBiZWNhdXNlIGl0J3MgYSBibGFjayBub3RlIHNvIDEvNCBvZiBiYXI/XG5cdFx0c3RlcFRpbWUgKz0gMC4yNSAqIHNlY29uZHNQZXJCZWF0O1xuXG5cdH1cblxuXHRyZXR1cm4gbm9kZTtcblxufTtcblxuIiwiLyohXG4gKiBAb3ZlcnZpZXcgZXM2LXByb21pc2UgLSBhIHRpbnkgaW1wbGVtZW50YXRpb24gb2YgUHJvbWlzZXMvQSsuXG4gKiBAY29weXJpZ2h0IENvcHlyaWdodCAoYykgMjAxNCBZZWh1ZGEgS2F0eiwgVG9tIERhbGUsIFN0ZWZhbiBQZW5uZXIgYW5kIGNvbnRyaWJ1dG9ycyAoQ29udmVyc2lvbiB0byBFUzYgQVBJIGJ5IEpha2UgQXJjaGliYWxkKVxuICogQGxpY2Vuc2UgICBMaWNlbnNlZCB1bmRlciBNSVQgbGljZW5zZVxuICogICAgICAgICAgICBTZWUgaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL2pha2VhcmNoaWJhbGQvZXM2LXByb21pc2UvbWFzdGVyL0xJQ0VOU0VcbiAqIEB2ZXJzaW9uICAgMi4xLjFcbiAqL1xuXG4oZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHV0aWxzJCRvYmplY3RPckZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJyB8fCAodHlwZW9mIHggPT09ICdvYmplY3QnICYmIHggIT09IG51bGwpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSR1dGlscyQkaXNGdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbic7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHV0aWxzJCRpc01heWJlVGhlbmFibGUoeCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnb2JqZWN0JyAmJiB4ICE9PSBudWxsO1xuICAgIH1cblxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkdXRpbHMkJF9pc0FycmF5O1xuICAgIGlmICghQXJyYXkuaXNBcnJheSkge1xuICAgICAgbGliJGVzNiRwcm9taXNlJHV0aWxzJCRfaXNBcnJheSA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBsaWIkZXM2JHByb21pc2UkdXRpbHMkJF9pc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcbiAgICB9XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJHV0aWxzJCRpc0FycmF5ID0gbGliJGVzNiRwcm9taXNlJHV0aWxzJCRfaXNBcnJheTtcbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGFzYXAkJGxlbiA9IDA7XG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRhc2FwJCR0b1N0cmluZyA9IHt9LnRvU3RyaW5nO1xuICAgIHZhciBsaWIkZXM2JHByb21pc2UkYXNhcCQkdmVydHhOZXh0O1xuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRhc2FwKGNhbGxiYWNrLCBhcmcpIHtcbiAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRxdWV1ZVtsaWIkZXM2JHByb21pc2UkYXNhcCQkbGVuXSA9IGNhbGxiYWNrO1xuICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJHF1ZXVlW2xpYiRlczYkcHJvbWlzZSRhc2FwJCRsZW4gKyAxXSA9IGFyZztcbiAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRsZW4gKz0gMjtcbiAgICAgIGlmIChsaWIkZXM2JHByb21pc2UkYXNhcCQkbGVuID09PSAyKSB7XG4gICAgICAgIC8vIElmIGxlbiBpcyAyLCB0aGF0IG1lYW5zIHRoYXQgd2UgbmVlZCB0byBzY2hlZHVsZSBhbiBhc3luYyBmbHVzaC5cbiAgICAgICAgLy8gSWYgYWRkaXRpb25hbCBjYWxsYmFja3MgYXJlIHF1ZXVlZCBiZWZvcmUgdGhlIHF1ZXVlIGlzIGZsdXNoZWQsIHRoZXlcbiAgICAgICAgLy8gd2lsbCBiZSBwcm9jZXNzZWQgYnkgdGhpcyBmbHVzaCB0aGF0IHdlIGFyZSBzY2hlZHVsaW5nLlxuICAgICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkc2NoZWR1bGVGbHVzaCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkYXNhcCQkZGVmYXVsdCA9IGxpYiRlczYkcHJvbWlzZSRhc2FwJCRhc2FwO1xuXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRicm93c2VyV2luZG93ID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSA/IHdpbmRvdyA6IHVuZGVmaW5lZDtcbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGFzYXAkJGJyb3dzZXJHbG9iYWwgPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkYnJvd3NlcldpbmRvdyB8fCB7fTtcbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGFzYXAkJEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyID0gbGliJGVzNiRwcm9taXNlJGFzYXAkJGJyb3dzZXJHbG9iYWwuTXV0YXRpb25PYnNlcnZlciB8fCBsaWIkZXM2JHByb21pc2UkYXNhcCQkYnJvd3Nlckdsb2JhbC5XZWJLaXRNdXRhdGlvbk9ic2VydmVyO1xuICAgIHZhciBsaWIkZXM2JHByb21pc2UkYXNhcCQkaXNOb2RlID0gdHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHt9LnRvU3RyaW5nLmNhbGwocHJvY2VzcykgPT09ICdbb2JqZWN0IHByb2Nlc3NdJztcblxuICAgIC8vIHRlc3QgZm9yIHdlYiB3b3JrZXIgYnV0IG5vdCBpbiBJRTEwXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRpc1dvcmtlciA9IHR5cGVvZiBVaW50OENsYW1wZWRBcnJheSAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIHR5cGVvZiBpbXBvcnRTY3JpcHRzICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgdHlwZW9mIE1lc3NhZ2VDaGFubmVsICE9PSAndW5kZWZpbmVkJztcblxuICAgIC8vIG5vZGVcbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkYXNhcCQkdXNlTmV4dFRpY2soKSB7XG4gICAgICB2YXIgbmV4dFRpY2sgPSBwcm9jZXNzLm5leHRUaWNrO1xuICAgICAgLy8gbm9kZSB2ZXJzaW9uIDAuMTAueCBkaXNwbGF5cyBhIGRlcHJlY2F0aW9uIHdhcm5pbmcgd2hlbiBuZXh0VGljayBpcyB1c2VkIHJlY3Vyc2l2ZWx5XG4gICAgICAvLyBzZXRJbW1lZGlhdGUgc2hvdWxkIGJlIHVzZWQgaW5zdGVhZCBpbnN0ZWFkXG4gICAgICB2YXIgdmVyc2lvbiA9IHByb2Nlc3MudmVyc2lvbnMubm9kZS5tYXRjaCgvXig/OihcXGQrKVxcLik/KD86KFxcZCspXFwuKT8oXFwqfFxcZCspJC8pO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmVyc2lvbikgJiYgdmVyc2lvblsxXSA9PT0gJzAnICYmIHZlcnNpb25bMl0gPT09ICcxMCcpIHtcbiAgICAgICAgbmV4dFRpY2sgPSBzZXRJbW1lZGlhdGU7XG4gICAgICB9XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIG5leHRUaWNrKGxpYiRlczYkcHJvbWlzZSRhc2FwJCRmbHVzaCk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIHZlcnR4XG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJGFzYXAkJHVzZVZlcnR4VGltZXIoKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCR2ZXJ0eE5leHQobGliJGVzNiRwcm9taXNlJGFzYXAkJGZsdXNoKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJGFzYXAkJHVzZU11dGF0aW9uT2JzZXJ2ZXIoKSB7XG4gICAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgbGliJGVzNiRwcm9taXNlJGFzYXAkJEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKGxpYiRlczYkcHJvbWlzZSRhc2FwJCRmbHVzaCk7XG4gICAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgIG9ic2VydmVyLm9ic2VydmUobm9kZSwgeyBjaGFyYWN0ZXJEYXRhOiB0cnVlIH0pO1xuXG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIG5vZGUuZGF0YSA9IChpdGVyYXRpb25zID0gKytpdGVyYXRpb25zICUgMik7XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIHdlYiB3b3JrZXJcbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkYXNhcCQkdXNlTWVzc2FnZUNoYW5uZWwoKSB7XG4gICAgICB2YXIgY2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICAgICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkZmx1c2g7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICBjaGFubmVsLnBvcnQyLnBvc3RNZXNzYWdlKDApO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkYXNhcCQkdXNlU2V0VGltZW91dCgpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgc2V0VGltZW91dChsaWIkZXM2JHByb21pc2UkYXNhcCQkZmx1c2gsIDEpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGFzYXAkJHF1ZXVlID0gbmV3IEFycmF5KDEwMDApO1xuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRmbHVzaCgpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGliJGVzNiRwcm9taXNlJGFzYXAkJGxlbjsgaSs9Mikge1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkcXVldWVbaV07XG4gICAgICAgIHZhciBhcmcgPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkcXVldWVbaSsxXTtcblxuICAgICAgICBjYWxsYmFjayhhcmcpO1xuXG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRxdWV1ZVtpXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJHF1ZXVlW2krMV0gPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRsZW4gPSAwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRhdHRlbXB0VmVydGV4KCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIHIgPSByZXF1aXJlO1xuICAgICAgICB2YXIgdmVydHggPSByKCd2ZXJ0eCcpO1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkdmVydHhOZXh0ID0gdmVydHgucnVuT25Mb29wIHx8IHZlcnR4LnJ1bk9uQ29udGV4dDtcbiAgICAgICAgcmV0dXJuIGxpYiRlczYkcHJvbWlzZSRhc2FwJCR1c2VWZXJ0eFRpbWVyKCk7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGxpYiRlczYkcHJvbWlzZSRhc2FwJCR1c2VTZXRUaW1lb3V0KCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRzY2hlZHVsZUZsdXNoO1xuICAgIC8vIERlY2lkZSB3aGF0IGFzeW5jIG1ldGhvZCB0byB1c2UgdG8gdHJpZ2dlcmluZyBwcm9jZXNzaW5nIG9mIHF1ZXVlZCBjYWxsYmFja3M6XG4gICAgaWYgKGxpYiRlczYkcHJvbWlzZSRhc2FwJCRpc05vZGUpIHtcbiAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRzY2hlZHVsZUZsdXNoID0gbGliJGVzNiRwcm9taXNlJGFzYXAkJHVzZU5leHRUaWNrKCk7XG4gICAgfSBlbHNlIGlmIChsaWIkZXM2JHByb21pc2UkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRzY2hlZHVsZUZsdXNoID0gbGliJGVzNiRwcm9taXNlJGFzYXAkJHVzZU11dGF0aW9uT2JzZXJ2ZXIoKTtcbiAgICB9IGVsc2UgaWYgKGxpYiRlczYkcHJvbWlzZSRhc2FwJCRpc1dvcmtlcikge1xuICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkdXNlTWVzc2FnZUNoYW5uZWwoKTtcbiAgICB9IGVsc2UgaWYgKGxpYiRlczYkcHJvbWlzZSRhc2FwJCRicm93c2VyV2luZG93ID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIHJlcXVpcmUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRzY2hlZHVsZUZsdXNoID0gbGliJGVzNiRwcm9taXNlJGFzYXAkJGF0dGVtcHRWZXJ0ZXgoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkdXNlU2V0VGltZW91dCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJG5vb3AoKSB7fVxuXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFBFTkRJTkcgICA9IHZvaWQgMDtcbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkRlVMRklMTEVEID0gMTtcbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUkVKRUNURUQgID0gMjtcblxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUiA9IG5ldyBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRFcnJvck9iamVjdCgpO1xuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkc2VsZkZ1bGxmaWxsbWVudCgpIHtcbiAgICAgIHJldHVybiBuZXcgVHlwZUVycm9yKFwiWW91IGNhbm5vdCByZXNvbHZlIGEgcHJvbWlzZSB3aXRoIGl0c2VsZlwiKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRjYW5ub3RSZXR1cm5Pd24oKSB7XG4gICAgICByZXR1cm4gbmV3IFR5cGVFcnJvcignQSBwcm9taXNlcyBjYWxsYmFjayBjYW5ub3QgcmV0dXJuIHRoYXQgc2FtZSBwcm9taXNlLicpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGdldFRoZW4ocHJvbWlzZSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHByb21pc2UudGhlbjtcbiAgICAgIH0gY2F0Y2goZXJyb3IpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IuZXJyb3IgPSBlcnJvcjtcbiAgICAgICAgcmV0dXJuIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHRyeVRoZW4odGhlbiwgdmFsdWUsIGZ1bGZpbGxtZW50SGFuZGxlciwgcmVqZWN0aW9uSGFuZGxlcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdGhlbi5jYWxsKHZhbHVlLCBmdWxmaWxsbWVudEhhbmRsZXIsIHJlamVjdGlvbkhhbmRsZXIpO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIHJldHVybiBlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGhhbmRsZUZvcmVpZ25UaGVuYWJsZShwcm9taXNlLCB0aGVuYWJsZSwgdGhlbikge1xuICAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRkZWZhdWx0KGZ1bmN0aW9uKHByb21pc2UpIHtcbiAgICAgICAgdmFyIHNlYWxlZCA9IGZhbHNlO1xuICAgICAgICB2YXIgZXJyb3IgPSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCR0cnlUaGVuKHRoZW4sIHRoZW5hYmxlLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIGlmIChzZWFsZWQpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgc2VhbGVkID0gdHJ1ZTtcbiAgICAgICAgICBpZiAodGhlbmFibGUgIT09IHZhbHVlKSB7XG4gICAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgICBpZiAoc2VhbGVkKSB7IHJldHVybjsgfVxuICAgICAgICAgIHNlYWxlZCA9IHRydWU7XG5cbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgICAgfSwgJ1NldHRsZTogJyArIChwcm9taXNlLl9sYWJlbCB8fCAnIHVua25vd24gcHJvbWlzZScpKTtcblxuICAgICAgICBpZiAoIXNlYWxlZCAmJiBlcnJvcikge1xuICAgICAgICAgIHNlYWxlZCA9IHRydWU7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfSwgcHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaGFuZGxlT3duVGhlbmFibGUocHJvbWlzZSwgdGhlbmFibGUpIHtcbiAgICAgIGlmICh0aGVuYWJsZS5fc3RhdGUgPT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEZVTEZJTExFRCkge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHRoZW5hYmxlLl9yZXN1bHQpO1xuICAgICAgfSBlbHNlIGlmICh0aGVuYWJsZS5fc3RhdGUgPT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFJFSkVDVEVEKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCB0aGVuYWJsZS5fcmVzdWx0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHN1YnNjcmliZSh0aGVuYWJsZSwgdW5kZWZpbmVkLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaGFuZGxlTWF5YmVUaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlKSB7XG4gICAgICBpZiAobWF5YmVUaGVuYWJsZS5jb25zdHJ1Y3RvciA9PT0gcHJvbWlzZS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRoYW5kbGVPd25UaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB0aGVuID0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkZ2V0VGhlbihtYXliZVRoZW5hYmxlKTtcblxuICAgICAgICBpZiAodGhlbiA9PT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IpIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IuZXJyb3IpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoZW4gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gICAgICAgIH0gZWxzZSBpZiAobGliJGVzNiRwcm9taXNlJHV0aWxzJCRpc0Z1bmN0aW9uKHRoZW4pKSB7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUsIHRoZW4pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKSB7XG4gICAgICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHNlbGZGdWxsZmlsbG1lbnQoKSk7XG4gICAgICB9IGVsc2UgaWYgKGxpYiRlczYkcHJvbWlzZSR1dGlscyQkb2JqZWN0T3JGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaGFuZGxlTWF5YmVUaGVuYWJsZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRwdWJsaXNoUmVqZWN0aW9uKHByb21pc2UpIHtcbiAgICAgIGlmIChwcm9taXNlLl9vbmVycm9yKSB7XG4gICAgICAgIHByb21pc2UuX29uZXJyb3IocHJvbWlzZS5fcmVzdWx0KTtcbiAgICAgIH1cblxuICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcHVibGlzaChwcm9taXNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHZhbHVlKSB7XG4gICAgICBpZiAocHJvbWlzZS5fc3RhdGUgIT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFBFTkRJTkcpIHsgcmV0dXJuOyB9XG5cbiAgICAgIHByb21pc2UuX3Jlc3VsdCA9IHZhbHVlO1xuICAgICAgcHJvbWlzZS5fc3RhdGUgPSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRGVUxGSUxMRUQ7XG5cbiAgICAgIGlmIChwcm9taXNlLl9zdWJzY3JpYmVycy5sZW5ndGggIT09IDApIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJGRlZmF1bHQobGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcHVibGlzaCwgcHJvbWlzZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbikge1xuICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRQRU5ESU5HKSB7IHJldHVybjsgfVxuICAgICAgcHJvbWlzZS5fc3RhdGUgPSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRSRUpFQ1RFRDtcbiAgICAgIHByb21pc2UuX3Jlc3VsdCA9IHJlYXNvbjtcblxuICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJGRlZmF1bHQobGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcHVibGlzaFJlamVjdGlvbiwgcHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHBhcmVudCwgY2hpbGQsIG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKSB7XG4gICAgICB2YXIgc3Vic2NyaWJlcnMgPSBwYXJlbnQuX3N1YnNjcmliZXJzO1xuICAgICAgdmFyIGxlbmd0aCA9IHN1YnNjcmliZXJzLmxlbmd0aDtcblxuICAgICAgcGFyZW50Ll9vbmVycm9yID0gbnVsbDtcblxuICAgICAgc3Vic2NyaWJlcnNbbGVuZ3RoXSA9IGNoaWxkO1xuICAgICAgc3Vic2NyaWJlcnNbbGVuZ3RoICsgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkRlVMRklMTEVEXSA9IG9uRnVsZmlsbG1lbnQ7XG4gICAgICBzdWJzY3JpYmVyc1tsZW5ndGggKyBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRSRUpFQ1RFRF0gID0gb25SZWplY3Rpb247XG5cbiAgICAgIGlmIChsZW5ndGggPT09IDAgJiYgcGFyZW50Ll9zdGF0ZSkge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkZGVmYXVsdChsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRwdWJsaXNoLCBwYXJlbnQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHB1Ymxpc2gocHJvbWlzZSkge1xuICAgICAgdmFyIHN1YnNjcmliZXJzID0gcHJvbWlzZS5fc3Vic2NyaWJlcnM7XG4gICAgICB2YXIgc2V0dGxlZCA9IHByb21pc2UuX3N0YXRlO1xuXG4gICAgICBpZiAoc3Vic2NyaWJlcnMubGVuZ3RoID09PSAwKSB7IHJldHVybjsgfVxuXG4gICAgICB2YXIgY2hpbGQsIGNhbGxiYWNrLCBkZXRhaWwgPSBwcm9taXNlLl9yZXN1bHQ7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3Vic2NyaWJlcnMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgY2hpbGQgPSBzdWJzY3JpYmVyc1tpXTtcbiAgICAgICAgY2FsbGJhY2sgPSBzdWJzY3JpYmVyc1tpICsgc2V0dGxlZF07XG5cbiAgICAgICAgaWYgKGNoaWxkKSB7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaW52b2tlQ2FsbGJhY2soc2V0dGxlZCwgY2hpbGQsIGNhbGxiYWNrLCBkZXRhaWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNhbGxiYWNrKGRldGFpbCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoID0gMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRFcnJvck9iamVjdCgpIHtcbiAgICAgIHRoaXMuZXJyb3IgPSBudWxsO1xuICAgIH1cblxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1IgPSBuZXcgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkRXJyb3JPYmplY3QoKTtcblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHRyeUNhdGNoKGNhbGxiYWNrLCBkZXRhaWwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhkZXRhaWwpO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFRSWV9DQVRDSF9FUlJPUi5lcnJvciA9IGU7XG4gICAgICAgIHJldHVybiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1I7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaW52b2tlQ2FsbGJhY2soc2V0dGxlZCwgcHJvbWlzZSwgY2FsbGJhY2ssIGRldGFpbCkge1xuICAgICAgdmFyIGhhc0NhbGxiYWNrID0gbGliJGVzNiRwcm9taXNlJHV0aWxzJCRpc0Z1bmN0aW9uKGNhbGxiYWNrKSxcbiAgICAgICAgICB2YWx1ZSwgZXJyb3IsIHN1Y2NlZWRlZCwgZmFpbGVkO1xuXG4gICAgICBpZiAoaGFzQ2FsbGJhY2spIHtcbiAgICAgICAgdmFsdWUgPSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCR0cnlDYXRjaChjYWxsYmFjaywgZGV0YWlsKTtcblxuICAgICAgICBpZiAodmFsdWUgPT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFRSWV9DQVRDSF9FUlJPUikge1xuICAgICAgICAgIGZhaWxlZCA9IHRydWU7XG4gICAgICAgICAgZXJyb3IgPSB2YWx1ZS5lcnJvcjtcbiAgICAgICAgICB2YWx1ZSA9IG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3VjY2VlZGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwcm9taXNlID09PSB2YWx1ZSkge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRjYW5ub3RSZXR1cm5Pd24oKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbHVlID0gZGV0YWlsO1xuICAgICAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAocHJvbWlzZS5fc3RhdGUgIT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFBFTkRJTkcpIHtcbiAgICAgICAgLy8gbm9vcFxuICAgICAgfSBlbHNlIGlmIChoYXNDYWxsYmFjayAmJiBzdWNjZWVkZWQpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKGZhaWxlZCkge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgICAgfSBlbHNlIGlmIChzZXR0bGVkID09PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRGVUxGSUxMRUQpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKHNldHRsZWQgPT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFJFSkVDVEVEKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaW5pdGlhbGl6ZVByb21pc2UocHJvbWlzZSwgcmVzb2x2ZXIpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc29sdmVyKGZ1bmN0aW9uIHJlc29sdmVQcm9taXNlKHZhbHVlKXtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgfSwgZnVuY3Rpb24gcmVqZWN0UHJvbWlzZShyZWFzb24pIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yKENvbnN0cnVjdG9yLCBpbnB1dCkge1xuICAgICAgdmFyIGVudW1lcmF0b3IgPSB0aGlzO1xuXG4gICAgICBlbnVtZXJhdG9yLl9pbnN0YW5jZUNvbnN0cnVjdG9yID0gQ29uc3RydWN0b3I7XG4gICAgICBlbnVtZXJhdG9yLnByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IobGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkbm9vcCk7XG5cbiAgICAgIGlmIChlbnVtZXJhdG9yLl92YWxpZGF0ZUlucHV0KGlucHV0KSkge1xuICAgICAgICBlbnVtZXJhdG9yLl9pbnB1dCAgICAgPSBpbnB1dDtcbiAgICAgICAgZW51bWVyYXRvci5sZW5ndGggICAgID0gaW5wdXQubGVuZ3RoO1xuICAgICAgICBlbnVtZXJhdG9yLl9yZW1haW5pbmcgPSBpbnB1dC5sZW5ndGg7XG5cbiAgICAgICAgZW51bWVyYXRvci5faW5pdCgpO1xuXG4gICAgICAgIGlmIChlbnVtZXJhdG9yLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGZ1bGZpbGwoZW51bWVyYXRvci5wcm9taXNlLCBlbnVtZXJhdG9yLl9yZXN1bHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVudW1lcmF0b3IubGVuZ3RoID0gZW51bWVyYXRvci5sZW5ndGggfHwgMDtcbiAgICAgICAgICBlbnVtZXJhdG9yLl9lbnVtZXJhdGUoKTtcbiAgICAgICAgICBpZiAoZW51bWVyYXRvci5fcmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRmdWxmaWxsKGVudW1lcmF0b3IucHJvbWlzZSwgZW51bWVyYXRvci5fcmVzdWx0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChlbnVtZXJhdG9yLnByb21pc2UsIGVudW1lcmF0b3IuX3ZhbGlkYXRpb25FcnJvcigpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsaWIkZXM2JHByb21pc2UkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3ZhbGlkYXRlSW5wdXQgPSBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgcmV0dXJuIGxpYiRlczYkcHJvbWlzZSR1dGlscyQkaXNBcnJheShpbnB1dCk7XG4gICAgfTtcblxuICAgIGxpYiRlczYkcHJvbWlzZSRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fdmFsaWRhdGlvbkVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IEVycm9yKCdBcnJheSBNZXRob2RzIG11c3QgYmUgcHJvdmlkZWQgYW4gQXJyYXknKTtcbiAgICB9O1xuXG4gICAgbGliJGVzNiRwcm9taXNlJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9yZXN1bHQgPSBuZXcgQXJyYXkodGhpcy5sZW5ndGgpO1xuICAgIH07XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGVudW1lcmF0b3IkJGRlZmF1bHQgPSBsaWIkZXM2JHByb21pc2UkZW51bWVyYXRvciQkRW51bWVyYXRvcjtcblxuICAgIGxpYiRlczYkcHJvbWlzZSRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fZW51bWVyYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZW51bWVyYXRvciA9IHRoaXM7XG5cbiAgICAgIHZhciBsZW5ndGggID0gZW51bWVyYXRvci5sZW5ndGg7XG4gICAgICB2YXIgcHJvbWlzZSA9IGVudW1lcmF0b3IucHJvbWlzZTtcbiAgICAgIHZhciBpbnB1dCAgID0gZW51bWVyYXRvci5faW5wdXQ7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBwcm9taXNlLl9zdGF0ZSA9PT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUEVORElORyAmJiBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZW51bWVyYXRvci5fZWFjaEVudHJ5KGlucHV0W2ldLCBpKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgbGliJGVzNiRwcm9taXNlJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9lYWNoRW50cnkgPSBmdW5jdGlvbihlbnRyeSwgaSkge1xuICAgICAgdmFyIGVudW1lcmF0b3IgPSB0aGlzO1xuICAgICAgdmFyIGMgPSBlbnVtZXJhdG9yLl9pbnN0YW5jZUNvbnN0cnVjdG9yO1xuXG4gICAgICBpZiAobGliJGVzNiRwcm9taXNlJHV0aWxzJCRpc01heWJlVGhlbmFibGUoZW50cnkpKSB7XG4gICAgICAgIGlmIChlbnRyeS5jb25zdHJ1Y3RvciA9PT0gYyAmJiBlbnRyeS5fc3RhdGUgIT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFBFTkRJTkcpIHtcbiAgICAgICAgICBlbnRyeS5fb25lcnJvciA9IG51bGw7XG4gICAgICAgICAgZW51bWVyYXRvci5fc2V0dGxlZEF0KGVudHJ5Ll9zdGF0ZSwgaSwgZW50cnkuX3Jlc3VsdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZW51bWVyYXRvci5fd2lsbFNldHRsZUF0KGMucmVzb2x2ZShlbnRyeSksIGkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbnVtZXJhdG9yLl9yZW1haW5pbmctLTtcbiAgICAgICAgZW51bWVyYXRvci5fcmVzdWx0W2ldID0gZW50cnk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGxpYiRlczYkcHJvbWlzZSRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fc2V0dGxlZEF0ID0gZnVuY3Rpb24oc3RhdGUsIGksIHZhbHVlKSB7XG4gICAgICB2YXIgZW51bWVyYXRvciA9IHRoaXM7XG4gICAgICB2YXIgcHJvbWlzZSA9IGVudW1lcmF0b3IucHJvbWlzZTtcblxuICAgICAgaWYgKHByb21pc2UuX3N0YXRlID09PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRQRU5ESU5HKSB7XG4gICAgICAgIGVudW1lcmF0b3IuX3JlbWFpbmluZy0tO1xuXG4gICAgICAgIGlmIChzdGF0ZSA9PT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUkVKRUNURUQpIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVudW1lcmF0b3IuX3Jlc3VsdFtpXSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChlbnVtZXJhdG9yLl9yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCBlbnVtZXJhdG9yLl9yZXN1bHQpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBsaWIkZXM2JHByb21pc2UkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3dpbGxTZXR0bGVBdCA9IGZ1bmN0aW9uKHByb21pc2UsIGkpIHtcbiAgICAgIHZhciBlbnVtZXJhdG9yID0gdGhpcztcblxuICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHByb21pc2UsIHVuZGVmaW5lZCwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgZW51bWVyYXRvci5fc2V0dGxlZEF0KGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEZVTEZJTExFRCwgaSwgdmFsdWUpO1xuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgIGVudW1lcmF0b3IuX3NldHRsZWRBdChsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRSRUpFQ1RFRCwgaSwgcmVhc29uKTtcbiAgICAgIH0pO1xuICAgIH07XG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHByb21pc2UkYWxsJCRhbGwoZW50cmllcykge1xuICAgICAgcmV0dXJuIG5ldyBsaWIkZXM2JHByb21pc2UkZW51bWVyYXRvciQkZGVmYXVsdCh0aGlzLCBlbnRyaWVzKS5wcm9taXNlO1xuICAgIH1cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJHByb21pc2UkYWxsJCRkZWZhdWx0ID0gbGliJGVzNiRwcm9taXNlJHByb21pc2UkYWxsJCRhbGw7XG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHByb21pc2UkcmFjZSQkcmFjZShlbnRyaWVzKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICAgICAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IobGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkbm9vcCk7XG5cbiAgICAgIGlmICghbGliJGVzNiRwcm9taXNlJHV0aWxzJCRpc0FycmF5KGVudHJpZXMpKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCBuZXcgVHlwZUVycm9yKCdZb3UgbXVzdCBwYXNzIGFuIGFycmF5IHRvIHJhY2UuJykpO1xuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICAgIH1cblxuICAgICAgdmFyIGxlbmd0aCA9IGVudHJpZXMubGVuZ3RoO1xuXG4gICAgICBmdW5jdGlvbiBvbkZ1bGZpbGxtZW50KHZhbHVlKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBvblJlamVjdGlvbihyZWFzb24pIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBwcm9taXNlLl9zdGF0ZSA9PT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUEVORElORyAmJiBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkc3Vic2NyaWJlKENvbnN0cnVjdG9yLnJlc29sdmUoZW50cmllc1tpXSksIHVuZGVmaW5lZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJHJhY2UkJGRlZmF1bHQgPSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRyYWNlJCRyYWNlO1xuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJHJlc29sdmUkJHJlc29sdmUob2JqZWN0KSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICAgICAgaWYgKG9iamVjdCAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0JyAmJiBvYmplY3QuY29uc3RydWN0b3IgPT09IENvbnN0cnVjdG9yKSB7XG4gICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICB9XG5cbiAgICAgIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJG5vb3ApO1xuICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCBvYmplY3QpO1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRyZXNvbHZlJCRkZWZhdWx0ID0gbGliJGVzNiRwcm9taXNlJHByb21pc2UkcmVzb2x2ZSQkcmVzb2x2ZTtcbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRyZWplY3QkJHJlamVjdChyZWFzb24pIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuICAgICAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IobGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkbm9vcCk7XG4gICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJHByb21pc2UkcmVqZWN0JCRkZWZhdWx0ID0gbGliJGVzNiRwcm9taXNlJHByb21pc2UkcmVqZWN0JCRyZWplY3Q7XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJHByb21pc2UkJGNvdW50ZXIgPSAwO1xuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzUmVzb2x2ZXIoKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdZb3UgbXVzdCBwYXNzIGEgcmVzb2x2ZXIgZnVuY3Rpb24gYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHRoZSBwcm9taXNlIGNvbnN0cnVjdG9yJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzTmV3KCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZhaWxlZCB0byBjb25zdHJ1Y3QgJ1Byb21pc2UnOiBQbGVhc2UgdXNlIHRoZSAnbmV3JyBvcGVyYXRvciwgdGhpcyBvYmplY3QgY29uc3RydWN0b3IgY2Fubm90IGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLlwiKTtcbiAgICB9XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJHByb21pc2UkJGRlZmF1bHQgPSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZTtcbiAgICAvKipcbiAgICAgIFByb21pc2Ugb2JqZWN0cyByZXByZXNlbnQgdGhlIGV2ZW50dWFsIHJlc3VsdCBvZiBhbiBhc3luY2hyb25vdXMgb3BlcmF0aW9uLiBUaGVcbiAgICAgIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsIHdoaWNoXG4gICAgICByZWdpc3RlcnMgY2FsbGJhY2tzIHRvIHJlY2VpdmUgZWl0aGVyIGEgcHJvbWlzZeKAmXMgZXZlbnR1YWwgdmFsdWUgb3IgdGhlIHJlYXNvblxuICAgICAgd2h5IHRoZSBwcm9taXNlIGNhbm5vdCBiZSBmdWxmaWxsZWQuXG5cbiAgICAgIFRlcm1pbm9sb2d5XG4gICAgICAtLS0tLS0tLS0tLVxuXG4gICAgICAtIGBwcm9taXNlYCBpcyBhbiBvYmplY3Qgb3IgZnVuY3Rpb24gd2l0aCBhIGB0aGVuYCBtZXRob2Qgd2hvc2UgYmVoYXZpb3IgY29uZm9ybXMgdG8gdGhpcyBzcGVjaWZpY2F0aW9uLlxuICAgICAgLSBgdGhlbmFibGVgIGlzIGFuIG9iamVjdCBvciBmdW5jdGlvbiB0aGF0IGRlZmluZXMgYSBgdGhlbmAgbWV0aG9kLlxuICAgICAgLSBgdmFsdWVgIGlzIGFueSBsZWdhbCBKYXZhU2NyaXB0IHZhbHVlIChpbmNsdWRpbmcgdW5kZWZpbmVkLCBhIHRoZW5hYmxlLCBvciBhIHByb21pc2UpLlxuICAgICAgLSBgZXhjZXB0aW9uYCBpcyBhIHZhbHVlIHRoYXQgaXMgdGhyb3duIHVzaW5nIHRoZSB0aHJvdyBzdGF0ZW1lbnQuXG4gICAgICAtIGByZWFzb25gIGlzIGEgdmFsdWUgdGhhdCBpbmRpY2F0ZXMgd2h5IGEgcHJvbWlzZSB3YXMgcmVqZWN0ZWQuXG4gICAgICAtIGBzZXR0bGVkYCB0aGUgZmluYWwgcmVzdGluZyBzdGF0ZSBvZiBhIHByb21pc2UsIGZ1bGZpbGxlZCBvciByZWplY3RlZC5cblxuICAgICAgQSBwcm9taXNlIGNhbiBiZSBpbiBvbmUgb2YgdGhyZWUgc3RhdGVzOiBwZW5kaW5nLCBmdWxmaWxsZWQsIG9yIHJlamVjdGVkLlxuXG4gICAgICBQcm9taXNlcyB0aGF0IGFyZSBmdWxmaWxsZWQgaGF2ZSBhIGZ1bGZpbGxtZW50IHZhbHVlIGFuZCBhcmUgaW4gdGhlIGZ1bGZpbGxlZFxuICAgICAgc3RhdGUuICBQcm9taXNlcyB0aGF0IGFyZSByZWplY3RlZCBoYXZlIGEgcmVqZWN0aW9uIHJlYXNvbiBhbmQgYXJlIGluIHRoZVxuICAgICAgcmVqZWN0ZWQgc3RhdGUuICBBIGZ1bGZpbGxtZW50IHZhbHVlIGlzIG5ldmVyIGEgdGhlbmFibGUuXG5cbiAgICAgIFByb21pc2VzIGNhbiBhbHNvIGJlIHNhaWQgdG8gKnJlc29sdmUqIGEgdmFsdWUuICBJZiB0aGlzIHZhbHVlIGlzIGFsc28gYVxuICAgICAgcHJvbWlzZSwgdGhlbiB0aGUgb3JpZ2luYWwgcHJvbWlzZSdzIHNldHRsZWQgc3RhdGUgd2lsbCBtYXRjaCB0aGUgdmFsdWUnc1xuICAgICAgc2V0dGxlZCBzdGF0ZS4gIFNvIGEgcHJvbWlzZSB0aGF0ICpyZXNvbHZlcyogYSBwcm9taXNlIHRoYXQgcmVqZWN0cyB3aWxsXG4gICAgICBpdHNlbGYgcmVqZWN0LCBhbmQgYSBwcm9taXNlIHRoYXQgKnJlc29sdmVzKiBhIHByb21pc2UgdGhhdCBmdWxmaWxscyB3aWxsXG4gICAgICBpdHNlbGYgZnVsZmlsbC5cblxuXG4gICAgICBCYXNpYyBVc2FnZTpcbiAgICAgIC0tLS0tLS0tLS0tLVxuXG4gICAgICBgYGBqc1xuICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgLy8gb24gc3VjY2Vzc1xuICAgICAgICByZXNvbHZlKHZhbHVlKTtcblxuICAgICAgICAvLyBvbiBmYWlsdXJlXG4gICAgICAgIHJlamVjdChyZWFzb24pO1xuICAgICAgfSk7XG5cbiAgICAgIHByb21pc2UudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBvbiBmdWxmaWxsbWVudFxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgIC8vIG9uIHJlamVjdGlvblxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQWR2YW5jZWQgVXNhZ2U6XG4gICAgICAtLS0tLS0tLS0tLS0tLS1cblxuICAgICAgUHJvbWlzZXMgc2hpbmUgd2hlbiBhYnN0cmFjdGluZyBhd2F5IGFzeW5jaHJvbm91cyBpbnRlcmFjdGlvbnMgc3VjaCBhc1xuICAgICAgYFhNTEh0dHBSZXF1ZXN0YHMuXG5cbiAgICAgIGBgYGpzXG4gICAgICBmdW5jdGlvbiBnZXRKU09OKHVybCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgICAgICB4aHIub3BlbignR0VUJywgdXJsKTtcbiAgICAgICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gaGFuZGxlcjtcbiAgICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2pzb24nO1xuICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdBY2NlcHQnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICAgIHhoci5zZW5kKCk7XG5cbiAgICAgICAgICBmdW5jdGlvbiBoYW5kbGVyKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PT0gdGhpcy5ET05FKSB7XG4gICAgICAgICAgICAgIGlmICh0aGlzLnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0aGlzLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdnZXRKU09OOiBgJyArIHVybCArICdgIGZhaWxlZCB3aXRoIHN0YXR1czogWycgKyB0aGlzLnN0YXR1cyArICddJykpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGdldEpTT04oJy9wb3N0cy5qc29uJykudGhlbihmdW5jdGlvbihqc29uKSB7XG4gICAgICAgIC8vIG9uIGZ1bGZpbGxtZW50XG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgLy8gb24gcmVqZWN0aW9uXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBVbmxpa2UgY2FsbGJhY2tzLCBwcm9taXNlcyBhcmUgZ3JlYXQgY29tcG9zYWJsZSBwcmltaXRpdmVzLlxuXG4gICAgICBgYGBqc1xuICAgICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBnZXRKU09OKCcvcG9zdHMnKSxcbiAgICAgICAgZ2V0SlNPTignL2NvbW1lbnRzJylcbiAgICAgIF0pLnRoZW4oZnVuY3Rpb24odmFsdWVzKXtcbiAgICAgICAgdmFsdWVzWzBdIC8vID0+IHBvc3RzSlNPTlxuICAgICAgICB2YWx1ZXNbMV0gLy8gPT4gY29tbWVudHNKU09OXG5cbiAgICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEBjbGFzcyBQcm9taXNlXG4gICAgICBAcGFyYW0ge2Z1bmN0aW9ufSByZXNvbHZlclxuICAgICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgICAgQGNvbnN0cnVjdG9yXG4gICAgKi9cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZShyZXNvbHZlcikge1xuICAgICAgdGhpcy5faWQgPSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkY291bnRlcisrO1xuICAgICAgdGhpcy5fc3RhdGUgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9yZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9zdWJzY3JpYmVycyA9IFtdO1xuXG4gICAgICBpZiAobGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkbm9vcCAhPT0gcmVzb2x2ZXIpIHtcbiAgICAgICAgaWYgKCFsaWIkZXM2JHByb21pc2UkdXRpbHMkJGlzRnVuY3Rpb24ocmVzb2x2ZXIpKSB7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzUmVzb2x2ZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZSkpIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkbmVlZHNOZXcoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGluaXRpYWxpemVQcm9taXNlKHRoaXMsIHJlc29sdmVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5hbGwgPSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRhbGwkJGRlZmF1bHQ7XG4gICAgbGliJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucmFjZSA9IGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJHJhY2UkJGRlZmF1bHQ7XG4gICAgbGliJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucmVzb2x2ZSA9IGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJHJlc29sdmUkJGRlZmF1bHQ7XG4gICAgbGliJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucmVqZWN0ID0gbGliJGVzNiRwcm9taXNlJHByb21pc2UkcmVqZWN0JCRkZWZhdWx0O1xuXG4gICAgbGliJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucHJvdG90eXBlID0ge1xuICAgICAgY29uc3RydWN0b3I6IGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLFxuXG4gICAgLyoqXG4gICAgICBUaGUgcHJpbWFyeSB3YXkgb2YgaW50ZXJhY3Rpbmcgd2l0aCBhIHByb21pc2UgaXMgdGhyb3VnaCBpdHMgYHRoZW5gIG1ldGhvZCxcbiAgICAgIHdoaWNoIHJlZ2lzdGVycyBjYWxsYmFja3MgdG8gcmVjZWl2ZSBlaXRoZXIgYSBwcm9taXNlJ3MgZXZlbnR1YWwgdmFsdWUgb3IgdGhlXG4gICAgICByZWFzb24gd2h5IHRoZSBwcm9taXNlIGNhbm5vdCBiZSBmdWxmaWxsZWQuXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgICAgIC8vIHVzZXIgaXMgYXZhaWxhYmxlXG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyB1c2VyIGlzIHVuYXZhaWxhYmxlLCBhbmQgeW91IGFyZSBnaXZlbiB0aGUgcmVhc29uIHdoeVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQ2hhaW5pbmdcbiAgICAgIC0tLS0tLS0tXG5cbiAgICAgIFRoZSByZXR1cm4gdmFsdWUgb2YgYHRoZW5gIGlzIGl0c2VsZiBhIHByb21pc2UuICBUaGlzIHNlY29uZCwgJ2Rvd25zdHJlYW0nXG4gICAgICBwcm9taXNlIGlzIHJlc29sdmVkIHdpdGggdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZmlyc3QgcHJvbWlzZSdzIGZ1bGZpbGxtZW50XG4gICAgICBvciByZWplY3Rpb24gaGFuZGxlciwgb3IgcmVqZWN0ZWQgaWYgdGhlIGhhbmRsZXIgdGhyb3dzIGFuIGV4Y2VwdGlvbi5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gdXNlci5uYW1lO1xuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICByZXR1cm4gJ2RlZmF1bHQgbmFtZSc7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uICh1c2VyTmFtZSkge1xuICAgICAgICAvLyBJZiBgZmluZFVzZXJgIGZ1bGZpbGxlZCwgYHVzZXJOYW1lYCB3aWxsIGJlIHRoZSB1c2VyJ3MgbmFtZSwgb3RoZXJ3aXNlIGl0XG4gICAgICAgIC8vIHdpbGwgYmUgYCdkZWZhdWx0IG5hbWUnYFxuICAgICAgfSk7XG5cbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZvdW5kIHVzZXIsIGJ1dCBzdGlsbCB1bmhhcHB5Jyk7XG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYGZpbmRVc2VyYCByZWplY3RlZCBhbmQgd2UncmUgdW5oYXBweScpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICAvLyBpZiBgZmluZFVzZXJgIGZ1bGZpbGxlZCwgYHJlYXNvbmAgd2lsbCBiZSAnRm91bmQgdXNlciwgYnV0IHN0aWxsIHVuaGFwcHknLlxuICAgICAgICAvLyBJZiBgZmluZFVzZXJgIHJlamVjdGVkLCBgcmVhc29uYCB3aWxsIGJlICdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jy5cbiAgICAgIH0pO1xuICAgICAgYGBgXG4gICAgICBJZiB0aGUgZG93bnN0cmVhbSBwcm9taXNlIGRvZXMgbm90IHNwZWNpZnkgYSByZWplY3Rpb24gaGFuZGxlciwgcmVqZWN0aW9uIHJlYXNvbnMgd2lsbCBiZSBwcm9wYWdhdGVkIGZ1cnRoZXIgZG93bnN0cmVhbS5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICB0aHJvdyBuZXcgUGVkYWdvZ2ljYWxFeGNlcHRpb24oJ1Vwc3RyZWFtIGVycm9yJyk7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAvLyBuZXZlciByZWFjaGVkXG4gICAgICB9KS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAvLyBuZXZlciByZWFjaGVkXG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIC8vIFRoZSBgUGVkZ2Fnb2NpYWxFeGNlcHRpb25gIGlzIHByb3BhZ2F0ZWQgYWxsIHRoZSB3YXkgZG93biB0byBoZXJlXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBBc3NpbWlsYXRpb25cbiAgICAgIC0tLS0tLS0tLS0tLVxuXG4gICAgICBTb21ldGltZXMgdGhlIHZhbHVlIHlvdSB3YW50IHRvIHByb3BhZ2F0ZSB0byBhIGRvd25zdHJlYW0gcHJvbWlzZSBjYW4gb25seSBiZVxuICAgICAgcmV0cmlldmVkIGFzeW5jaHJvbm91c2x5LiBUaGlzIGNhbiBiZSBhY2hpZXZlZCBieSByZXR1cm5pbmcgYSBwcm9taXNlIGluIHRoZVxuICAgICAgZnVsZmlsbG1lbnQgb3IgcmVqZWN0aW9uIGhhbmRsZXIuIFRoZSBkb3duc3RyZWFtIHByb21pc2Ugd2lsbCB0aGVuIGJlIHBlbmRpbmdcbiAgICAgIHVudGlsIHRoZSByZXR1cm5lZCBwcm9taXNlIGlzIHNldHRsZWQuIFRoaXMgaXMgY2FsbGVkICphc3NpbWlsYXRpb24qLlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHJldHVybiBmaW5kQ29tbWVudHNCeUF1dGhvcih1c2VyKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKGNvbW1lbnRzKSB7XG4gICAgICAgIC8vIFRoZSB1c2VyJ3MgY29tbWVudHMgYXJlIG5vdyBhdmFpbGFibGVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIElmIHRoZSBhc3NpbWxpYXRlZCBwcm9taXNlIHJlamVjdHMsIHRoZW4gdGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIGFsc28gcmVqZWN0LlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHJldHVybiBmaW5kQ29tbWVudHNCeUF1dGhvcih1c2VyKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKGNvbW1lbnRzKSB7XG4gICAgICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgZnVsZmlsbHMsIHdlJ2xsIGhhdmUgdGhlIHZhbHVlIGhlcmVcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgLy8gSWYgYGZpbmRDb21tZW50c0J5QXV0aG9yYCByZWplY3RzLCB3ZSdsbCBoYXZlIHRoZSByZWFzb24gaGVyZVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgU2ltcGxlIEV4YW1wbGVcbiAgICAgIC0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIFN5bmNocm9ub3VzIEV4YW1wbGVcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgdmFyIHJlc3VsdDtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzdWx0ID0gZmluZFJlc3VsdCgpO1xuICAgICAgICAvLyBzdWNjZXNzXG4gICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAvLyBmYWlsdXJlXG4gICAgICB9XG4gICAgICBgYGBcblxuICAgICAgRXJyYmFjayBFeGFtcGxlXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kUmVzdWx0KGZ1bmN0aW9uKHJlc3VsdCwgZXJyKXtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIC8vIGZhaWx1cmVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBzdWNjZXNzXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIFByb21pc2UgRXhhbXBsZTtcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgZmluZFJlc3VsdCgpLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQWR2YW5jZWQgRXhhbXBsZVxuICAgICAgLS0tLS0tLS0tLS0tLS1cblxuICAgICAgU3luY2hyb25vdXMgRXhhbXBsZVxuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICB2YXIgYXV0aG9yLCBib29rcztcblxuICAgICAgdHJ5IHtcbiAgICAgICAgYXV0aG9yID0gZmluZEF1dGhvcigpO1xuICAgICAgICBib29rcyAgPSBmaW5kQm9va3NCeUF1dGhvcihhdXRob3IpO1xuICAgICAgICAvLyBzdWNjZXNzXG4gICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAvLyBmYWlsdXJlXG4gICAgICB9XG4gICAgICBgYGBcblxuICAgICAgRXJyYmFjayBFeGFtcGxlXG5cbiAgICAgIGBgYGpzXG5cbiAgICAgIGZ1bmN0aW9uIGZvdW5kQm9va3MoYm9va3MpIHtcblxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBmYWlsdXJlKHJlYXNvbikge1xuXG4gICAgICB9XG5cbiAgICAgIGZpbmRBdXRob3IoZnVuY3Rpb24oYXV0aG9yLCBlcnIpe1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgICAgIC8vIGZhaWx1cmVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgZmluZEJvb29rc0J5QXV0aG9yKGF1dGhvciwgZnVuY3Rpb24oYm9va3MsIGVycikge1xuICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICBmb3VuZEJvb2tzKGJvb2tzKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAgICAgICAgICAgZmFpbHVyZShyZWFzb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBjYXRjaChlcnJvcikge1xuICAgICAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBzdWNjZXNzXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIFByb21pc2UgRXhhbXBsZTtcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgZmluZEF1dGhvcigpLlxuICAgICAgICB0aGVuKGZpbmRCb29rc0J5QXV0aG9yKS5cbiAgICAgICAgdGhlbihmdW5jdGlvbihib29rcyl7XG4gICAgICAgICAgLy8gZm91bmQgYm9va3NcbiAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBAbWV0aG9kIHRoZW5cbiAgICAgIEBwYXJhbSB7RnVuY3Rpb259IG9uRnVsZmlsbGVkXG4gICAgICBAcGFyYW0ge0Z1bmN0aW9ufSBvblJlamVjdGVkXG4gICAgICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gICAgICBAcmV0dXJuIHtQcm9taXNlfVxuICAgICovXG4gICAgICB0aGVuOiBmdW5jdGlvbihvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICAgICAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICAgICAgdmFyIHN0YXRlID0gcGFyZW50Ll9zdGF0ZTtcblxuICAgICAgICBpZiAoc3RhdGUgPT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEZVTEZJTExFRCAmJiAhb25GdWxmaWxsbWVudCB8fCBzdGF0ZSA9PT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUkVKRUNURUQgJiYgIW9uUmVqZWN0aW9uKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY2hpbGQgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcihsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRub29wKTtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHBhcmVudC5fcmVzdWx0O1xuXG4gICAgICAgIGlmIChzdGF0ZSkge1xuICAgICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3VtZW50c1tzdGF0ZSAtIDFdO1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRkZWZhdWx0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRpbnZva2VDYWxsYmFjayhzdGF0ZSwgY2hpbGQsIGNhbGxiYWNrLCByZXN1bHQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hpbGQ7XG4gICAgICB9LFxuXG4gICAgLyoqXG4gICAgICBgY2F0Y2hgIGlzIHNpbXBseSBzdWdhciBmb3IgYHRoZW4odW5kZWZpbmVkLCBvblJlamVjdGlvbilgIHdoaWNoIG1ha2VzIGl0IHRoZSBzYW1lXG4gICAgICBhcyB0aGUgY2F0Y2ggYmxvY2sgb2YgYSB0cnkvY2F0Y2ggc3RhdGVtZW50LlxuXG4gICAgICBgYGBqc1xuICAgICAgZnVuY3Rpb24gZmluZEF1dGhvcigpe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkbid0IGZpbmQgdGhhdCBhdXRob3InKTtcbiAgICAgIH1cblxuICAgICAgLy8gc3luY2hyb25vdXNcbiAgICAgIHRyeSB7XG4gICAgICAgIGZpbmRBdXRob3IoKTtcbiAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gICAgICB9XG5cbiAgICAgIC8vIGFzeW5jIHdpdGggcHJvbWlzZXNcbiAgICAgIGZpbmRBdXRob3IoKS5jYXRjaChmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQG1ldGhvZCBjYXRjaFxuICAgICAgQHBhcmFtIHtGdW5jdGlvbn0gb25SZWplY3Rpb25cbiAgICAgIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgICAgIEByZXR1cm4ge1Byb21pc2V9XG4gICAgKi9cbiAgICAgICdjYXRjaCc6IGZ1bmN0aW9uKG9uUmVqZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRoZW4obnVsbCwgb25SZWplY3Rpb24pO1xuICAgICAgfVxuICAgIH07XG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHBvbHlmaWxsJCRwb2x5ZmlsbCgpIHtcbiAgICAgIHZhciBsb2NhbDtcblxuICAgICAgaWYgKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgbG9jYWwgPSBnbG9iYWw7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIGxvY2FsID0gc2VsZjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgbG9jYWwgPSBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdwb2x5ZmlsbCBmYWlsZWQgYmVjYXVzZSBnbG9iYWwgb2JqZWN0IGlzIHVuYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnQnKTtcbiAgICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciBQID0gbG9jYWwuUHJvbWlzZTtcblxuICAgICAgaWYgKFAgJiYgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKFAucmVzb2x2ZSgpKSA9PT0gJ1tvYmplY3QgUHJvbWlzZV0nICYmICFQLmNhc3QpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBsb2NhbC5Qcm9taXNlID0gbGliJGVzNiRwcm9taXNlJHByb21pc2UkJGRlZmF1bHQ7XG4gICAgfVxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkcG9seWZpbGwkJGRlZmF1bHQgPSBsaWIkZXM2JHByb21pc2UkcG9seWZpbGwkJHBvbHlmaWxsO1xuXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2UgPSB7XG4gICAgICAnUHJvbWlzZSc6IGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRkZWZhdWx0LFxuICAgICAgJ3BvbHlmaWxsJzogbGliJGVzNiRwcm9taXNlJHBvbHlmaWxsJCRkZWZhdWx0XG4gICAgfTtcblxuICAgIC8qIGdsb2JhbCBkZWZpbmU6dHJ1ZSBtb2R1bGU6dHJ1ZSB3aW5kb3c6IHRydWUgKi9cbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmVbJ2FtZCddKSB7XG4gICAgICBkZWZpbmUoZnVuY3Rpb24oKSB7IHJldHVybiBsaWIkZXM2JHByb21pc2UkdW1kJCRFUzZQcm9taXNlOyB9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZVsnZXhwb3J0cyddKSB7XG4gICAgICBtb2R1bGVbJ2V4cG9ydHMnXSA9IGxpYiRlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2U7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXNbJ0VTNlByb21pc2UnXSA9IGxpYiRlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2U7XG4gICAgfVxuXG4gICAgbGliJGVzNiRwcm9taXNlJHBvbHlmaWxsJCRkZWZhdWx0KCk7XG59KS5jYWxsKHRoaXMpO1xuXG4iLCJ2YXIgc2V0dGVyR2V0dGVyaWZ5ID0gcmVxdWlyZSgnc2V0dGVyLWdldHRlcmlmeScpO1xuXG5mdW5jdGlvbiBTYW1wbGVQbGF5ZXIoY29udGV4dCkge1xuXHR2YXIgbm9kZSA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuXHR2YXIgbm9kZVByb3BlcnRpZXMgPSB7XG5cdFx0YnVmZmVyOiBudWxsLFxuXHRcdGxvb3A6IGZhbHNlLFxuXHRcdGxvb3BTdGFydDogMCxcblx0XHRsb29wRW5kOiAwXG5cdH07XG5cblx0dmFyIGJ1ZmZlclNvdXJjZXNDb3VudCA9IDA7XG5cdHZhciBidWZmZXJTb3VyY2VzID0ge307XG5cdHZhciBidWZmZXJTb3VyY2VQcm9wZXJ0aWVzID0ge307XG5cblx0c2V0dGVyR2V0dGVyaWZ5KG5vZGUsIG5vZGVQcm9wZXJ0aWVzKTtcblxuXHQvLyBUT0RPOiBwbGF5YmFja1JhdGUgd2hpY2ggbmVlZHMgdG8gYmUgYW4gQXVkaW9QYXJhbVxuXHQvLyBUT0RPOiBwbGF5ZXIgY2FuIGJlIG1vbm8gb3IgcG9seSBpLmUuIG9ubHkgb25lIGJ1ZmZlciBjYW4gcGxheSBhdCBhIGdpdmVuIHRpbWUgb3IgbWFueSBjYW4gb3ZlcmxhcFxuXG5cdG5vZGUuc3RhcnQgPSBmdW5jdGlvbih3aGVuLCBvZmZzZXQsIGR1cmF0aW9uKSB7XG5cdFx0XG5cdFx0dmFyIGJ1ZmZlciA9IG5vZGVQcm9wZXJ0aWVzWydidWZmZXInXTtcblx0XHRpZighYnVmZmVyKSB7XG5cdFx0XHRjb25zb2xlLmluZm8oJ09wZW5NdXNpYyBTYW1wbGVQbGF5ZXI6IG5vIGJ1ZmZlciB0byBwbGF5LCBzbyBieWVlZSEnKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR3aGVuID0gd2hlbiAhPT0gdW5kZWZpbmVkID8gd2hlbiA6IDA7XG5cdFx0b2Zmc2V0ID0gb2Zmc2V0ICE9PSB1bmRlZmluZWQgPyBvZmZzZXQgOiAwO1xuXHRcdFxuXHRcdC8vIFRPRE8gVGhpcyBpcyBtZWdhIHVnbHkgYnV0IHVyZ2ggd2hhdCBpcyBnb2luZyBvbiB1cmdoXG5cdFx0Ly8gaWYgSSBqdXN0IHBhc3MgJ3VuZGVmaW5lZCcgYXMgZHVyYXRpb24gQ2hyb21lIGRvZXNuJ3QgcGxheSBhbnl0aGluZ1xuXHRcdGlmKHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdjb3JyZWN0aW5nIGZvciBjaHJvbWUgYWdoaCcpO1xuXHRcdFx0dmFyIHNhbXBsZUxlbmd0aCA9IGJ1ZmZlci5sZW5ndGg7XG5cdFx0XHRkdXJhdGlvbiA9IGR1cmF0aW9uICE9PSB1bmRlZmluZWQgPyBkdXJhdGlvbiA6IHNhbXBsZUxlbmd0aCAtIG9mZnNldDtcblx0XHR9XG5cblx0XHQvLyBNb25vOiBpbnZhbGlkYXRlIGFsbCBzY2hlZHVsZWQgYnVmZmVyU291cmNlcyB0byBtYWtlIHN1cmUgb25seSBvbmUgaXMgcGxheWVkIChyZXRyaWcgbW9kZSlcblx0XHQvLyBUT0RPIGltcGxlbWVudCBpbnZhbGlkYXRpb24gY29kZSAuLi5cblxuXHRcdC8vIFBvbHk6IGl0J3MgZmluZSwganVzdCBhZGQgYSBuZXcgb25lIHRvIHRoZSBsaXN0XG5cdFx0dmFyIGJzID0gbWFrZUJ1ZmZlclNvdXJjZSgpO1xuXG5cdFx0Ly8gY29uc29sZS5sb2coJ3N0YXJ0JywgJ3doZW4nLCB3aGVuLCAnb2Zmc2V0Jywgb2Zmc2V0LCAnZHVyYXRpb24nLCBkdXJhdGlvbik7XG5cdFx0YnMuc3RhcnQod2hlbiwgb2Zmc2V0LCBkdXJhdGlvbik7XG5cdFx0XG5cdH07XG5cblx0bm9kZS5zdG9wID0gZnVuY3Rpb24od2hlbikge1xuXHRcdC8vIEZvciBlYXNlIG9mIGRldmVsb3BtZW50LCB3ZSdsbCBqdXN0IHN0b3AgdG8gYWxsIHRoZSBzb3VyY2VzIGFuZCBlbXB0eSB0aGUgcXVldWVcblx0XHQvLyBJZiB5b3UgbmVlZCB0byByZS1zY2hlZHVsZSB0aGVtLCB5b3UnbGwgbmVlZCB0byBjYWxsIHN0YXJ0KCkgYWdhaW4uXG5cdFx0dmFyIGtleXMgPSBPYmplY3Qua2V5cyhidWZmZXJTb3VyY2VzKTtcblx0XHRrZXlzLmZvckVhY2goZnVuY3Rpb24oaykge1xuXHRcdFx0dmFyIHNvdXJjZSA9IGJ1ZmZlclNvdXJjZXNba107XG5cdFx0XHRzb3VyY2Uuc3RvcCh3aGVuKTtcblx0XHRcdHJlbW92ZUZyb21RdWV1ZShzb3VyY2UpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdG5vZGUuY2FuY2VsU2NoZWR1bGVkRXZlbnRzID0gZnVuY3Rpb24od2hlbikge1xuXHRcdC8vIFRPRE86IHdoZW4vaWYgdGhlcmUgaXMgYXV0b21hdGlvblxuXHR9O1xuXG5cdHJldHVybiBub2RlO1xuXHRcblx0Ly9+fn5cblxuXHRmdW5jdGlvbiBtYWtlQnVmZmVyU291cmNlKCkge1xuXG5cdFx0dmFyIHNvdXJjZSA9IGNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG5cdFx0c291cmNlLmFkZEV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgb25CdWZmZXJFbmRlZCk7XG5cdFx0c291cmNlLmNvbm5lY3Qobm9kZSk7XG5cdFx0c291cmNlLmlkID0gYnVmZmVyU291cmNlc0NvdW50Kys7XG5cdFx0YnVmZmVyU291cmNlc1tzb3VyY2UuaWRdID0gc291cmNlO1xuXG5cdFx0T2JqZWN0LmtleXMobm9kZVByb3BlcnRpZXMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuXHRcdFx0c291cmNlW25hbWVdID0gbm9kZVByb3BlcnRpZXNbbmFtZV07XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gc291cmNlO1xuXHRcdFxuXHR9XG5cblx0ZnVuY3Rpb24gb25CdWZmZXJFbmRlZChlKSB7XG5cdFx0dmFyIHNvdXJjZSA9IGUudGFyZ2V0O1xuXHRcdHNvdXJjZS5kaXNjb25uZWN0KCk7XG5cdFx0Ly8gYWxzbyByZW1vdmUgZnJvbSBsaXN0XG5cdFx0cmVtb3ZlRnJvbVF1ZXVlKHNvdXJjZSk7XG5cdH1cblxuXHRmdW5jdGlvbiByZW1vdmVGcm9tUXVldWUoc291cmNlKSB7XG5cdFx0ZGVsZXRlIGJ1ZmZlclNvdXJjZXNbc291cmNlLmlkXTtcblx0fVxuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2FtcGxlUGxheWVyO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBzZXR0ZXJHZXR0ZXJpZnk7XG5cblxuZnVuY3Rpb24gc2V0dGVyR2V0dGVyaWZ5KG9iamVjdCwgcHJvcGVydGllcywgY2FsbGJhY2tzKSB7XG5cdGNhbGxiYWNrcyA9IGNhbGxiYWNrcyB8fCB7fTtcblx0dmFyIGtleXMgPSBPYmplY3Qua2V5cyhwcm9wZXJ0aWVzKTtcblx0a2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIGtleSwgbWFrZUdldHRlclNldHRlcihwcm9wZXJ0aWVzLCBrZXksIGNhbGxiYWNrcykpO1xuXHR9KTtcbn1cblxuXG5mdW5jdGlvbiBtYWtlR2V0dGVyU2V0dGVyKHByb3BlcnRpZXMsIHByb3BlcnR5LCBjYWxsYmFja3MpIHtcblx0dmFyIGFmdGVyU2V0dGluZyA9IGNhbGxiYWNrcy5hZnRlclNldHRpbmcgfHwgZnVuY3Rpb24oKSB7fTtcblx0cmV0dXJuIHtcblx0XHRnZXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIGdldFByb3BlcnR5KHByb3BlcnRpZXMsIHByb3BlcnR5KTtcblx0XHR9LFxuXHRcdHNldDogZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHNldFByb3BlcnR5KHByb3BlcnRpZXMsIHByb3BlcnR5LCB2YWx1ZSk7XG5cdFx0XHRhZnRlclNldHRpbmcocHJvcGVydHksIHZhbHVlKTtcblx0XHR9LFxuXHRcdGVudW1lcmFibGU6IHRydWVcblx0fTtcbn1cblxuXG5mdW5jdGlvbiBnZXRQcm9wZXJ0eShwcm9wZXJ0aWVzLCBuYW1lKSB7XG5cdHJldHVybiBwcm9wZXJ0aWVzW25hbWVdO1xufVxuXG5cbmZ1bmN0aW9uIHNldFByb3BlcnR5KHByb3BlcnRpZXMsIG5hbWUsIHZhbHVlKSB7XG5cdHByb3BlcnRpZXNbbmFtZV0gPSB2YWx1ZTtcbn1cblxuXG4iLCIoZnVuY3Rpb24oKSB7XG5cdHZhciBwcm90byA9IE9iamVjdC5jcmVhdGUoSFRNTEVsZW1lbnQucHJvdG90eXBlKTtcblxuXHR2YXIgZGVmYXVsdFdpZHRoID0gMjAwO1xuXHR2YXIgZGVmYXVsdEhlaWdodCA9IDEwMDtcblxuXHRmdW5jdGlvbiByZW5kZXJXYXZlRGF0YShjYW52YXMsIGJ1ZmZlcikge1xuXHRcdHZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblx0XHR2YXIgY2FudmFzV2lkdGggPSBjYW52YXMud2lkdGg7XG5cdFx0dmFyIGNhbnZhc0hlaWdodCA9IGNhbnZhcy5oZWlnaHQ7XG5cdFx0dmFyIGNhbnZhc0hhbGZIZWlnaHQgPSBjYW52YXNIZWlnaHQgKiAwLjU7XG5cdFx0dmFyIGJ1ZmZlckxlbmd0aCA9IGJ1ZmZlci5sZW5ndGg7XG5cdFx0XG5cdFx0Y3R4LmxpbmVXaWR0aCA9IDE7XG5cdFx0Y3R4LnN0cm9rZVN0eWxlID0gJ3JnYigwLCAyNTUsIDApJztcblx0XHRjdHguYmVnaW5QYXRoKCk7XG5cdFx0dmFyIHNsaWNlV2lkdGggPSBjYW52YXNXaWR0aCAqIDEuMCAvIGJ1ZmZlckxlbmd0aDtcblx0XHR2YXIgeCA9IDA7XG5cdFx0Zm9yKHZhciBpID0gMDsgaSA8IGJ1ZmZlckxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgdiA9IDEgLSBidWZmZXJbaV07XG5cdFx0XHR2YXIgeSA9IHYgKiBjYW52YXNIYWxmSGVpZ2h0O1xuXHRcdFx0aWYoaSA9PT0gMCkge1xuXHRcdFx0XHRjdHgubW92ZVRvKHgsIHkpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y3R4LmxpbmVUbyh4LCB5KTtcblx0XHRcdH1cblx0XHRcdHggKz0gc2xpY2VXaWR0aDtcblx0XHR9XG5cdFx0Y3R4LmxpbmVUbyhjYW52YXNXaWR0aCwgY2FudmFzSGFsZkhlaWdodCk7XG5cdFx0Y3R4LnN0cm9rZSgpO1xuXHR9XG5cblx0cHJvdG8uY3JlYXRlZENhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuXHRcdGNhbnZhcy53aWR0aCA9IGRlZmF1bHRXaWR0aDtcblx0XHRjYW52YXMuaGVpZ2h0ID0gZGVmYXVsdEhlaWdodDtcblx0XHR0aGlzLmNhbnZhcyA9IGNhbnZhcztcblx0XHR0aGlzLmNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblx0XHR0aGlzLmFwcGVuZENoaWxkKGNhbnZhcyk7XG5cblx0XHR0aGlzLnJlc2V0Q2FudmFzKHRoaXMuY29udGV4dCk7XG5cblx0fTtcblxuXHRwcm90by5hdHRhY2hUbyA9IGZ1bmN0aW9uKGFuYWx5c2VyKSB7XG5cdFx0Y29uc29sZS5sb2coJ2F0dGFjaGVkIHRvIGFuYWx5c2VyIG5vZGUnLCBhbmFseXNlcik7XG5cblx0XHR2YXIgYnVmZmVyTGVuZ3RoID0gYW5hbHlzZXIuZnJlcXVlbmN5QmluQ291bnQ7XG5cdFx0dmFyIHJlc3VsdHNBcnJheSA9IG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyTGVuZ3RoKTtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRhbmltYXRlKCk7XG5cblx0XHRmdW5jdGlvbiBhbmltYXRlKCkge1xuXG5cdFx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5pbWF0ZSk7XG5cblx0XHRcdGFuYWx5c2VyLmdldEZsb2F0VGltZURvbWFpbkRhdGEocmVzdWx0c0FycmF5KTtcblxuXHRcdFx0c2VsZi5yZXNldENhbnZhcygpO1xuXHRcdFx0cmVuZGVyV2F2ZURhdGEoc2VsZi5jYW52YXMsIHJlc3VsdHNBcnJheSk7XG5cdFx0XHRcblx0XHR9XG5cblx0fTtcblxuXHRwcm90by5yZXNldENhbnZhcyA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBjdHggPSB0aGlzLmNvbnRleHQ7XG5cdFx0dmFyIGNhbnZhcyA9IHRoaXMuY2FudmFzO1xuXG5cdFx0Y3R4LmZpbGxTdHlsZSA9ICdyZ2JhKDAsIDUwLCAwLCAxKSc7XG5cdFx0Y3R4LmZpbGxSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XG5cdH07XG5cblx0Ly9cblxuXHR2YXIgY29tcG9uZW50ID0ge307XG5cdGNvbXBvbmVudC5wcm90b3R5cGUgPSBwcm90bztcblx0Y29tcG9uZW50LnJlZ2lzdGVyID0gZnVuY3Rpb24obmFtZSkge1xuXHRcdGRvY3VtZW50LnJlZ2lzdGVyRWxlbWVudChuYW1lLCB7XG5cdFx0XHRwcm90b3R5cGU6IHByb3RvXG5cdFx0fSk7XG5cdH07XG5cblx0aWYodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG5cdFx0ZGVmaW5lKGZ1bmN0aW9uKCkgeyByZXR1cm4gY29tcG9uZW50OyB9KTtcblx0fSBlbHNlIGlmKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBjb21wb25lbnQ7XG5cdH0gZWxzZSB7XG5cdFx0Y29tcG9uZW50LnJlZ2lzdGVyKCdvcGVubXVzaWMtb3NjaWxsb3Njb3BlJyk7IC8vIGF1dG9tYXRpYyByZWdpc3RyYXRpb25cblx0fVxuXG59KS5jYWxsKHRoaXMpO1xuXG4iLCIoZnVuY3Rpb24oKSB7XG5cdHZhciBwcm90byA9IE9iamVjdC5jcmVhdGUoSFRNTEVsZW1lbnQucHJvdG90eXBlKTtcblxuXHR2YXIgT3Blbk11c2ljU2xpZGVyID0gcmVxdWlyZSgnb3Blbm11c2ljLXNsaWRlcicpO1xuXG5cdHRyeSB7XG5cdFx0T3Blbk11c2ljU2xpZGVyLnJlZ2lzdGVyKCdvcGVubXVzaWMtc2xpZGVyJyk7XG5cdH0gY2F0Y2goZSkge1xuXHRcdC8vIFRoZSBzbGlkZXIgbWlnaHQgaGF2ZSBiZWVuIHJlZ2lzdGVyZWQgYWxyZWFkeSwgYnV0IGlmIHdlIHJlZ2lzdGVyIGFnYWluXG5cdFx0Ly8gaXQgd2lsbCB0aHJvdy4gU28gbGV0J3MgY2F0Y2ggaXQgYW5kIHNpbGVudGx5IHNodXQgdXAuXG5cdH1cblx0XG5cdHByb3RvLmNyZWF0ZWRDYWxsYmFjayA9IGZ1bmN0aW9uKCkge1xuXHRcdFxuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR0aGlzLnZhbHVlcyA9IHt9O1xuXG5cdFx0Ly8gbWFraW5nIHdlYiBjb21wb25lbnRzIE1XQyBmcmFtZXdvcmsgcHJvb2YuXG5cdFx0dGhpcy5pbm5lckhUTUwgPSAnJztcblxuXHRcdHZhciB0ZW1wbGF0ZUNvbnRlbnRzID0gXG5cdFx0XHQnPGJ1dHRvbiBjbGFzcz1cInBsYXlcIj5QbGF5PC9idXR0b24+JyArXG5cdFx0XHQnPGJ1dHRvbiBjbGFzcz1cInN0b3BcIiBkaXNhYmxlZD5TdG9wPC9idXR0b24+JyArXG5cdFx0XHQnPGxhYmVsPkJQTSA8b3Blbm11c2ljLXNsaWRlciBtaW49XCIxXCIgbWF4PVwiMzAwXCIgdmFsdWU9XCIxMjVcIj48L29wZW5tdXNpYy1zbGlkZXI+PC9sYWJlbD4nO1xuXHRcdHZhciB0ZW1wbGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG5cdFx0dGVtcGxhdGUuaW5uZXJIVE1MID0gdGVtcGxhdGVDb250ZW50cztcblxuXHRcdHZhciBsaXZlSFRNTCA9IGRvY3VtZW50LmltcG9ydE5vZGUodGVtcGxhdGUuY29udGVudCwgdHJ1ZSk7XG5cdFx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdGRpdi5hcHBlbmRDaGlsZChsaXZlSFRNTCk7XG5cdFx0XG5cdFx0dmFyIHBsYXlCdXR0b24gPSBkaXYucXVlcnlTZWxlY3RvcignW2NsYXNzPXBsYXldJyk7XG5cdFx0dmFyIHN0b3BCdXR0b24gPSBkaXYucXVlcnlTZWxlY3RvcignW2NsYXNzPXN0b3BdJyk7XG5cblx0XHRwbGF5QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRzZXRFbmFibGVkKHBsYXlCdXR0b24sIGZhbHNlKTtcblx0XHRcdHNldEVuYWJsZWQoc3RvcEJ1dHRvbiwgdHJ1ZSk7XG5cdFx0XHRkaXNwYXRjaEV2ZW50KCdwbGF5JywgdGhhdCk7XG5cdFx0fSk7XG5cblx0XHRzdG9wQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRzZXRFbmFibGVkKHBsYXlCdXR0b24sIHRydWUpO1xuXHRcdFx0c2V0RW5hYmxlZChzdG9wQnV0dG9uLCBmYWxzZSk7XG5cdFx0XHRkaXNwYXRjaEV2ZW50KCdzdG9wJywgdGhhdCk7XG5cdFx0fSk7XG5cblx0XHR2YXIgc2xpZGVyID0gZGl2LnF1ZXJ5U2VsZWN0b3IoJ29wZW5tdXNpYy1zbGlkZXInKTtcblx0XHRzbGlkZXIuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0XHRcdGRpc3BhdGNoRXZlbnQoJ2JwbScsIHRoYXQsIHsgdmFsdWU6IHNsaWRlci52YWx1ZSAqIDEuMCB9KTtcblx0XHR9KTtcblxuXHRcdHRoaXMuYXBwZW5kQ2hpbGQoZGl2KTtcblx0XHR0aGlzLnJlYWRBdHRyaWJ1dGVzKCk7XG5cdFx0XG5cdH07XG5cblx0XG5cdGZ1bmN0aW9uIGRpc3BhdGNoRXZlbnQodHlwZSwgZWxlbWVudCwgZGV0YWlsKSB7XG5cdFx0ZGV0YWlsID0gZGV0YWlsIHx8IHt9O1xuXHRcdFxuXHRcdHZhciBldiA9IG5ldyBDdXN0b21FdmVudCh0eXBlLCB7IGRldGFpbDogZGV0YWlsIH0pO1xuXHRcdGVsZW1lbnQuZGlzcGF0Y2hFdmVudChldik7XG5cdH1cblxuXHRmdW5jdGlvbiBzZXRFbmFibGVkKGJ1dHRvbiwgZW5hYmxlZCkge1xuXHRcdGlmKCFlbmFibGVkKSB7XG5cdFx0XHRidXR0b24uc2V0QXR0cmlidXRlKCdkaXNhYmxlZCcsICdkaXNhYmxlZCcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRidXR0b24ucmVtb3ZlQXR0cmlidXRlKCdkaXNhYmxlZCcpO1xuXHRcdH1cblx0fVxuXG5cdFxuXHRwcm90by5hdHRhY2hlZENhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG5cdH07XG5cblxuXHRwcm90by5kZXRhY2hlZENhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG5cdH07XG5cblxuXHRwcm90by5yZWFkQXR0cmlidXRlcyA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRbXS5mb3JFYWNoKGZ1bmN0aW9uKGF0dHIpIHtcblx0XHRcdHRoYXQuc2V0VmFsdWUoYXR0ciwgdGhhdC5nZXRBdHRyaWJ1dGUoYXR0cikpO1x0XHRcblx0XHR9KTtcblx0fTtcblxuXHRcblx0cHJvdG8uc2V0VmFsdWUgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuXG5cdFx0aWYodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuXHRcdFx0dGhpcy52YWx1ZXNbbmFtZV0gPSB2YWx1ZTtcblx0XHR9XG5cblx0XHQvLyBUT0RPOiBQb3RlbnRpYWwgcmUtZHJhdyBvciBET00gdXBkYXRlIGluIHJlYWN0aW9uIHRvIHRoZXNlIHZhbHVlc1xuXHR9O1xuXG5cblx0cHJvdG8uZ2V0VmFsdWUgPSBmdW5jdGlvbihuYW1lKSB7XG5cdFx0cmV0dXJuIHRoaXMudmFsdWVzW25hbWVdO1xuXHR9O1xuXG5cdFxuXHRwcm90by5hdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2sgPSBmdW5jdGlvbihhdHRyLCBvbGRWYWx1ZSwgbmV3VmFsdWUsIG5hbWVzcGFjZSkge1xuXHRcdFxuXHRcdHRoaXMuc2V0VmFsdWUoYXR0ciwgbmV3VmFsdWUpO1xuXHRcdFxuXHRcdC8vIHZhciBlID0gbmV3IEN1c3RvbUV2ZW50KCdjaGFuZ2UnLCB7IGRldGFpbDogdGhpcy52YWx1ZXMgfSB9KTtcblx0XHQvLyB0aGlzLmRpc3BhdGNoRXZlbnQoZSk7XG5cdFx0XG5cdH07XG5cblxuXHQvLyBPcHRpb25hbDogZm9yIGNvbXBvbmVudHMgdGhhdCByZXByZXNlbnQgYW4gYXVkaW8gbm9kZVxuXHRwcm90by5hdHRhY2hUbyA9IGZ1bmN0aW9uKGF1ZGlvTm9kZSkge1xuXHRcdGF1ZGlvTm9kZS5hZGRFdmVudExpc3RlbmVyKCdzb21lZXZlbnQnLCBmdW5jdGlvbihlKSB7XG5cdFx0XHQvLyAuLi5cblx0XHR9KTtcblx0fTtcblxuXG5cdC8vXG5cblxuXHR2YXIgY29tcG9uZW50ID0ge307XG5cdGNvbXBvbmVudC5wcm90b3R5cGUgPSBwcm90bztcblx0Y29tcG9uZW50LnJlZ2lzdGVyID0gZnVuY3Rpb24obmFtZSkge1xuXHRcdGRvY3VtZW50LnJlZ2lzdGVyRWxlbWVudChuYW1lLCB7XG5cdFx0XHRwcm90b3R5cGU6IHByb3RvXG5cdFx0fSk7XG5cdH07XG5cblx0aWYodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG5cdFx0ZGVmaW5lKGZ1bmN0aW9uKCkgeyByZXR1cm4gY29tcG9uZW50OyB9KTtcblx0fSBlbHNlIGlmKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBjb21wb25lbnQ7XG5cdH0gZWxzZSB7XG5cdFx0Y29tcG9uZW50LnJlZ2lzdGVyKCdvcGVubXVzaWMtd2ViLWNvbXBvbmVudC10ZW1wbGF0ZScpOyAvLyBhdXRvbWF0aWMgcmVnaXN0cmF0aW9uXG5cdH1cblxufSkuY2FsbCh0aGlzKTtcblxuIiwiKGZ1bmN0aW9uKCkge1xuXG5cdHZhciBzZXR0ZXJHZXR0ZXJpZnkgPSByZXF1aXJlKCdzZXR0ZXItZ2V0dGVyaWZ5Jyk7XG5cblx0Ly8gSWRlYWxseSBpdCB3b3VsZCBiZSBiZXR0ZXIgdG8gZXh0ZW5kIHRoZSBIVE1MSW5wdXRFbGVtZW50IHByb3RvdHlwZSBidXRcblx0Ly8gaXQgZG9lc24ndCBzZWVtIHRvIGJlIHdvcmtpbmcgYW5kIEkgZG9uJ3QgZ2V0IGFueSBkaXN0aW5jdCBlbGVtZW50IGF0IGFsbFxuXHQvLyBvciBJIGdldCBhbiBcIlR5cGVFcnJvcjogJ3R5cGUnIHNldHRlciBjYWxsZWQgb24gYW4gb2JqZWN0IHRoYXQgZG9lcyBub3QgaW1wbGVtZW50IGludGVyZmFjZSBIVE1MSW5wdXRFbGVtZW50LlwiXG5cdC8vIC4uLiBzbyB1c2luZyBqdXN0IEhUTUxFbGVtZW50IGZvciBub3dcblx0dmFyIHByb3RvID0gT2JqZWN0LmNyZWF0ZShIVE1MRWxlbWVudC5wcm90b3R5cGUpO1xuXG5cdHByb3RvLmNyZWF0ZWRDYWxsYmFjayA9IGZ1bmN0aW9uKCkge1xuXG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXG5cdFx0Ly8gVmFsdWVzXG5cdFx0dmFyIHByb3BlcnRpZXMgPSB7XG5cdFx0XHRtaW46IDAsXG5cdFx0XHRtYXg6IDEwMCxcblx0XHRcdHZhbHVlOiA1MCxcblx0XHRcdHN0ZXA6IDFcblx0XHR9O1xuXG5cdFx0c2V0dGVyR2V0dGVyaWZ5KHRoaXMsIHByb3BlcnRpZXMsIHtcblx0XHRcdGFmdGVyU2V0dGluZzogZnVuY3Rpb24ocHJvcGVydHksIHZhbHVlKSB7XG5cdFx0XHRcdHVwZGF0ZURpc3BsYXkodGhhdCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFxuXHRcdHRoaXMuX3Byb3BlcnRpZXMgPSBwcm9wZXJ0aWVzO1xuXG5cdFx0Ly8gTWFya3VwXG5cdFx0dmFyIHNsaWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG5cdFx0c2xpZGVyLnR5cGUgPSAncmFuZ2UnO1xuXG5cdFx0dmFyIHZhbHVlU3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblxuXHRcdHRoaXMuX3NsaWRlciA9IHNsaWRlcjtcblx0XHR0aGlzLl92YWx1ZVNwYW4gPSB2YWx1ZVNwYW47XG5cblx0XHR0aGlzLmFwcGVuZENoaWxkKHNsaWRlcik7XG5cdFx0dGhpcy5hcHBlbmRDaGlsZCh2YWx1ZVNwYW4pO1xuXG5cdFx0c2xpZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGF0LnZhbHVlID0gc2xpZGVyLnZhbHVlICogMS4wO1xuXHRcdH0pO1xuXG5cdH07XG5cblx0XG5cdHZhciBzbGlkZXJBdHRyaWJ1dGVzID0gWyAnbWluJywgJ21heCcsICd2YWx1ZScsICdzdGVwJyBdO1xuXG5cdHByb3RvLmF0dGFjaGVkQ2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcblxuXHRcdHZhciBhdHRycyA9IHRoaXMuYXR0cmlidXRlcztcblx0XHR2YXIgdmFsdWVJc1RoZXJlID0gZmFsc2U7XG5cdFxuXHRcdGZvcih2YXIgaSA9IDA7IGkgPCBhdHRycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGF0dHIgPSBhdHRyc1tpXTtcblxuXHRcdFx0aWYoYXR0ci5uYW1lID09PSAndmFsdWUnKSB7XG5cdFx0XHRcdHZhbHVlSXNUaGVyZSA9IHRydWU7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEp1c3Qgc2VuZGluZyBzZW5zaWJsZSBhdHRyaWJ1dGVzIHRvIHRoZSBzbGlkZXIgaXRzZWxmXG5cdFx0XHRpZihzbGlkZXJBdHRyaWJ1dGVzLmluZGV4T2YoYXR0ci5uYW1lKSAhPT0gLTEpIHtcblx0XHRcdFx0dGhpcy5fcHJvcGVydGllc1thdHRyLm5hbWVdID0gYXR0ci52YWx1ZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBJZiBub3Qgc3BlY2lmaWVkLCB0aGUgZGVmYXVsdCB2YWx1ZSBoYXMgdG8gYmUgXG5cdFx0Ly8gKG1pbiArIG1heCkgLyAyIGFzIHRoZSBub3JtYWwgc2xpZGVyIHdvdWxkIGRvIGFzIHdlbGwuXG5cdFx0aWYoIXZhbHVlSXNUaGVyZSkge1xuXHRcdFx0dmFyIGNhbGN1bGF0ZWRWYWx1ZSA9ICh0aGlzLl9wcm9wZXJ0aWVzLm1pbiAqIDEuMCArIHRoaXMuX3Byb3BlcnRpZXMubWF4ICogMS4wKSAvIDIuMDtcblx0XHRcdHRoaXMuX3Byb3BlcnRpZXMudmFsdWUgPSBjYWxjdWxhdGVkVmFsdWU7XG5cdFx0fVxuXG5cdFx0dXBkYXRlRGlzcGxheSh0aGlzKTtcblxuXHR9O1xuXG5cblx0ZnVuY3Rpb24gdXBkYXRlRGlzcGxheShjb21wbykge1xuXHRcdGNvbXBvLl92YWx1ZVNwYW4uaW5uZXJIVE1MID0gY29tcG8uX3Byb3BlcnRpZXMudmFsdWU7XG5cdFx0Y29tcG8uX3NsaWRlci52YWx1ZSA9IGNvbXBvLl9wcm9wZXJ0aWVzLnZhbHVlO1xuXHRcdGNvbXBvLl9zbGlkZXIubWluID0gY29tcG8uX3Byb3BlcnRpZXMubWluO1xuXHRcdGNvbXBvLl9zbGlkZXIubWF4ID0gY29tcG8uX3Byb3BlcnRpZXMubWF4O1xuXHRcdGNvbXBvLl9zbGlkZXIuc3RlcCA9IGNvbXBvLl9wcm9wZXJ0aWVzLnN0ZXA7XG5cdH1cblxuXHQvL1xuXG5cdHZhciBjb21wb25lbnQgPSB7fTtcblx0Y29tcG9uZW50LnByb3RvdHlwZSA9IHByb3RvO1xuXHRjb21wb25lbnQucmVnaXN0ZXIgPSBmdW5jdGlvbihuYW1lKSB7XG5cdFx0ZG9jdW1lbnQucmVnaXN0ZXJFbGVtZW50KG5hbWUsIHtcblx0XHRcdHByb3RvdHlwZTogcHJvdG9cblx0XHR9KTtcblx0fTtcblxuXHRpZih0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcblx0XHRkZWZpbmUoZnVuY3Rpb24oKSB7IHJldHVybiBjb21wb25lbnQ7IH0pO1xuXHR9IGVsc2UgaWYodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGNvbXBvbmVudDtcblx0fSBlbHNlIHtcblx0XHRjb21wb25lbnQucmVnaXN0ZXIoJ29wZW5tdXNpYy1zbGlkZXInKTsgLy8gYXV0b21hdGljIHJlZ2lzdHJhdGlvblxuXHR9XG5cbn0pLmNhbGwodGhpcyk7XG5cblxuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE0IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdCBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXQgaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXQgaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0IGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG4vLyBAdmVyc2lvbiAwLjYuMC01OGM4NzA5XG53aW5kb3cuV2ViQ29tcG9uZW50cyA9IHdpbmRvdy5XZWJDb21wb25lbnRzIHx8IHt9O1xuXG4oZnVuY3Rpb24oc2NvcGUpIHtcbiAgdmFyIGZsYWdzID0gc2NvcGUuZmxhZ3MgfHwge307XG4gIHZhciBmaWxlID0gXCJ3ZWJjb21wb25lbnRzLmpzXCI7XG4gIHZhciBzY3JpcHQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdzY3JpcHRbc3JjKj1cIicgKyBmaWxlICsgJ1wiXScpO1xuICBpZiAoIWZsYWdzLm5vT3B0cykge1xuICAgIGxvY2F0aW9uLnNlYXJjaC5zbGljZSgxKS5zcGxpdChcIiZcIikuZm9yRWFjaChmdW5jdGlvbihvKSB7XG4gICAgICBvID0gby5zcGxpdChcIj1cIik7XG4gICAgICBvWzBdICYmIChmbGFnc1tvWzBdXSA9IG9bMV0gfHwgdHJ1ZSk7XG4gICAgfSk7XG4gICAgaWYgKHNjcmlwdCkge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGE7IGEgPSBzY3JpcHQuYXR0cmlidXRlc1tpXTsgaSsrKSB7XG4gICAgICAgIGlmIChhLm5hbWUgIT09IFwic3JjXCIpIHtcbiAgICAgICAgICBmbGFnc1thLm5hbWVdID0gYS52YWx1ZSB8fCB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChmbGFncy5sb2cpIHtcbiAgICAgIHZhciBwYXJ0cyA9IGZsYWdzLmxvZy5zcGxpdChcIixcIik7XG4gICAgICBmbGFncy5sb2cgPSB7fTtcbiAgICAgIHBhcnRzLmZvckVhY2goZnVuY3Rpb24oZikge1xuICAgICAgICBmbGFncy5sb2dbZl0gPSB0cnVlO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZsYWdzLmxvZyA9IHt9O1xuICAgIH1cbiAgfVxuICBmbGFncy5zaGFkb3cgPSBmbGFncy5zaGFkb3cgfHwgZmxhZ3Muc2hhZG93ZG9tIHx8IGZsYWdzLnBvbHlmaWxsO1xuICBpZiAoZmxhZ3Muc2hhZG93ID09PSBcIm5hdGl2ZVwiKSB7XG4gICAgZmxhZ3Muc2hhZG93ID0gZmFsc2U7XG4gIH0gZWxzZSB7XG4gICAgZmxhZ3Muc2hhZG93ID0gZmxhZ3Muc2hhZG93IHx8ICFIVE1MRWxlbWVudC5wcm90b3R5cGUuY3JlYXRlU2hhZG93Um9vdDtcbiAgfVxuICBpZiAoZmxhZ3MucmVnaXN0ZXIpIHtcbiAgICB3aW5kb3cuQ3VzdG9tRWxlbWVudHMgPSB3aW5kb3cuQ3VzdG9tRWxlbWVudHMgfHwge1xuICAgICAgZmxhZ3M6IHt9XG4gICAgfTtcbiAgICB3aW5kb3cuQ3VzdG9tRWxlbWVudHMuZmxhZ3MucmVnaXN0ZXIgPSBmbGFncy5yZWdpc3RlcjtcbiAgfVxuICBzY29wZS5mbGFncyA9IGZsYWdzO1xufSkoV2ViQ29tcG9uZW50cyk7XG5cbihmdW5jdGlvbihzY29wZSkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIGhhc1dvcmtpbmdVcmwgPSBmYWxzZTtcbiAgaWYgKCFzY29wZS5mb3JjZUpVUkwpIHtcbiAgICB0cnkge1xuICAgICAgdmFyIHUgPSBuZXcgVVJMKFwiYlwiLCBcImh0dHA6Ly9hXCIpO1xuICAgICAgdS5wYXRobmFtZSA9IFwiYyUyMGRcIjtcbiAgICAgIGhhc1dvcmtpbmdVcmwgPSB1LmhyZWYgPT09IFwiaHR0cDovL2EvYyUyMGRcIjtcbiAgICB9IGNhdGNoIChlKSB7fVxuICB9XG4gIGlmIChoYXNXb3JraW5nVXJsKSByZXR1cm47XG4gIHZhciByZWxhdGl2ZSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIHJlbGF0aXZlW1wiZnRwXCJdID0gMjE7XG4gIHJlbGF0aXZlW1wiZmlsZVwiXSA9IDA7XG4gIHJlbGF0aXZlW1wiZ29waGVyXCJdID0gNzA7XG4gIHJlbGF0aXZlW1wiaHR0cFwiXSA9IDgwO1xuICByZWxhdGl2ZVtcImh0dHBzXCJdID0gNDQzO1xuICByZWxhdGl2ZVtcIndzXCJdID0gODA7XG4gIHJlbGF0aXZlW1wid3NzXCJdID0gNDQzO1xuICB2YXIgcmVsYXRpdmVQYXRoRG90TWFwcGluZyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIHJlbGF0aXZlUGF0aERvdE1hcHBpbmdbXCIlMmVcIl0gPSBcIi5cIjtcbiAgcmVsYXRpdmVQYXRoRG90TWFwcGluZ1tcIi4lMmVcIl0gPSBcIi4uXCI7XG4gIHJlbGF0aXZlUGF0aERvdE1hcHBpbmdbXCIlMmUuXCJdID0gXCIuLlwiO1xuICByZWxhdGl2ZVBhdGhEb3RNYXBwaW5nW1wiJTJlJTJlXCJdID0gXCIuLlwiO1xuICBmdW5jdGlvbiBpc1JlbGF0aXZlU2NoZW1lKHNjaGVtZSkge1xuICAgIHJldHVybiByZWxhdGl2ZVtzY2hlbWVdICE9PSB1bmRlZmluZWQ7XG4gIH1cbiAgZnVuY3Rpb24gaW52YWxpZCgpIHtcbiAgICBjbGVhci5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX2lzSW52YWxpZCA9IHRydWU7XG4gIH1cbiAgZnVuY3Rpb24gSUROQVRvQVNDSUkoaCkge1xuICAgIGlmIChcIlwiID09IGgpIHtcbiAgICAgIGludmFsaWQuY2FsbCh0aGlzKTtcbiAgICB9XG4gICAgcmV0dXJuIGgudG9Mb3dlckNhc2UoKTtcbiAgfVxuICBmdW5jdGlvbiBwZXJjZW50RXNjYXBlKGMpIHtcbiAgICB2YXIgdW5pY29kZSA9IGMuY2hhckNvZGVBdCgwKTtcbiAgICBpZiAodW5pY29kZSA+IDMyICYmIHVuaWNvZGUgPCAxMjcgJiYgWyAzNCwgMzUsIDYwLCA2MiwgNjMsIDk2IF0uaW5kZXhPZih1bmljb2RlKSA9PSAtMSkge1xuICAgICAgcmV0dXJuIGM7XG4gICAgfVxuICAgIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQoYyk7XG4gIH1cbiAgZnVuY3Rpb24gcGVyY2VudEVzY2FwZVF1ZXJ5KGMpIHtcbiAgICB2YXIgdW5pY29kZSA9IGMuY2hhckNvZGVBdCgwKTtcbiAgICBpZiAodW5pY29kZSA+IDMyICYmIHVuaWNvZGUgPCAxMjcgJiYgWyAzNCwgMzUsIDYwLCA2MiwgOTYgXS5pbmRleE9mKHVuaWNvZGUpID09IC0xKSB7XG4gICAgICByZXR1cm4gYztcbiAgICB9XG4gICAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChjKTtcbiAgfVxuICB2YXIgRU9GID0gdW5kZWZpbmVkLCBBTFBIQSA9IC9bYS16QS1aXS8sIEFMUEhBTlVNRVJJQyA9IC9bYS16QS1aMC05XFwrXFwtXFwuXS87XG4gIGZ1bmN0aW9uIHBhcnNlKGlucHV0LCBzdGF0ZU92ZXJyaWRlLCBiYXNlKSB7XG4gICAgZnVuY3Rpb24gZXJyKG1lc3NhZ2UpIHtcbiAgICAgIGVycm9ycy5wdXNoKG1lc3NhZ2UpO1xuICAgIH1cbiAgICB2YXIgc3RhdGUgPSBzdGF0ZU92ZXJyaWRlIHx8IFwic2NoZW1lIHN0YXJ0XCIsIGN1cnNvciA9IDAsIGJ1ZmZlciA9IFwiXCIsIHNlZW5BdCA9IGZhbHNlLCBzZWVuQnJhY2tldCA9IGZhbHNlLCBlcnJvcnMgPSBbXTtcbiAgICBsb29wOiB3aGlsZSAoKGlucHV0W2N1cnNvciAtIDFdICE9IEVPRiB8fCBjdXJzb3IgPT0gMCkgJiYgIXRoaXMuX2lzSW52YWxpZCkge1xuICAgICAgdmFyIGMgPSBpbnB1dFtjdXJzb3JdO1xuICAgICAgc3dpdGNoIChzdGF0ZSkge1xuICAgICAgIGNhc2UgXCJzY2hlbWUgc3RhcnRcIjpcbiAgICAgICAgaWYgKGMgJiYgQUxQSEEudGVzdChjKSkge1xuICAgICAgICAgIGJ1ZmZlciArPSBjLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgc3RhdGUgPSBcInNjaGVtZVwiO1xuICAgICAgICB9IGVsc2UgaWYgKCFzdGF0ZU92ZXJyaWRlKSB7XG4gICAgICAgICAgYnVmZmVyID0gXCJcIjtcbiAgICAgICAgICBzdGF0ZSA9IFwibm8gc2NoZW1lXCI7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZXJyKFwiSW52YWxpZCBzY2hlbWUuXCIpO1xuICAgICAgICAgIGJyZWFrIGxvb3A7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG5cbiAgICAgICBjYXNlIFwic2NoZW1lXCI6XG4gICAgICAgIGlmIChjICYmIEFMUEhBTlVNRVJJQy50ZXN0KGMpKSB7XG4gICAgICAgICAgYnVmZmVyICs9IGMudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgfSBlbHNlIGlmIChcIjpcIiA9PSBjKSB7XG4gICAgICAgICAgdGhpcy5fc2NoZW1lID0gYnVmZmVyO1xuICAgICAgICAgIGJ1ZmZlciA9IFwiXCI7XG4gICAgICAgICAgaWYgKHN0YXRlT3ZlcnJpZGUpIHtcbiAgICAgICAgICAgIGJyZWFrIGxvb3A7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpc1JlbGF0aXZlU2NoZW1lKHRoaXMuX3NjaGVtZSkpIHtcbiAgICAgICAgICAgIHRoaXMuX2lzUmVsYXRpdmUgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoXCJmaWxlXCIgPT0gdGhpcy5fc2NoZW1lKSB7XG4gICAgICAgICAgICBzdGF0ZSA9IFwicmVsYXRpdmVcIjtcbiAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2lzUmVsYXRpdmUgJiYgYmFzZSAmJiBiYXNlLl9zY2hlbWUgPT0gdGhpcy5fc2NoZW1lKSB7XG4gICAgICAgICAgICBzdGF0ZSA9IFwicmVsYXRpdmUgb3IgYXV0aG9yaXR5XCI7XG4gICAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9pc1JlbGF0aXZlKSB7XG4gICAgICAgICAgICBzdGF0ZSA9IFwiYXV0aG9yaXR5IGZpcnN0IHNsYXNoXCI7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0YXRlID0gXCJzY2hlbWUgZGF0YVwiO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghc3RhdGVPdmVycmlkZSkge1xuICAgICAgICAgIGJ1ZmZlciA9IFwiXCI7XG4gICAgICAgICAgY3Vyc29yID0gMDtcbiAgICAgICAgICBzdGF0ZSA9IFwibm8gc2NoZW1lXCI7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSBpZiAoRU9GID09IGMpIHtcbiAgICAgICAgICBicmVhayBsb29wO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVycihcIkNvZGUgcG9pbnQgbm90IGFsbG93ZWQgaW4gc2NoZW1lOiBcIiArIGMpO1xuICAgICAgICAgIGJyZWFrIGxvb3A7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG5cbiAgICAgICBjYXNlIFwic2NoZW1lIGRhdGFcIjpcbiAgICAgICAgaWYgKFwiP1wiID09IGMpIHtcbiAgICAgICAgICBxdWVyeSA9IFwiP1wiO1xuICAgICAgICAgIHN0YXRlID0gXCJxdWVyeVwiO1xuICAgICAgICB9IGVsc2UgaWYgKFwiI1wiID09IGMpIHtcbiAgICAgICAgICB0aGlzLl9mcmFnbWVudCA9IFwiI1wiO1xuICAgICAgICAgIHN0YXRlID0gXCJmcmFnbWVudFwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChFT0YgIT0gYyAmJiBcIlx0XCIgIT0gYyAmJiBcIlxcblwiICE9IGMgJiYgXCJcXHJcIiAhPSBjKSB7XG4gICAgICAgICAgICB0aGlzLl9zY2hlbWVEYXRhICs9IHBlcmNlbnRFc2NhcGUoYyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICAgY2FzZSBcIm5vIHNjaGVtZVwiOlxuICAgICAgICBpZiAoIWJhc2UgfHwgIWlzUmVsYXRpdmVTY2hlbWUoYmFzZS5fc2NoZW1lKSkge1xuICAgICAgICAgIGVycihcIk1pc3Npbmcgc2NoZW1lLlwiKTtcbiAgICAgICAgICBpbnZhbGlkLmNhbGwodGhpcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RhdGUgPSBcInJlbGF0aXZlXCI7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG5cbiAgICAgICBjYXNlIFwicmVsYXRpdmUgb3IgYXV0aG9yaXR5XCI6XG4gICAgICAgIGlmIChcIi9cIiA9PSBjICYmIFwiL1wiID09IGlucHV0W2N1cnNvciArIDFdKSB7XG4gICAgICAgICAgc3RhdGUgPSBcImF1dGhvcml0eSBpZ25vcmUgc2xhc2hlc1wiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVycihcIkV4cGVjdGVkIC8sIGdvdDogXCIgKyBjKTtcbiAgICAgICAgICBzdGF0ZSA9IFwicmVsYXRpdmVcIjtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcblxuICAgICAgIGNhc2UgXCJyZWxhdGl2ZVwiOlxuICAgICAgICB0aGlzLl9pc1JlbGF0aXZlID0gdHJ1ZTtcbiAgICAgICAgaWYgKFwiZmlsZVwiICE9IHRoaXMuX3NjaGVtZSkgdGhpcy5fc2NoZW1lID0gYmFzZS5fc2NoZW1lO1xuICAgICAgICBpZiAoRU9GID09IGMpIHtcbiAgICAgICAgICB0aGlzLl9ob3N0ID0gYmFzZS5faG9zdDtcbiAgICAgICAgICB0aGlzLl9wb3J0ID0gYmFzZS5fcG9ydDtcbiAgICAgICAgICB0aGlzLl9wYXRoID0gYmFzZS5fcGF0aC5zbGljZSgpO1xuICAgICAgICAgIHRoaXMuX3F1ZXJ5ID0gYmFzZS5fcXVlcnk7XG4gICAgICAgICAgYnJlYWsgbG9vcDtcbiAgICAgICAgfSBlbHNlIGlmIChcIi9cIiA9PSBjIHx8IFwiXFxcXFwiID09IGMpIHtcbiAgICAgICAgICBpZiAoXCJcXFxcXCIgPT0gYykgZXJyKFwiXFxcXCBpcyBhbiBpbnZhbGlkIGNvZGUgcG9pbnQuXCIpO1xuICAgICAgICAgIHN0YXRlID0gXCJyZWxhdGl2ZSBzbGFzaFwiO1xuICAgICAgICB9IGVsc2UgaWYgKFwiP1wiID09IGMpIHtcbiAgICAgICAgICB0aGlzLl9ob3N0ID0gYmFzZS5faG9zdDtcbiAgICAgICAgICB0aGlzLl9wb3J0ID0gYmFzZS5fcG9ydDtcbiAgICAgICAgICB0aGlzLl9wYXRoID0gYmFzZS5fcGF0aC5zbGljZSgpO1xuICAgICAgICAgIHRoaXMuX3F1ZXJ5ID0gXCI/XCI7XG4gICAgICAgICAgc3RhdGUgPSBcInF1ZXJ5XCI7XG4gICAgICAgIH0gZWxzZSBpZiAoXCIjXCIgPT0gYykge1xuICAgICAgICAgIHRoaXMuX2hvc3QgPSBiYXNlLl9ob3N0O1xuICAgICAgICAgIHRoaXMuX3BvcnQgPSBiYXNlLl9wb3J0O1xuICAgICAgICAgIHRoaXMuX3BhdGggPSBiYXNlLl9wYXRoLnNsaWNlKCk7XG4gICAgICAgICAgdGhpcy5fcXVlcnkgPSBiYXNlLl9xdWVyeTtcbiAgICAgICAgICB0aGlzLl9mcmFnbWVudCA9IFwiI1wiO1xuICAgICAgICAgIHN0YXRlID0gXCJmcmFnbWVudFwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBuZXh0QyA9IGlucHV0W2N1cnNvciArIDFdO1xuICAgICAgICAgIHZhciBuZXh0TmV4dEMgPSBpbnB1dFtjdXJzb3IgKyAyXTtcbiAgICAgICAgICBpZiAoXCJmaWxlXCIgIT0gdGhpcy5fc2NoZW1lIHx8ICFBTFBIQS50ZXN0KGMpIHx8IG5leHRDICE9IFwiOlwiICYmIG5leHRDICE9IFwifFwiIHx8IEVPRiAhPSBuZXh0TmV4dEMgJiYgXCIvXCIgIT0gbmV4dE5leHRDICYmIFwiXFxcXFwiICE9IG5leHROZXh0QyAmJiBcIj9cIiAhPSBuZXh0TmV4dEMgJiYgXCIjXCIgIT0gbmV4dE5leHRDKSB7XG4gICAgICAgICAgICB0aGlzLl9ob3N0ID0gYmFzZS5faG9zdDtcbiAgICAgICAgICAgIHRoaXMuX3BvcnQgPSBiYXNlLl9wb3J0O1xuICAgICAgICAgICAgdGhpcy5fcGF0aCA9IGJhc2UuX3BhdGguc2xpY2UoKTtcbiAgICAgICAgICAgIHRoaXMuX3BhdGgucG9wKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHN0YXRlID0gXCJyZWxhdGl2ZSBwYXRoXCI7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG5cbiAgICAgICBjYXNlIFwicmVsYXRpdmUgc2xhc2hcIjpcbiAgICAgICAgaWYgKFwiL1wiID09IGMgfHwgXCJcXFxcXCIgPT0gYykge1xuICAgICAgICAgIGlmIChcIlxcXFxcIiA9PSBjKSB7XG4gICAgICAgICAgICBlcnIoXCJcXFxcIGlzIGFuIGludmFsaWQgY29kZSBwb2ludC5cIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChcImZpbGVcIiA9PSB0aGlzLl9zY2hlbWUpIHtcbiAgICAgICAgICAgIHN0YXRlID0gXCJmaWxlIGhvc3RcIjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RhdGUgPSBcImF1dGhvcml0eSBpZ25vcmUgc2xhc2hlc1wiO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoXCJmaWxlXCIgIT0gdGhpcy5fc2NoZW1lKSB7XG4gICAgICAgICAgICB0aGlzLl9ob3N0ID0gYmFzZS5faG9zdDtcbiAgICAgICAgICAgIHRoaXMuX3BvcnQgPSBiYXNlLl9wb3J0O1xuICAgICAgICAgIH1cbiAgICAgICAgICBzdGF0ZSA9IFwicmVsYXRpdmUgcGF0aFwiO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICAgY2FzZSBcImF1dGhvcml0eSBmaXJzdCBzbGFzaFwiOlxuICAgICAgICBpZiAoXCIvXCIgPT0gYykge1xuICAgICAgICAgIHN0YXRlID0gXCJhdXRob3JpdHkgc2Vjb25kIHNsYXNoXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZXJyKFwiRXhwZWN0ZWQgJy8nLCBnb3Q6IFwiICsgYyk7XG4gICAgICAgICAgc3RhdGUgPSBcImF1dGhvcml0eSBpZ25vcmUgc2xhc2hlc1wiO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICAgY2FzZSBcImF1dGhvcml0eSBzZWNvbmQgc2xhc2hcIjpcbiAgICAgICAgc3RhdGUgPSBcImF1dGhvcml0eSBpZ25vcmUgc2xhc2hlc1wiO1xuICAgICAgICBpZiAoXCIvXCIgIT0gYykge1xuICAgICAgICAgIGVycihcIkV4cGVjdGVkICcvJywgZ290OiBcIiArIGMpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICAgY2FzZSBcImF1dGhvcml0eSBpZ25vcmUgc2xhc2hlc1wiOlxuICAgICAgICBpZiAoXCIvXCIgIT0gYyAmJiBcIlxcXFxcIiAhPSBjKSB7XG4gICAgICAgICAgc3RhdGUgPSBcImF1dGhvcml0eVwiO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVycihcIkV4cGVjdGVkIGF1dGhvcml0eSwgZ290OiBcIiArIGMpO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICAgY2FzZSBcImF1dGhvcml0eVwiOlxuICAgICAgICBpZiAoXCJAXCIgPT0gYykge1xuICAgICAgICAgIGlmIChzZWVuQXQpIHtcbiAgICAgICAgICAgIGVycihcIkAgYWxyZWFkeSBzZWVuLlwiKTtcbiAgICAgICAgICAgIGJ1ZmZlciArPSBcIiU0MFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzZWVuQXQgPSB0cnVlO1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYnVmZmVyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgY3AgPSBidWZmZXJbaV07XG4gICAgICAgICAgICBpZiAoXCJcdFwiID09IGNwIHx8IFwiXFxuXCIgPT0gY3AgfHwgXCJcXHJcIiA9PSBjcCkge1xuICAgICAgICAgICAgICBlcnIoXCJJbnZhbGlkIHdoaXRlc3BhY2UgaW4gYXV0aG9yaXR5LlwiKTtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoXCI6XCIgPT0gY3AgJiYgbnVsbCA9PT0gdGhpcy5fcGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgdGhpcy5fcGFzc3dvcmQgPSBcIlwiO1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciB0ZW1wQyA9IHBlcmNlbnRFc2NhcGUoY3ApO1xuICAgICAgICAgICAgbnVsbCAhPT0gdGhpcy5fcGFzc3dvcmQgPyB0aGlzLl9wYXNzd29yZCArPSB0ZW1wQyA6IHRoaXMuX3VzZXJuYW1lICs9IHRlbXBDO1xuICAgICAgICAgIH1cbiAgICAgICAgICBidWZmZXIgPSBcIlwiO1xuICAgICAgICB9IGVsc2UgaWYgKEVPRiA9PSBjIHx8IFwiL1wiID09IGMgfHwgXCJcXFxcXCIgPT0gYyB8fCBcIj9cIiA9PSBjIHx8IFwiI1wiID09IGMpIHtcbiAgICAgICAgICBjdXJzb3IgLT0gYnVmZmVyLmxlbmd0aDtcbiAgICAgICAgICBidWZmZXIgPSBcIlwiO1xuICAgICAgICAgIHN0YXRlID0gXCJob3N0XCI7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYnVmZmVyICs9IGM7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG5cbiAgICAgICBjYXNlIFwiZmlsZSBob3N0XCI6XG4gICAgICAgIGlmIChFT0YgPT0gYyB8fCBcIi9cIiA9PSBjIHx8IFwiXFxcXFwiID09IGMgfHwgXCI/XCIgPT0gYyB8fCBcIiNcIiA9PSBjKSB7XG4gICAgICAgICAgaWYgKGJ1ZmZlci5sZW5ndGggPT0gMiAmJiBBTFBIQS50ZXN0KGJ1ZmZlclswXSkgJiYgKGJ1ZmZlclsxXSA9PSBcIjpcIiB8fCBidWZmZXJbMV0gPT0gXCJ8XCIpKSB7XG4gICAgICAgICAgICBzdGF0ZSA9IFwicmVsYXRpdmUgcGF0aFwiO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYnVmZmVyLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICBzdGF0ZSA9IFwicmVsYXRpdmUgcGF0aCBzdGFydFwiO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9ob3N0ID0gSUROQVRvQVNDSUkuY2FsbCh0aGlzLCBidWZmZXIpO1xuICAgICAgICAgICAgYnVmZmVyID0gXCJcIjtcbiAgICAgICAgICAgIHN0YXRlID0gXCJyZWxhdGl2ZSBwYXRoIHN0YXJ0XCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKFwiXHRcIiA9PSBjIHx8IFwiXFxuXCIgPT0gYyB8fCBcIlxcclwiID09IGMpIHtcbiAgICAgICAgICBlcnIoXCJJbnZhbGlkIHdoaXRlc3BhY2UgaW4gZmlsZSBob3N0LlwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBidWZmZXIgKz0gYztcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcblxuICAgICAgIGNhc2UgXCJob3N0XCI6XG4gICAgICAgY2FzZSBcImhvc3RuYW1lXCI6XG4gICAgICAgIGlmIChcIjpcIiA9PSBjICYmICFzZWVuQnJhY2tldCkge1xuICAgICAgICAgIHRoaXMuX2hvc3QgPSBJRE5BVG9BU0NJSS5jYWxsKHRoaXMsIGJ1ZmZlcik7XG4gICAgICAgICAgYnVmZmVyID0gXCJcIjtcbiAgICAgICAgICBzdGF0ZSA9IFwicG9ydFwiO1xuICAgICAgICAgIGlmIChcImhvc3RuYW1lXCIgPT0gc3RhdGVPdmVycmlkZSkge1xuICAgICAgICAgICAgYnJlYWsgbG9vcDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoRU9GID09IGMgfHwgXCIvXCIgPT0gYyB8fCBcIlxcXFxcIiA9PSBjIHx8IFwiP1wiID09IGMgfHwgXCIjXCIgPT0gYykge1xuICAgICAgICAgIHRoaXMuX2hvc3QgPSBJRE5BVG9BU0NJSS5jYWxsKHRoaXMsIGJ1ZmZlcik7XG4gICAgICAgICAgYnVmZmVyID0gXCJcIjtcbiAgICAgICAgICBzdGF0ZSA9IFwicmVsYXRpdmUgcGF0aCBzdGFydFwiO1xuICAgICAgICAgIGlmIChzdGF0ZU92ZXJyaWRlKSB7XG4gICAgICAgICAgICBicmVhayBsb29wO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmIChcIlx0XCIgIT0gYyAmJiBcIlxcblwiICE9IGMgJiYgXCJcXHJcIiAhPSBjKSB7XG4gICAgICAgICAgaWYgKFwiW1wiID09IGMpIHtcbiAgICAgICAgICAgIHNlZW5CcmFja2V0ID0gdHJ1ZTtcbiAgICAgICAgICB9IGVsc2UgaWYgKFwiXVwiID09IGMpIHtcbiAgICAgICAgICAgIHNlZW5CcmFja2V0ID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJ1ZmZlciArPSBjO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVycihcIkludmFsaWQgY29kZSBwb2ludCBpbiBob3N0L2hvc3RuYW1lOiBcIiArIGMpO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICAgY2FzZSBcInBvcnRcIjpcbiAgICAgICAgaWYgKC9bMC05XS8udGVzdChjKSkge1xuICAgICAgICAgIGJ1ZmZlciArPSBjO1xuICAgICAgICB9IGVsc2UgaWYgKEVPRiA9PSBjIHx8IFwiL1wiID09IGMgfHwgXCJcXFxcXCIgPT0gYyB8fCBcIj9cIiA9PSBjIHx8IFwiI1wiID09IGMgfHwgc3RhdGVPdmVycmlkZSkge1xuICAgICAgICAgIGlmIChcIlwiICE9IGJ1ZmZlcikge1xuICAgICAgICAgICAgdmFyIHRlbXAgPSBwYXJzZUludChidWZmZXIsIDEwKTtcbiAgICAgICAgICAgIGlmICh0ZW1wICE9IHJlbGF0aXZlW3RoaXMuX3NjaGVtZV0pIHtcbiAgICAgICAgICAgICAgdGhpcy5fcG9ydCA9IHRlbXAgKyBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnVmZmVyID0gXCJcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHN0YXRlT3ZlcnJpZGUpIHtcbiAgICAgICAgICAgIGJyZWFrIGxvb3A7XG4gICAgICAgICAgfVxuICAgICAgICAgIHN0YXRlID0gXCJyZWxhdGl2ZSBwYXRoIHN0YXJ0XCI7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSBpZiAoXCJcdFwiID09IGMgfHwgXCJcXG5cIiA9PSBjIHx8IFwiXFxyXCIgPT0gYykge1xuICAgICAgICAgIGVycihcIkludmFsaWQgY29kZSBwb2ludCBpbiBwb3J0OiBcIiArIGMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGludmFsaWQuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcblxuICAgICAgIGNhc2UgXCJyZWxhdGl2ZSBwYXRoIHN0YXJ0XCI6XG4gICAgICAgIGlmIChcIlxcXFxcIiA9PSBjKSBlcnIoXCInXFxcXCcgbm90IGFsbG93ZWQgaW4gcGF0aC5cIik7XG4gICAgICAgIHN0YXRlID0gXCJyZWxhdGl2ZSBwYXRoXCI7XG4gICAgICAgIGlmIChcIi9cIiAhPSBjICYmIFwiXFxcXFwiICE9IGMpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcblxuICAgICAgIGNhc2UgXCJyZWxhdGl2ZSBwYXRoXCI6XG4gICAgICAgIGlmIChFT0YgPT0gYyB8fCBcIi9cIiA9PSBjIHx8IFwiXFxcXFwiID09IGMgfHwgIXN0YXRlT3ZlcnJpZGUgJiYgKFwiP1wiID09IGMgfHwgXCIjXCIgPT0gYykpIHtcbiAgICAgICAgICBpZiAoXCJcXFxcXCIgPT0gYykge1xuICAgICAgICAgICAgZXJyKFwiXFxcXCBub3QgYWxsb3dlZCBpbiByZWxhdGl2ZSBwYXRoLlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHRtcDtcbiAgICAgICAgICBpZiAodG1wID0gcmVsYXRpdmVQYXRoRG90TWFwcGluZ1tidWZmZXIudG9Mb3dlckNhc2UoKV0pIHtcbiAgICAgICAgICAgIGJ1ZmZlciA9IHRtcDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKFwiLi5cIiA9PSBidWZmZXIpIHtcbiAgICAgICAgICAgIHRoaXMuX3BhdGgucG9wKCk7XG4gICAgICAgICAgICBpZiAoXCIvXCIgIT0gYyAmJiBcIlxcXFxcIiAhPSBjKSB7XG4gICAgICAgICAgICAgIHRoaXMuX3BhdGgucHVzaChcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKFwiLlwiID09IGJ1ZmZlciAmJiBcIi9cIiAhPSBjICYmIFwiXFxcXFwiICE9IGMpIHtcbiAgICAgICAgICAgIHRoaXMuX3BhdGgucHVzaChcIlwiKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKFwiLlwiICE9IGJ1ZmZlcikge1xuICAgICAgICAgICAgaWYgKFwiZmlsZVwiID09IHRoaXMuX3NjaGVtZSAmJiB0aGlzLl9wYXRoLmxlbmd0aCA9PSAwICYmIGJ1ZmZlci5sZW5ndGggPT0gMiAmJiBBTFBIQS50ZXN0KGJ1ZmZlclswXSkgJiYgYnVmZmVyWzFdID09IFwifFwiKSB7XG4gICAgICAgICAgICAgIGJ1ZmZlciA9IGJ1ZmZlclswXSArIFwiOlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fcGF0aC5wdXNoKGJ1ZmZlcik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJ1ZmZlciA9IFwiXCI7XG4gICAgICAgICAgaWYgKFwiP1wiID09IGMpIHtcbiAgICAgICAgICAgIHRoaXMuX3F1ZXJ5ID0gXCI/XCI7XG4gICAgICAgICAgICBzdGF0ZSA9IFwicXVlcnlcIjtcbiAgICAgICAgICB9IGVsc2UgaWYgKFwiI1wiID09IGMpIHtcbiAgICAgICAgICAgIHRoaXMuX2ZyYWdtZW50ID0gXCIjXCI7XG4gICAgICAgICAgICBzdGF0ZSA9IFwiZnJhZ21lbnRcIjtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoXCJcdFwiICE9IGMgJiYgXCJcXG5cIiAhPSBjICYmIFwiXFxyXCIgIT0gYykge1xuICAgICAgICAgIGJ1ZmZlciArPSBwZXJjZW50RXNjYXBlKGMpO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICAgY2FzZSBcInF1ZXJ5XCI6XG4gICAgICAgIGlmICghc3RhdGVPdmVycmlkZSAmJiBcIiNcIiA9PSBjKSB7XG4gICAgICAgICAgdGhpcy5fZnJhZ21lbnQgPSBcIiNcIjtcbiAgICAgICAgICBzdGF0ZSA9IFwiZnJhZ21lbnRcIjtcbiAgICAgICAgfSBlbHNlIGlmIChFT0YgIT0gYyAmJiBcIlx0XCIgIT0gYyAmJiBcIlxcblwiICE9IGMgJiYgXCJcXHJcIiAhPSBjKSB7XG4gICAgICAgICAgdGhpcy5fcXVlcnkgKz0gcGVyY2VudEVzY2FwZVF1ZXJ5KGMpO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICAgY2FzZSBcImZyYWdtZW50XCI6XG4gICAgICAgIGlmIChFT0YgIT0gYyAmJiBcIlx0XCIgIT0gYyAmJiBcIlxcblwiICE9IGMgJiYgXCJcXHJcIiAhPSBjKSB7XG4gICAgICAgICAgdGhpcy5fZnJhZ21lbnQgKz0gYztcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGN1cnNvcisrO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBjbGVhcigpIHtcbiAgICB0aGlzLl9zY2hlbWUgPSBcIlwiO1xuICAgIHRoaXMuX3NjaGVtZURhdGEgPSBcIlwiO1xuICAgIHRoaXMuX3VzZXJuYW1lID0gXCJcIjtcbiAgICB0aGlzLl9wYXNzd29yZCA9IG51bGw7XG4gICAgdGhpcy5faG9zdCA9IFwiXCI7XG4gICAgdGhpcy5fcG9ydCA9IFwiXCI7XG4gICAgdGhpcy5fcGF0aCA9IFtdO1xuICAgIHRoaXMuX3F1ZXJ5ID0gXCJcIjtcbiAgICB0aGlzLl9mcmFnbWVudCA9IFwiXCI7XG4gICAgdGhpcy5faXNJbnZhbGlkID0gZmFsc2U7XG4gICAgdGhpcy5faXNSZWxhdGl2ZSA9IGZhbHNlO1xuICB9XG4gIGZ1bmN0aW9uIGpVUkwodXJsLCBiYXNlKSB7XG4gICAgaWYgKGJhc2UgIT09IHVuZGVmaW5lZCAmJiAhKGJhc2UgaW5zdGFuY2VvZiBqVVJMKSkgYmFzZSA9IG5ldyBqVVJMKFN0cmluZyhiYXNlKSk7XG4gICAgdGhpcy5fdXJsID0gdXJsO1xuICAgIGNsZWFyLmNhbGwodGhpcyk7XG4gICAgdmFyIGlucHV0ID0gdXJsLnJlcGxhY2UoL15bIFxcdFxcclxcblxcZl0rfFsgXFx0XFxyXFxuXFxmXSskL2csIFwiXCIpO1xuICAgIHBhcnNlLmNhbGwodGhpcywgaW5wdXQsIG51bGwsIGJhc2UpO1xuICB9XG4gIGpVUkwucHJvdG90eXBlID0ge1xuICAgIHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLmhyZWY7XG4gICAgfSxcbiAgICBnZXQgaHJlZigpIHtcbiAgICAgIGlmICh0aGlzLl9pc0ludmFsaWQpIHJldHVybiB0aGlzLl91cmw7XG4gICAgICB2YXIgYXV0aG9yaXR5ID0gXCJcIjtcbiAgICAgIGlmIChcIlwiICE9IHRoaXMuX3VzZXJuYW1lIHx8IG51bGwgIT0gdGhpcy5fcGFzc3dvcmQpIHtcbiAgICAgICAgYXV0aG9yaXR5ID0gdGhpcy5fdXNlcm5hbWUgKyAobnVsbCAhPSB0aGlzLl9wYXNzd29yZCA/IFwiOlwiICsgdGhpcy5fcGFzc3dvcmQgOiBcIlwiKSArIFwiQFwiO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMucHJvdG9jb2wgKyAodGhpcy5faXNSZWxhdGl2ZSA/IFwiLy9cIiArIGF1dGhvcml0eSArIHRoaXMuaG9zdCA6IFwiXCIpICsgdGhpcy5wYXRobmFtZSArIHRoaXMuX3F1ZXJ5ICsgdGhpcy5fZnJhZ21lbnQ7XG4gICAgfSxcbiAgICBzZXQgaHJlZihocmVmKSB7XG4gICAgICBjbGVhci5jYWxsKHRoaXMpO1xuICAgICAgcGFyc2UuY2FsbCh0aGlzLCBocmVmKTtcbiAgICB9LFxuICAgIGdldCBwcm90b2NvbCgpIHtcbiAgICAgIHJldHVybiB0aGlzLl9zY2hlbWUgKyBcIjpcIjtcbiAgICB9LFxuICAgIHNldCBwcm90b2NvbChwcm90b2NvbCkge1xuICAgICAgaWYgKHRoaXMuX2lzSW52YWxpZCkgcmV0dXJuO1xuICAgICAgcGFyc2UuY2FsbCh0aGlzLCBwcm90b2NvbCArIFwiOlwiLCBcInNjaGVtZSBzdGFydFwiKTtcbiAgICB9LFxuICAgIGdldCBob3N0KCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2lzSW52YWxpZCA/IFwiXCIgOiB0aGlzLl9wb3J0ID8gdGhpcy5faG9zdCArIFwiOlwiICsgdGhpcy5fcG9ydCA6IHRoaXMuX2hvc3Q7XG4gICAgfSxcbiAgICBzZXQgaG9zdChob3N0KSB7XG4gICAgICBpZiAodGhpcy5faXNJbnZhbGlkIHx8ICF0aGlzLl9pc1JlbGF0aXZlKSByZXR1cm47XG4gICAgICBwYXJzZS5jYWxsKHRoaXMsIGhvc3QsIFwiaG9zdFwiKTtcbiAgICB9LFxuICAgIGdldCBob3N0bmFtZSgpIHtcbiAgICAgIHJldHVybiB0aGlzLl9ob3N0O1xuICAgIH0sXG4gICAgc2V0IGhvc3RuYW1lKGhvc3RuYW1lKSB7XG4gICAgICBpZiAodGhpcy5faXNJbnZhbGlkIHx8ICF0aGlzLl9pc1JlbGF0aXZlKSByZXR1cm47XG4gICAgICBwYXJzZS5jYWxsKHRoaXMsIGhvc3RuYW1lLCBcImhvc3RuYW1lXCIpO1xuICAgIH0sXG4gICAgZ2V0IHBvcnQoKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcG9ydDtcbiAgICB9LFxuICAgIHNldCBwb3J0KHBvcnQpIHtcbiAgICAgIGlmICh0aGlzLl9pc0ludmFsaWQgfHwgIXRoaXMuX2lzUmVsYXRpdmUpIHJldHVybjtcbiAgICAgIHBhcnNlLmNhbGwodGhpcywgcG9ydCwgXCJwb3J0XCIpO1xuICAgIH0sXG4gICAgZ2V0IHBhdGhuYW1lKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2lzSW52YWxpZCA/IFwiXCIgOiB0aGlzLl9pc1JlbGF0aXZlID8gXCIvXCIgKyB0aGlzLl9wYXRoLmpvaW4oXCIvXCIpIDogdGhpcy5fc2NoZW1lRGF0YTtcbiAgICB9LFxuICAgIHNldCBwYXRobmFtZShwYXRobmFtZSkge1xuICAgICAgaWYgKHRoaXMuX2lzSW52YWxpZCB8fCAhdGhpcy5faXNSZWxhdGl2ZSkgcmV0dXJuO1xuICAgICAgdGhpcy5fcGF0aCA9IFtdO1xuICAgICAgcGFyc2UuY2FsbCh0aGlzLCBwYXRobmFtZSwgXCJyZWxhdGl2ZSBwYXRoIHN0YXJ0XCIpO1xuICAgIH0sXG4gICAgZ2V0IHNlYXJjaCgpIHtcbiAgICAgIHJldHVybiB0aGlzLl9pc0ludmFsaWQgfHwgIXRoaXMuX3F1ZXJ5IHx8IFwiP1wiID09IHRoaXMuX3F1ZXJ5ID8gXCJcIiA6IHRoaXMuX3F1ZXJ5O1xuICAgIH0sXG4gICAgc2V0IHNlYXJjaChzZWFyY2gpIHtcbiAgICAgIGlmICh0aGlzLl9pc0ludmFsaWQgfHwgIXRoaXMuX2lzUmVsYXRpdmUpIHJldHVybjtcbiAgICAgIHRoaXMuX3F1ZXJ5ID0gXCI/XCI7XG4gICAgICBpZiAoXCI/XCIgPT0gc2VhcmNoWzBdKSBzZWFyY2ggPSBzZWFyY2guc2xpY2UoMSk7XG4gICAgICBwYXJzZS5jYWxsKHRoaXMsIHNlYXJjaCwgXCJxdWVyeVwiKTtcbiAgICB9LFxuICAgIGdldCBoYXNoKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2lzSW52YWxpZCB8fCAhdGhpcy5fZnJhZ21lbnQgfHwgXCIjXCIgPT0gdGhpcy5fZnJhZ21lbnQgPyBcIlwiIDogdGhpcy5fZnJhZ21lbnQ7XG4gICAgfSxcbiAgICBzZXQgaGFzaChoYXNoKSB7XG4gICAgICBpZiAodGhpcy5faXNJbnZhbGlkKSByZXR1cm47XG4gICAgICB0aGlzLl9mcmFnbWVudCA9IFwiI1wiO1xuICAgICAgaWYgKFwiI1wiID09IGhhc2hbMF0pIGhhc2ggPSBoYXNoLnNsaWNlKDEpO1xuICAgICAgcGFyc2UuY2FsbCh0aGlzLCBoYXNoLCBcImZyYWdtZW50XCIpO1xuICAgIH0sXG4gICAgZ2V0IG9yaWdpbigpIHtcbiAgICAgIHZhciBob3N0O1xuICAgICAgaWYgKHRoaXMuX2lzSW52YWxpZCB8fCAhdGhpcy5fc2NoZW1lKSB7XG4gICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgfVxuICAgICAgc3dpdGNoICh0aGlzLl9zY2hlbWUpIHtcbiAgICAgICBjYXNlIFwiZGF0YVwiOlxuICAgICAgIGNhc2UgXCJmaWxlXCI6XG4gICAgICAgY2FzZSBcImphdmFzY3JpcHRcIjpcbiAgICAgICBjYXNlIFwibWFpbHRvXCI6XG4gICAgICAgIHJldHVybiBcIm51bGxcIjtcbiAgICAgIH1cbiAgICAgIGhvc3QgPSB0aGlzLmhvc3Q7XG4gICAgICBpZiAoIWhvc3QpIHtcbiAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5fc2NoZW1lICsgXCI6Ly9cIiArIGhvc3Q7XG4gICAgfVxuICB9O1xuICB2YXIgT3JpZ2luYWxVUkwgPSBzY29wZS5VUkw7XG4gIGlmIChPcmlnaW5hbFVSTCkge1xuICAgIGpVUkwuY3JlYXRlT2JqZWN0VVJMID0gZnVuY3Rpb24oYmxvYikge1xuICAgICAgcmV0dXJuIE9yaWdpbmFsVVJMLmNyZWF0ZU9iamVjdFVSTC5hcHBseShPcmlnaW5hbFVSTCwgYXJndW1lbnRzKTtcbiAgICB9O1xuICAgIGpVUkwucmV2b2tlT2JqZWN0VVJMID0gZnVuY3Rpb24odXJsKSB7XG4gICAgICBPcmlnaW5hbFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcbiAgICB9O1xuICB9XG4gIHNjb3BlLlVSTCA9IGpVUkw7XG59KSh0aGlzKTtcblxuaWYgKHR5cGVvZiBXZWFrTWFwID09PSBcInVuZGVmaW5lZFwiKSB7XG4gIChmdW5jdGlvbigpIHtcbiAgICB2YXIgZGVmaW5lUHJvcGVydHkgPSBPYmplY3QuZGVmaW5lUHJvcGVydHk7XG4gICAgdmFyIGNvdW50ZXIgPSBEYXRlLm5vdygpICUgMWU5O1xuICAgIHZhciBXZWFrTWFwID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLm5hbWUgPSBcIl9fc3RcIiArIChNYXRoLnJhbmRvbSgpICogMWU5ID4+PiAwKSArIChjb3VudGVyKysgKyBcIl9fXCIpO1xuICAgIH07XG4gICAgV2Vha01hcC5wcm90b3R5cGUgPSB7XG4gICAgICBzZXQ6IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgICAgdmFyIGVudHJ5ID0ga2V5W3RoaXMubmFtZV07XG4gICAgICAgIGlmIChlbnRyeSAmJiBlbnRyeVswXSA9PT0ga2V5KSBlbnRyeVsxXSA9IHZhbHVlOyBlbHNlIGRlZmluZVByb3BlcnR5KGtleSwgdGhpcy5uYW1lLCB7XG4gICAgICAgICAgdmFsdWU6IFsga2V5LCB2YWx1ZSBdLFxuICAgICAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH0sXG4gICAgICBnZXQ6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIgZW50cnk7XG4gICAgICAgIHJldHVybiAoZW50cnkgPSBrZXlbdGhpcy5uYW1lXSkgJiYgZW50cnlbMF0gPT09IGtleSA/IGVudHJ5WzFdIDogdW5kZWZpbmVkO1xuICAgICAgfSxcbiAgICAgIFwiZGVsZXRlXCI6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIgZW50cnkgPSBrZXlbdGhpcy5uYW1lXTtcbiAgICAgICAgaWYgKCFlbnRyeSB8fCBlbnRyeVswXSAhPT0ga2V5KSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGVudHJ5WzBdID0gZW50cnlbMV0gPSB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICAgIGhhczogZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBlbnRyeSA9IGtleVt0aGlzLm5hbWVdO1xuICAgICAgICBpZiAoIWVudHJ5KSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiBlbnRyeVswXSA9PT0ga2V5O1xuICAgICAgfVxuICAgIH07XG4gICAgd2luZG93LldlYWtNYXAgPSBXZWFrTWFwO1xuICB9KSgpO1xufVxuXG4oZnVuY3Rpb24oZ2xvYmFsKSB7XG4gIHZhciByZWdpc3RyYXRpb25zVGFibGUgPSBuZXcgV2Vha01hcCgpO1xuICB2YXIgc2V0SW1tZWRpYXRlO1xuICBpZiAoL1RyaWRlbnR8RWRnZS8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkge1xuICAgIHNldEltbWVkaWF0ZSA9IHNldFRpbWVvdXQ7XG4gIH0gZWxzZSBpZiAod2luZG93LnNldEltbWVkaWF0ZSkge1xuICAgIHNldEltbWVkaWF0ZSA9IHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gIH0gZWxzZSB7XG4gICAgdmFyIHNldEltbWVkaWF0ZVF1ZXVlID0gW107XG4gICAgdmFyIHNlbnRpbmVsID0gU3RyaW5nKE1hdGgucmFuZG9tKCkpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBmdW5jdGlvbihlKSB7XG4gICAgICBpZiAoZS5kYXRhID09PSBzZW50aW5lbCkge1xuICAgICAgICB2YXIgcXVldWUgPSBzZXRJbW1lZGlhdGVRdWV1ZTtcbiAgICAgICAgc2V0SW1tZWRpYXRlUXVldWUgPSBbXTtcbiAgICAgICAgcXVldWUuZm9yRWFjaChmdW5jdGlvbihmdW5jKSB7XG4gICAgICAgICAgZnVuYygpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBzZXRJbW1lZGlhdGUgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgICBzZXRJbW1lZGlhdGVRdWV1ZS5wdXNoKGZ1bmMpO1xuICAgICAgd2luZG93LnBvc3RNZXNzYWdlKHNlbnRpbmVsLCBcIipcIik7XG4gICAgfTtcbiAgfVxuICB2YXIgaXNTY2hlZHVsZWQgPSBmYWxzZTtcbiAgdmFyIHNjaGVkdWxlZE9ic2VydmVycyA9IFtdO1xuICBmdW5jdGlvbiBzY2hlZHVsZUNhbGxiYWNrKG9ic2VydmVyKSB7XG4gICAgc2NoZWR1bGVkT2JzZXJ2ZXJzLnB1c2gob2JzZXJ2ZXIpO1xuICAgIGlmICghaXNTY2hlZHVsZWQpIHtcbiAgICAgIGlzU2NoZWR1bGVkID0gdHJ1ZTtcbiAgICAgIHNldEltbWVkaWF0ZShkaXNwYXRjaENhbGxiYWNrcyk7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIHdyYXBJZk5lZWRlZChub2RlKSB7XG4gICAgcmV0dXJuIHdpbmRvdy5TaGFkb3dET01Qb2x5ZmlsbCAmJiB3aW5kb3cuU2hhZG93RE9NUG9seWZpbGwud3JhcElmTmVlZGVkKG5vZGUpIHx8IG5vZGU7XG4gIH1cbiAgZnVuY3Rpb24gZGlzcGF0Y2hDYWxsYmFja3MoKSB7XG4gICAgaXNTY2hlZHVsZWQgPSBmYWxzZTtcbiAgICB2YXIgb2JzZXJ2ZXJzID0gc2NoZWR1bGVkT2JzZXJ2ZXJzO1xuICAgIHNjaGVkdWxlZE9ic2VydmVycyA9IFtdO1xuICAgIG9ic2VydmVycy5zb3J0KGZ1bmN0aW9uKG8xLCBvMikge1xuICAgICAgcmV0dXJuIG8xLnVpZF8gLSBvMi51aWRfO1xuICAgIH0pO1xuICAgIHZhciBhbnlOb25FbXB0eSA9IGZhbHNlO1xuICAgIG9ic2VydmVycy5mb3JFYWNoKGZ1bmN0aW9uKG9ic2VydmVyKSB7XG4gICAgICB2YXIgcXVldWUgPSBvYnNlcnZlci50YWtlUmVjb3JkcygpO1xuICAgICAgcmVtb3ZlVHJhbnNpZW50T2JzZXJ2ZXJzRm9yKG9ic2VydmVyKTtcbiAgICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgb2JzZXJ2ZXIuY2FsbGJhY2tfKHF1ZXVlLCBvYnNlcnZlcik7XG4gICAgICAgIGFueU5vbkVtcHR5ID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoYW55Tm9uRW1wdHkpIGRpc3BhdGNoQ2FsbGJhY2tzKCk7XG4gIH1cbiAgZnVuY3Rpb24gcmVtb3ZlVHJhbnNpZW50T2JzZXJ2ZXJzRm9yKG9ic2VydmVyKSB7XG4gICAgb2JzZXJ2ZXIubm9kZXNfLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xuICAgICAgdmFyIHJlZ2lzdHJhdGlvbnMgPSByZWdpc3RyYXRpb25zVGFibGUuZ2V0KG5vZGUpO1xuICAgICAgaWYgKCFyZWdpc3RyYXRpb25zKSByZXR1cm47XG4gICAgICByZWdpc3RyYXRpb25zLmZvckVhY2goZnVuY3Rpb24ocmVnaXN0cmF0aW9uKSB7XG4gICAgICAgIGlmIChyZWdpc3RyYXRpb24ub2JzZXJ2ZXIgPT09IG9ic2VydmVyKSByZWdpc3RyYXRpb24ucmVtb3ZlVHJhbnNpZW50T2JzZXJ2ZXJzKCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICBmdW5jdGlvbiBmb3JFYWNoQW5jZXN0b3JBbmRPYnNlcnZlckVucXVldWVSZWNvcmQodGFyZ2V0LCBjYWxsYmFjaykge1xuICAgIGZvciAodmFyIG5vZGUgPSB0YXJnZXQ7IG5vZGU7IG5vZGUgPSBub2RlLnBhcmVudE5vZGUpIHtcbiAgICAgIHZhciByZWdpc3RyYXRpb25zID0gcmVnaXN0cmF0aW9uc1RhYmxlLmdldChub2RlKTtcbiAgICAgIGlmIChyZWdpc3RyYXRpb25zKSB7XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgcmVnaXN0cmF0aW9ucy5sZW5ndGg7IGorKykge1xuICAgICAgICAgIHZhciByZWdpc3RyYXRpb24gPSByZWdpc3RyYXRpb25zW2pdO1xuICAgICAgICAgIHZhciBvcHRpb25zID0gcmVnaXN0cmF0aW9uLm9wdGlvbnM7XG4gICAgICAgICAgaWYgKG5vZGUgIT09IHRhcmdldCAmJiAhb3B0aW9ucy5zdWJ0cmVlKSBjb250aW51ZTtcbiAgICAgICAgICB2YXIgcmVjb3JkID0gY2FsbGJhY2sob3B0aW9ucyk7XG4gICAgICAgICAgaWYgKHJlY29yZCkgcmVnaXN0cmF0aW9uLmVucXVldWUocmVjb3JkKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICB2YXIgdWlkQ291bnRlciA9IDA7XG4gIGZ1bmN0aW9uIEpzTXV0YXRpb25PYnNlcnZlcihjYWxsYmFjaykge1xuICAgIHRoaXMuY2FsbGJhY2tfID0gY2FsbGJhY2s7XG4gICAgdGhpcy5ub2Rlc18gPSBbXTtcbiAgICB0aGlzLnJlY29yZHNfID0gW107XG4gICAgdGhpcy51aWRfID0gKyt1aWRDb3VudGVyO1xuICB9XG4gIEpzTXV0YXRpb25PYnNlcnZlci5wcm90b3R5cGUgPSB7XG4gICAgb2JzZXJ2ZTogZnVuY3Rpb24odGFyZ2V0LCBvcHRpb25zKSB7XG4gICAgICB0YXJnZXQgPSB3cmFwSWZOZWVkZWQodGFyZ2V0KTtcbiAgICAgIGlmICghb3B0aW9ucy5jaGlsZExpc3QgJiYgIW9wdGlvbnMuYXR0cmlidXRlcyAmJiAhb3B0aW9ucy5jaGFyYWN0ZXJEYXRhIHx8IG9wdGlvbnMuYXR0cmlidXRlT2xkVmFsdWUgJiYgIW9wdGlvbnMuYXR0cmlidXRlcyB8fCBvcHRpb25zLmF0dHJpYnV0ZUZpbHRlciAmJiBvcHRpb25zLmF0dHJpYnV0ZUZpbHRlci5sZW5ndGggJiYgIW9wdGlvbnMuYXR0cmlidXRlcyB8fCBvcHRpb25zLmNoYXJhY3RlckRhdGFPbGRWYWx1ZSAmJiAhb3B0aW9ucy5jaGFyYWN0ZXJEYXRhKSB7XG4gICAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcigpO1xuICAgICAgfVxuICAgICAgdmFyIHJlZ2lzdHJhdGlvbnMgPSByZWdpc3RyYXRpb25zVGFibGUuZ2V0KHRhcmdldCk7XG4gICAgICBpZiAoIXJlZ2lzdHJhdGlvbnMpIHJlZ2lzdHJhdGlvbnNUYWJsZS5zZXQodGFyZ2V0LCByZWdpc3RyYXRpb25zID0gW10pO1xuICAgICAgdmFyIHJlZ2lzdHJhdGlvbjtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVnaXN0cmF0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAocmVnaXN0cmF0aW9uc1tpXS5vYnNlcnZlciA9PT0gdGhpcykge1xuICAgICAgICAgIHJlZ2lzdHJhdGlvbiA9IHJlZ2lzdHJhdGlvbnNbaV07XG4gICAgICAgICAgcmVnaXN0cmF0aW9uLnJlbW92ZUxpc3RlbmVycygpO1xuICAgICAgICAgIHJlZ2lzdHJhdGlvbi5vcHRpb25zID0gb3B0aW9ucztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFyZWdpc3RyYXRpb24pIHtcbiAgICAgICAgcmVnaXN0cmF0aW9uID0gbmV3IFJlZ2lzdHJhdGlvbih0aGlzLCB0YXJnZXQsIG9wdGlvbnMpO1xuICAgICAgICByZWdpc3RyYXRpb25zLnB1c2gocmVnaXN0cmF0aW9uKTtcbiAgICAgICAgdGhpcy5ub2Rlc18ucHVzaCh0YXJnZXQpO1xuICAgICAgfVxuICAgICAgcmVnaXN0cmF0aW9uLmFkZExpc3RlbmVycygpO1xuICAgIH0sXG4gICAgZGlzY29ubmVjdDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLm5vZGVzXy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgdmFyIHJlZ2lzdHJhdGlvbnMgPSByZWdpc3RyYXRpb25zVGFibGUuZ2V0KG5vZGUpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlZ2lzdHJhdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICB2YXIgcmVnaXN0cmF0aW9uID0gcmVnaXN0cmF0aW9uc1tpXTtcbiAgICAgICAgICBpZiAocmVnaXN0cmF0aW9uLm9ic2VydmVyID09PSB0aGlzKSB7XG4gICAgICAgICAgICByZWdpc3RyYXRpb24ucmVtb3ZlTGlzdGVuZXJzKCk7XG4gICAgICAgICAgICByZWdpc3RyYXRpb25zLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgdGhpcyk7XG4gICAgICB0aGlzLnJlY29yZHNfID0gW107XG4gICAgfSxcbiAgICB0YWtlUmVjb3JkczogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY29weU9mUmVjb3JkcyA9IHRoaXMucmVjb3Jkc187XG4gICAgICB0aGlzLnJlY29yZHNfID0gW107XG4gICAgICByZXR1cm4gY29weU9mUmVjb3JkcztcbiAgICB9XG4gIH07XG4gIGZ1bmN0aW9uIE11dGF0aW9uUmVjb3JkKHR5cGUsIHRhcmdldCkge1xuICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgdGhpcy50YXJnZXQgPSB0YXJnZXQ7XG4gICAgdGhpcy5hZGRlZE5vZGVzID0gW107XG4gICAgdGhpcy5yZW1vdmVkTm9kZXMgPSBbXTtcbiAgICB0aGlzLnByZXZpb3VzU2libGluZyA9IG51bGw7XG4gICAgdGhpcy5uZXh0U2libGluZyA9IG51bGw7XG4gICAgdGhpcy5hdHRyaWJ1dGVOYW1lID0gbnVsbDtcbiAgICB0aGlzLmF0dHJpYnV0ZU5hbWVzcGFjZSA9IG51bGw7XG4gICAgdGhpcy5vbGRWYWx1ZSA9IG51bGw7XG4gIH1cbiAgZnVuY3Rpb24gY29weU11dGF0aW9uUmVjb3JkKG9yaWdpbmFsKSB7XG4gICAgdmFyIHJlY29yZCA9IG5ldyBNdXRhdGlvblJlY29yZChvcmlnaW5hbC50eXBlLCBvcmlnaW5hbC50YXJnZXQpO1xuICAgIHJlY29yZC5hZGRlZE5vZGVzID0gb3JpZ2luYWwuYWRkZWROb2Rlcy5zbGljZSgpO1xuICAgIHJlY29yZC5yZW1vdmVkTm9kZXMgPSBvcmlnaW5hbC5yZW1vdmVkTm9kZXMuc2xpY2UoKTtcbiAgICByZWNvcmQucHJldmlvdXNTaWJsaW5nID0gb3JpZ2luYWwucHJldmlvdXNTaWJsaW5nO1xuICAgIHJlY29yZC5uZXh0U2libGluZyA9IG9yaWdpbmFsLm5leHRTaWJsaW5nO1xuICAgIHJlY29yZC5hdHRyaWJ1dGVOYW1lID0gb3JpZ2luYWwuYXR0cmlidXRlTmFtZTtcbiAgICByZWNvcmQuYXR0cmlidXRlTmFtZXNwYWNlID0gb3JpZ2luYWwuYXR0cmlidXRlTmFtZXNwYWNlO1xuICAgIHJlY29yZC5vbGRWYWx1ZSA9IG9yaWdpbmFsLm9sZFZhbHVlO1xuICAgIHJldHVybiByZWNvcmQ7XG4gIH1cbiAgdmFyIGN1cnJlbnRSZWNvcmQsIHJlY29yZFdpdGhPbGRWYWx1ZTtcbiAgZnVuY3Rpb24gZ2V0UmVjb3JkKHR5cGUsIHRhcmdldCkge1xuICAgIHJldHVybiBjdXJyZW50UmVjb3JkID0gbmV3IE11dGF0aW9uUmVjb3JkKHR5cGUsIHRhcmdldCk7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0UmVjb3JkV2l0aE9sZFZhbHVlKG9sZFZhbHVlKSB7XG4gICAgaWYgKHJlY29yZFdpdGhPbGRWYWx1ZSkgcmV0dXJuIHJlY29yZFdpdGhPbGRWYWx1ZTtcbiAgICByZWNvcmRXaXRoT2xkVmFsdWUgPSBjb3B5TXV0YXRpb25SZWNvcmQoY3VycmVudFJlY29yZCk7XG4gICAgcmVjb3JkV2l0aE9sZFZhbHVlLm9sZFZhbHVlID0gb2xkVmFsdWU7XG4gICAgcmV0dXJuIHJlY29yZFdpdGhPbGRWYWx1ZTtcbiAgfVxuICBmdW5jdGlvbiBjbGVhclJlY29yZHMoKSB7XG4gICAgY3VycmVudFJlY29yZCA9IHJlY29yZFdpdGhPbGRWYWx1ZSA9IHVuZGVmaW5lZDtcbiAgfVxuICBmdW5jdGlvbiByZWNvcmRSZXByZXNlbnRzQ3VycmVudE11dGF0aW9uKHJlY29yZCkge1xuICAgIHJldHVybiByZWNvcmQgPT09IHJlY29yZFdpdGhPbGRWYWx1ZSB8fCByZWNvcmQgPT09IGN1cnJlbnRSZWNvcmQ7XG4gIH1cbiAgZnVuY3Rpb24gc2VsZWN0UmVjb3JkKGxhc3RSZWNvcmQsIG5ld1JlY29yZCkge1xuICAgIGlmIChsYXN0UmVjb3JkID09PSBuZXdSZWNvcmQpIHJldHVybiBsYXN0UmVjb3JkO1xuICAgIGlmIChyZWNvcmRXaXRoT2xkVmFsdWUgJiYgcmVjb3JkUmVwcmVzZW50c0N1cnJlbnRNdXRhdGlvbihsYXN0UmVjb3JkKSkgcmV0dXJuIHJlY29yZFdpdGhPbGRWYWx1ZTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBmdW5jdGlvbiBSZWdpc3RyYXRpb24ob2JzZXJ2ZXIsIHRhcmdldCwgb3B0aW9ucykge1xuICAgIHRoaXMub2JzZXJ2ZXIgPSBvYnNlcnZlcjtcbiAgICB0aGlzLnRhcmdldCA9IHRhcmdldDtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMudHJhbnNpZW50T2JzZXJ2ZWROb2RlcyA9IFtdO1xuICB9XG4gIFJlZ2lzdHJhdGlvbi5wcm90b3R5cGUgPSB7XG4gICAgZW5xdWV1ZTogZnVuY3Rpb24ocmVjb3JkKSB7XG4gICAgICB2YXIgcmVjb3JkcyA9IHRoaXMub2JzZXJ2ZXIucmVjb3Jkc187XG4gICAgICB2YXIgbGVuZ3RoID0gcmVjb3Jkcy5sZW5ndGg7XG4gICAgICBpZiAocmVjb3Jkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBsYXN0UmVjb3JkID0gcmVjb3Jkc1tsZW5ndGggLSAxXTtcbiAgICAgICAgdmFyIHJlY29yZFRvUmVwbGFjZUxhc3QgPSBzZWxlY3RSZWNvcmQobGFzdFJlY29yZCwgcmVjb3JkKTtcbiAgICAgICAgaWYgKHJlY29yZFRvUmVwbGFjZUxhc3QpIHtcbiAgICAgICAgICByZWNvcmRzW2xlbmd0aCAtIDFdID0gcmVjb3JkVG9SZXBsYWNlTGFzdDtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNjaGVkdWxlQ2FsbGJhY2sodGhpcy5vYnNlcnZlcik7XG4gICAgICB9XG4gICAgICByZWNvcmRzW2xlbmd0aF0gPSByZWNvcmQ7XG4gICAgfSxcbiAgICBhZGRMaXN0ZW5lcnM6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5hZGRMaXN0ZW5lcnNfKHRoaXMudGFyZ2V0KTtcbiAgICB9LFxuICAgIGFkZExpc3RlbmVyc186IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgIHZhciBvcHRpb25zID0gdGhpcy5vcHRpb25zO1xuICAgICAgaWYgKG9wdGlvbnMuYXR0cmlidXRlcykgbm9kZS5hZGRFdmVudExpc3RlbmVyKFwiRE9NQXR0ck1vZGlmaWVkXCIsIHRoaXMsIHRydWUpO1xuICAgICAgaWYgKG9wdGlvbnMuY2hhcmFjdGVyRGF0YSkgbm9kZS5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ2hhcmFjdGVyRGF0YU1vZGlmaWVkXCIsIHRoaXMsIHRydWUpO1xuICAgICAgaWYgKG9wdGlvbnMuY2hpbGRMaXN0KSBub2RlLmFkZEV2ZW50TGlzdGVuZXIoXCJET01Ob2RlSW5zZXJ0ZWRcIiwgdGhpcywgdHJ1ZSk7XG4gICAgICBpZiAob3B0aW9ucy5jaGlsZExpc3QgfHwgb3B0aW9ucy5zdWJ0cmVlKSBub2RlLmFkZEV2ZW50TGlzdGVuZXIoXCJET01Ob2RlUmVtb3ZlZFwiLCB0aGlzLCB0cnVlKTtcbiAgICB9LFxuICAgIHJlbW92ZUxpc3RlbmVyczogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyc18odGhpcy50YXJnZXQpO1xuICAgIH0sXG4gICAgcmVtb3ZlTGlzdGVuZXJzXzogZnVuY3Rpb24obm9kZSkge1xuICAgICAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG4gICAgICBpZiAob3B0aW9ucy5hdHRyaWJ1dGVzKSBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJET01BdHRyTW9kaWZpZWRcIiwgdGhpcywgdHJ1ZSk7XG4gICAgICBpZiAob3B0aW9ucy5jaGFyYWN0ZXJEYXRhKSBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJET01DaGFyYWN0ZXJEYXRhTW9kaWZpZWRcIiwgdGhpcywgdHJ1ZSk7XG4gICAgICBpZiAob3B0aW9ucy5jaGlsZExpc3QpIG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIkRPTU5vZGVJbnNlcnRlZFwiLCB0aGlzLCB0cnVlKTtcbiAgICAgIGlmIChvcHRpb25zLmNoaWxkTGlzdCB8fCBvcHRpb25zLnN1YnRyZWUpIG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIkRPTU5vZGVSZW1vdmVkXCIsIHRoaXMsIHRydWUpO1xuICAgIH0sXG4gICAgYWRkVHJhbnNpZW50T2JzZXJ2ZXI6IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgIGlmIChub2RlID09PSB0aGlzLnRhcmdldCkgcmV0dXJuO1xuICAgICAgdGhpcy5hZGRMaXN0ZW5lcnNfKG5vZGUpO1xuICAgICAgdGhpcy50cmFuc2llbnRPYnNlcnZlZE5vZGVzLnB1c2gobm9kZSk7XG4gICAgICB2YXIgcmVnaXN0cmF0aW9ucyA9IHJlZ2lzdHJhdGlvbnNUYWJsZS5nZXQobm9kZSk7XG4gICAgICBpZiAoIXJlZ2lzdHJhdGlvbnMpIHJlZ2lzdHJhdGlvbnNUYWJsZS5zZXQobm9kZSwgcmVnaXN0cmF0aW9ucyA9IFtdKTtcbiAgICAgIHJlZ2lzdHJhdGlvbnMucHVzaCh0aGlzKTtcbiAgICB9LFxuICAgIHJlbW92ZVRyYW5zaWVudE9ic2VydmVyczogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdHJhbnNpZW50T2JzZXJ2ZWROb2RlcyA9IHRoaXMudHJhbnNpZW50T2JzZXJ2ZWROb2RlcztcbiAgICAgIHRoaXMudHJhbnNpZW50T2JzZXJ2ZWROb2RlcyA9IFtdO1xuICAgICAgdHJhbnNpZW50T2JzZXJ2ZWROb2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcnNfKG5vZGUpO1xuICAgICAgICB2YXIgcmVnaXN0cmF0aW9ucyA9IHJlZ2lzdHJhdGlvbnNUYWJsZS5nZXQobm9kZSk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVnaXN0cmF0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChyZWdpc3RyYXRpb25zW2ldID09PSB0aGlzKSB7XG4gICAgICAgICAgICByZWdpc3RyYXRpb25zLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgdGhpcyk7XG4gICAgfSxcbiAgICBoYW5kbGVFdmVudDogZnVuY3Rpb24oZSkge1xuICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgIHN3aXRjaCAoZS50eXBlKSB7XG4gICAgICAgY2FzZSBcIkRPTUF0dHJNb2RpZmllZFwiOlxuICAgICAgICB2YXIgbmFtZSA9IGUuYXR0ck5hbWU7XG4gICAgICAgIHZhciBuYW1lc3BhY2UgPSBlLnJlbGF0ZWROb2RlLm5hbWVzcGFjZVVSSTtcbiAgICAgICAgdmFyIHRhcmdldCA9IGUudGFyZ2V0O1xuICAgICAgICB2YXIgcmVjb3JkID0gbmV3IGdldFJlY29yZChcImF0dHJpYnV0ZXNcIiwgdGFyZ2V0KTtcbiAgICAgICAgcmVjb3JkLmF0dHJpYnV0ZU5hbWUgPSBuYW1lO1xuICAgICAgICByZWNvcmQuYXR0cmlidXRlTmFtZXNwYWNlID0gbmFtZXNwYWNlO1xuICAgICAgICB2YXIgb2xkVmFsdWUgPSBlLmF0dHJDaGFuZ2UgPT09IE11dGF0aW9uRXZlbnQuQURESVRJT04gPyBudWxsIDogZS5wcmV2VmFsdWU7XG4gICAgICAgIGZvckVhY2hBbmNlc3RvckFuZE9ic2VydmVyRW5xdWV1ZVJlY29yZCh0YXJnZXQsIGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgICBpZiAoIW9wdGlvbnMuYXR0cmlidXRlcykgcmV0dXJuO1xuICAgICAgICAgIGlmIChvcHRpb25zLmF0dHJpYnV0ZUZpbHRlciAmJiBvcHRpb25zLmF0dHJpYnV0ZUZpbHRlci5sZW5ndGggJiYgb3B0aW9ucy5hdHRyaWJ1dGVGaWx0ZXIuaW5kZXhPZihuYW1lKSA9PT0gLTEgJiYgb3B0aW9ucy5hdHRyaWJ1dGVGaWx0ZXIuaW5kZXhPZihuYW1lc3BhY2UpID09PSAtMSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAob3B0aW9ucy5hdHRyaWJ1dGVPbGRWYWx1ZSkgcmV0dXJuIGdldFJlY29yZFdpdGhPbGRWYWx1ZShvbGRWYWx1ZSk7XG4gICAgICAgICAgcmV0dXJuIHJlY29yZDtcbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICAgY2FzZSBcIkRPTUNoYXJhY3RlckRhdGFNb2RpZmllZFwiOlxuICAgICAgICB2YXIgdGFyZ2V0ID0gZS50YXJnZXQ7XG4gICAgICAgIHZhciByZWNvcmQgPSBnZXRSZWNvcmQoXCJjaGFyYWN0ZXJEYXRhXCIsIHRhcmdldCk7XG4gICAgICAgIHZhciBvbGRWYWx1ZSA9IGUucHJldlZhbHVlO1xuICAgICAgICBmb3JFYWNoQW5jZXN0b3JBbmRPYnNlcnZlckVucXVldWVSZWNvcmQodGFyZ2V0LCBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgICAgaWYgKCFvcHRpb25zLmNoYXJhY3RlckRhdGEpIHJldHVybjtcbiAgICAgICAgICBpZiAob3B0aW9ucy5jaGFyYWN0ZXJEYXRhT2xkVmFsdWUpIHJldHVybiBnZXRSZWNvcmRXaXRoT2xkVmFsdWUob2xkVmFsdWUpO1xuICAgICAgICAgIHJldHVybiByZWNvcmQ7XG4gICAgICAgIH0pO1xuICAgICAgICBicmVhaztcblxuICAgICAgIGNhc2UgXCJET01Ob2RlUmVtb3ZlZFwiOlxuICAgICAgICB0aGlzLmFkZFRyYW5zaWVudE9ic2VydmVyKGUudGFyZ2V0KTtcblxuICAgICAgIGNhc2UgXCJET01Ob2RlSW5zZXJ0ZWRcIjpcbiAgICAgICAgdmFyIGNoYW5nZWROb2RlID0gZS50YXJnZXQ7XG4gICAgICAgIHZhciBhZGRlZE5vZGVzLCByZW1vdmVkTm9kZXM7XG4gICAgICAgIGlmIChlLnR5cGUgPT09IFwiRE9NTm9kZUluc2VydGVkXCIpIHtcbiAgICAgICAgICBhZGRlZE5vZGVzID0gWyBjaGFuZ2VkTm9kZSBdO1xuICAgICAgICAgIHJlbW92ZWROb2RlcyA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFkZGVkTm9kZXMgPSBbXTtcbiAgICAgICAgICByZW1vdmVkTm9kZXMgPSBbIGNoYW5nZWROb2RlIF07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHByZXZpb3VzU2libGluZyA9IGNoYW5nZWROb2RlLnByZXZpb3VzU2libGluZztcbiAgICAgICAgdmFyIG5leHRTaWJsaW5nID0gY2hhbmdlZE5vZGUubmV4dFNpYmxpbmc7XG4gICAgICAgIHZhciByZWNvcmQgPSBnZXRSZWNvcmQoXCJjaGlsZExpc3RcIiwgZS50YXJnZXQucGFyZW50Tm9kZSk7XG4gICAgICAgIHJlY29yZC5hZGRlZE5vZGVzID0gYWRkZWROb2RlcztcbiAgICAgICAgcmVjb3JkLnJlbW92ZWROb2RlcyA9IHJlbW92ZWROb2RlcztcbiAgICAgICAgcmVjb3JkLnByZXZpb3VzU2libGluZyA9IHByZXZpb3VzU2libGluZztcbiAgICAgICAgcmVjb3JkLm5leHRTaWJsaW5nID0gbmV4dFNpYmxpbmc7XG4gICAgICAgIGZvckVhY2hBbmNlc3RvckFuZE9ic2VydmVyRW5xdWV1ZVJlY29yZChlLnJlbGF0ZWROb2RlLCBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgICAgaWYgKCFvcHRpb25zLmNoaWxkTGlzdCkgcmV0dXJuO1xuICAgICAgICAgIHJldHVybiByZWNvcmQ7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2xlYXJSZWNvcmRzKCk7XG4gICAgfVxuICB9O1xuICBnbG9iYWwuSnNNdXRhdGlvbk9ic2VydmVyID0gSnNNdXRhdGlvbk9ic2VydmVyO1xuICBpZiAoIWdsb2JhbC5NdXRhdGlvbk9ic2VydmVyKSBnbG9iYWwuTXV0YXRpb25PYnNlcnZlciA9IEpzTXV0YXRpb25PYnNlcnZlcjtcbn0pKHRoaXMpO1xuXG53aW5kb3cuSFRNTEltcG9ydHMgPSB3aW5kb3cuSFRNTEltcG9ydHMgfHwge1xuICBmbGFnczoge31cbn07XG5cbihmdW5jdGlvbihzY29wZSkge1xuICB2YXIgSU1QT1JUX0xJTktfVFlQRSA9IFwiaW1wb3J0XCI7XG4gIHZhciB1c2VOYXRpdmUgPSBCb29sZWFuKElNUE9SVF9MSU5LX1RZUEUgaW4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpbmtcIikpO1xuICB2YXIgaGFzU2hhZG93RE9NUG9seWZpbGwgPSBCb29sZWFuKHdpbmRvdy5TaGFkb3dET01Qb2x5ZmlsbCk7XG4gIHZhciB3cmFwID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHJldHVybiBoYXNTaGFkb3dET01Qb2x5ZmlsbCA/IFNoYWRvd0RPTVBvbHlmaWxsLndyYXBJZk5lZWRlZChub2RlKSA6IG5vZGU7XG4gIH07XG4gIHZhciByb290RG9jdW1lbnQgPSB3cmFwKGRvY3VtZW50KTtcbiAgdmFyIGN1cnJlbnRTY3JpcHREZXNjcmlwdG9yID0ge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc2NyaXB0ID0gSFRNTEltcG9ydHMuY3VycmVudFNjcmlwdCB8fCBkb2N1bWVudC5jdXJyZW50U2NyaXB0IHx8IChkb2N1bWVudC5yZWFkeVN0YXRlICE9PSBcImNvbXBsZXRlXCIgPyBkb2N1bWVudC5zY3JpcHRzW2RvY3VtZW50LnNjcmlwdHMubGVuZ3RoIC0gMV0gOiBudWxsKTtcbiAgICAgIHJldHVybiB3cmFwKHNjcmlwdCk7XG4gICAgfSxcbiAgICBjb25maWd1cmFibGU6IHRydWVcbiAgfTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGRvY3VtZW50LCBcIl9jdXJyZW50U2NyaXB0XCIsIGN1cnJlbnRTY3JpcHREZXNjcmlwdG9yKTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHJvb3REb2N1bWVudCwgXCJfY3VycmVudFNjcmlwdFwiLCBjdXJyZW50U2NyaXB0RGVzY3JpcHRvcik7XG4gIHZhciBpc0lFID0gL1RyaWRlbnR8RWRnZS8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtcbiAgZnVuY3Rpb24gd2hlblJlYWR5KGNhbGxiYWNrLCBkb2MpIHtcbiAgICBkb2MgPSBkb2MgfHwgcm9vdERvY3VtZW50O1xuICAgIHdoZW5Eb2N1bWVudFJlYWR5KGZ1bmN0aW9uKCkge1xuICAgICAgd2F0Y2hJbXBvcnRzTG9hZChjYWxsYmFjaywgZG9jKTtcbiAgICB9LCBkb2MpO1xuICB9XG4gIHZhciByZXF1aXJlZFJlYWR5U3RhdGUgPSBpc0lFID8gXCJjb21wbGV0ZVwiIDogXCJpbnRlcmFjdGl2ZVwiO1xuICB2YXIgUkVBRFlfRVZFTlQgPSBcInJlYWR5c3RhdGVjaGFuZ2VcIjtcbiAgZnVuY3Rpb24gaXNEb2N1bWVudFJlYWR5KGRvYykge1xuICAgIHJldHVybiBkb2MucmVhZHlTdGF0ZSA9PT0gXCJjb21wbGV0ZVwiIHx8IGRvYy5yZWFkeVN0YXRlID09PSByZXF1aXJlZFJlYWR5U3RhdGU7XG4gIH1cbiAgZnVuY3Rpb24gd2hlbkRvY3VtZW50UmVhZHkoY2FsbGJhY2ssIGRvYykge1xuICAgIGlmICghaXNEb2N1bWVudFJlYWR5KGRvYykpIHtcbiAgICAgIHZhciBjaGVja1JlYWR5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChkb2MucmVhZHlTdGF0ZSA9PT0gXCJjb21wbGV0ZVwiIHx8IGRvYy5yZWFkeVN0YXRlID09PSByZXF1aXJlZFJlYWR5U3RhdGUpIHtcbiAgICAgICAgICBkb2MucmVtb3ZlRXZlbnRMaXN0ZW5lcihSRUFEWV9FVkVOVCwgY2hlY2tSZWFkeSk7XG4gICAgICAgICAgd2hlbkRvY3VtZW50UmVhZHkoY2FsbGJhY2ssIGRvYyk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBkb2MuYWRkRXZlbnRMaXN0ZW5lcihSRUFEWV9FVkVOVCwgY2hlY2tSZWFkeSk7XG4gICAgfSBlbHNlIGlmIChjYWxsYmFjaykge1xuICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gbWFya1RhcmdldExvYWRlZChldmVudCkge1xuICAgIGV2ZW50LnRhcmdldC5fX2xvYWRlZCA9IHRydWU7XG4gIH1cbiAgZnVuY3Rpb24gd2F0Y2hJbXBvcnRzTG9hZChjYWxsYmFjaywgZG9jKSB7XG4gICAgdmFyIGltcG9ydHMgPSBkb2MucXVlcnlTZWxlY3RvckFsbChcImxpbmtbcmVsPWltcG9ydF1cIik7XG4gICAgdmFyIHBhcnNlZENvdW50ID0gMCwgaW1wb3J0Q291bnQgPSBpbXBvcnRzLmxlbmd0aCwgbmV3SW1wb3J0cyA9IFtdLCBlcnJvckltcG9ydHMgPSBbXTtcbiAgICBmdW5jdGlvbiBjaGVja0RvbmUoKSB7XG4gICAgICBpZiAocGFyc2VkQ291bnQgPT0gaW1wb3J0Q291bnQgJiYgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgIGFsbEltcG9ydHM6IGltcG9ydHMsXG4gICAgICAgICAgbG9hZGVkSW1wb3J0czogbmV3SW1wb3J0cyxcbiAgICAgICAgICBlcnJvckltcG9ydHM6IGVycm9ySW1wb3J0c1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gbG9hZGVkSW1wb3J0KGUpIHtcbiAgICAgIG1hcmtUYXJnZXRMb2FkZWQoZSk7XG4gICAgICBuZXdJbXBvcnRzLnB1c2godGhpcyk7XG4gICAgICBwYXJzZWRDb3VudCsrO1xuICAgICAgY2hlY2tEb25lKCk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGVycm9yTG9hZGluZ0ltcG9ydChlKSB7XG4gICAgICBlcnJvckltcG9ydHMucHVzaCh0aGlzKTtcbiAgICAgIHBhcnNlZENvdW50Kys7XG4gICAgICBjaGVja0RvbmUoKTtcbiAgICB9XG4gICAgaWYgKGltcG9ydENvdW50KSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgaW1wOyBpIDwgaW1wb3J0Q291bnQgJiYgKGltcCA9IGltcG9ydHNbaV0pOyBpKyspIHtcbiAgICAgICAgaWYgKGlzSW1wb3J0TG9hZGVkKGltcCkpIHtcbiAgICAgICAgICBwYXJzZWRDb3VudCsrO1xuICAgICAgICAgIGNoZWNrRG9uZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGltcC5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBsb2FkZWRJbXBvcnQpO1xuICAgICAgICAgIGltcC5hZGRFdmVudExpc3RlbmVyKFwiZXJyb3JcIiwgZXJyb3JMb2FkaW5nSW1wb3J0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjaGVja0RvbmUoKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gaXNJbXBvcnRMb2FkZWQobGluaykge1xuICAgIHJldHVybiB1c2VOYXRpdmUgPyBsaW5rLl9fbG9hZGVkIHx8IGxpbmsuaW1wb3J0ICYmIGxpbmsuaW1wb3J0LnJlYWR5U3RhdGUgIT09IFwibG9hZGluZ1wiIDogbGluay5fX2ltcG9ydFBhcnNlZDtcbiAgfVxuICBpZiAodXNlTmF0aXZlKSB7XG4gICAgbmV3IE11dGF0aW9uT2JzZXJ2ZXIoZnVuY3Rpb24obXhucykge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBteG5zLmxlbmd0aCwgbTsgaSA8IGwgJiYgKG0gPSBteG5zW2ldKTsgaSsrKSB7XG4gICAgICAgIGlmIChtLmFkZGVkTm9kZXMpIHtcbiAgICAgICAgICBoYW5kbGVJbXBvcnRzKG0uYWRkZWROb2Rlcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KS5vYnNlcnZlKGRvY3VtZW50LmhlYWQsIHtcbiAgICAgIGNoaWxkTGlzdDogdHJ1ZVxuICAgIH0pO1xuICAgIGZ1bmN0aW9uIGhhbmRsZUltcG9ydHMobm9kZXMpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gbm9kZXMubGVuZ3RoLCBuOyBpIDwgbCAmJiAobiA9IG5vZGVzW2ldKTsgaSsrKSB7XG4gICAgICAgIGlmIChpc0ltcG9ydChuKSkge1xuICAgICAgICAgIGhhbmRsZUltcG9ydChuKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBpc0ltcG9ydChlbGVtZW50KSB7XG4gICAgICByZXR1cm4gZWxlbWVudC5sb2NhbE5hbWUgPT09IFwibGlua1wiICYmIGVsZW1lbnQucmVsID09PSBcImltcG9ydFwiO1xuICAgIH1cbiAgICBmdW5jdGlvbiBoYW5kbGVJbXBvcnQoZWxlbWVudCkge1xuICAgICAgdmFyIGxvYWRlZCA9IGVsZW1lbnQuaW1wb3J0O1xuICAgICAgaWYgKGxvYWRlZCkge1xuICAgICAgICBtYXJrVGFyZ2V0TG9hZGVkKHtcbiAgICAgICAgICB0YXJnZXQ6IGVsZW1lbnRcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIG1hcmtUYXJnZXRMb2FkZWQpO1xuICAgICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLCBtYXJrVGFyZ2V0TG9hZGVkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgKGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09IFwibG9hZGluZ1wiKSB7XG4gICAgICAgIHZhciBpbXBvcnRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcImxpbmtbcmVsPWltcG9ydF1cIik7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gaW1wb3J0cy5sZW5ndGgsIGltcDsgaSA8IGwgJiYgKGltcCA9IGltcG9ydHNbaV0pOyBpKyspIHtcbiAgICAgICAgICBoYW5kbGVJbXBvcnQoaW1wKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pKCk7XG4gIH1cbiAgd2hlblJlYWR5KGZ1bmN0aW9uKGRldGFpbCkge1xuICAgIEhUTUxJbXBvcnRzLnJlYWR5ID0gdHJ1ZTtcbiAgICBIVE1MSW1wb3J0cy5yZWFkeVRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICB2YXIgZXZ0ID0gcm9vdERvY3VtZW50LmNyZWF0ZUV2ZW50KFwiQ3VzdG9tRXZlbnRcIik7XG4gICAgZXZ0LmluaXRDdXN0b21FdmVudChcIkhUTUxJbXBvcnRzTG9hZGVkXCIsIHRydWUsIHRydWUsIGRldGFpbCk7XG4gICAgcm9vdERvY3VtZW50LmRpc3BhdGNoRXZlbnQoZXZ0KTtcbiAgfSk7XG4gIHNjb3BlLklNUE9SVF9MSU5LX1RZUEUgPSBJTVBPUlRfTElOS19UWVBFO1xuICBzY29wZS51c2VOYXRpdmUgPSB1c2VOYXRpdmU7XG4gIHNjb3BlLnJvb3REb2N1bWVudCA9IHJvb3REb2N1bWVudDtcbiAgc2NvcGUud2hlblJlYWR5ID0gd2hlblJlYWR5O1xuICBzY29wZS5pc0lFID0gaXNJRTtcbn0pKEhUTUxJbXBvcnRzKTtcblxuKGZ1bmN0aW9uKHNjb3BlKSB7XG4gIHZhciBtb2R1bGVzID0gW107XG4gIHZhciBhZGRNb2R1bGUgPSBmdW5jdGlvbihtb2R1bGUpIHtcbiAgICBtb2R1bGVzLnB1c2gobW9kdWxlKTtcbiAgfTtcbiAgdmFyIGluaXRpYWxpemVNb2R1bGVzID0gZnVuY3Rpb24oKSB7XG4gICAgbW9kdWxlcy5mb3JFYWNoKGZ1bmN0aW9uKG1vZHVsZSkge1xuICAgICAgbW9kdWxlKHNjb3BlKTtcbiAgICB9KTtcbiAgfTtcbiAgc2NvcGUuYWRkTW9kdWxlID0gYWRkTW9kdWxlO1xuICBzY29wZS5pbml0aWFsaXplTW9kdWxlcyA9IGluaXRpYWxpemVNb2R1bGVzO1xufSkoSFRNTEltcG9ydHMpO1xuXG5IVE1MSW1wb3J0cy5hZGRNb2R1bGUoZnVuY3Rpb24oc2NvcGUpIHtcbiAgdmFyIENTU19VUkxfUkVHRVhQID0gLyh1cmxcXCgpKFteKV0qKShcXCkpL2c7XG4gIHZhciBDU1NfSU1QT1JUX1JFR0VYUCA9IC8oQGltcG9ydFtcXHNdKyg/IXVybFxcKCkpKFteO10qKSg7KS9nO1xuICB2YXIgcGF0aCA9IHtcbiAgICByZXNvbHZlVXJsc0luU3R5bGU6IGZ1bmN0aW9uKHN0eWxlLCBsaW5rVXJsKSB7XG4gICAgICB2YXIgZG9jID0gc3R5bGUub3duZXJEb2N1bWVudDtcbiAgICAgIHZhciByZXNvbHZlciA9IGRvYy5jcmVhdGVFbGVtZW50KFwiYVwiKTtcbiAgICAgIHN0eWxlLnRleHRDb250ZW50ID0gdGhpcy5yZXNvbHZlVXJsc0luQ3NzVGV4dChzdHlsZS50ZXh0Q29udGVudCwgbGlua1VybCwgcmVzb2x2ZXIpO1xuICAgICAgcmV0dXJuIHN0eWxlO1xuICAgIH0sXG4gICAgcmVzb2x2ZVVybHNJbkNzc1RleHQ6IGZ1bmN0aW9uKGNzc1RleHQsIGxpbmtVcmwsIHVybE9iaikge1xuICAgICAgdmFyIHIgPSB0aGlzLnJlcGxhY2VVcmxzKGNzc1RleHQsIHVybE9iaiwgbGlua1VybCwgQ1NTX1VSTF9SRUdFWFApO1xuICAgICAgciA9IHRoaXMucmVwbGFjZVVybHMociwgdXJsT2JqLCBsaW5rVXJsLCBDU1NfSU1QT1JUX1JFR0VYUCk7XG4gICAgICByZXR1cm4gcjtcbiAgICB9LFxuICAgIHJlcGxhY2VVcmxzOiBmdW5jdGlvbih0ZXh0LCB1cmxPYmosIGxpbmtVcmwsIHJlZ2V4cCkge1xuICAgICAgcmV0dXJuIHRleHQucmVwbGFjZShyZWdleHAsIGZ1bmN0aW9uKG0sIHByZSwgdXJsLCBwb3N0KSB7XG4gICAgICAgIHZhciB1cmxQYXRoID0gdXJsLnJlcGxhY2UoL1tcIiddL2csIFwiXCIpO1xuICAgICAgICBpZiAobGlua1VybCkge1xuICAgICAgICAgIHVybFBhdGggPSBuZXcgVVJMKHVybFBhdGgsIGxpbmtVcmwpLmhyZWY7XG4gICAgICAgIH1cbiAgICAgICAgdXJsT2JqLmhyZWYgPSB1cmxQYXRoO1xuICAgICAgICB1cmxQYXRoID0gdXJsT2JqLmhyZWY7XG4gICAgICAgIHJldHVybiBwcmUgKyBcIidcIiArIHVybFBhdGggKyBcIidcIiArIHBvc3Q7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG4gIHNjb3BlLnBhdGggPSBwYXRoO1xufSk7XG5cbkhUTUxJbXBvcnRzLmFkZE1vZHVsZShmdW5jdGlvbihzY29wZSkge1xuICB2YXIgeGhyID0ge1xuICAgIGFzeW5jOiB0cnVlLFxuICAgIG9rOiBmdW5jdGlvbihyZXF1ZXN0KSB7XG4gICAgICByZXR1cm4gcmVxdWVzdC5zdGF0dXMgPj0gMjAwICYmIHJlcXVlc3Quc3RhdHVzIDwgMzAwIHx8IHJlcXVlc3Quc3RhdHVzID09PSAzMDQgfHwgcmVxdWVzdC5zdGF0dXMgPT09IDA7XG4gICAgfSxcbiAgICBsb2FkOiBmdW5jdGlvbih1cmwsIG5leHQsIG5leHRDb250ZXh0KSB7XG4gICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgaWYgKHNjb3BlLmZsYWdzLmRlYnVnIHx8IHNjb3BlLmZsYWdzLmJ1c3QpIHtcbiAgICAgICAgdXJsICs9IFwiP1wiICsgTWF0aC5yYW5kb20oKTtcbiAgICAgIH1cbiAgICAgIHJlcXVlc3Qub3BlbihcIkdFVFwiLCB1cmwsIHhoci5hc3luYyk7XG4gICAgICByZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoXCJyZWFkeXN0YXRlY2hhbmdlXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKHJlcXVlc3QucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICAgIHZhciBsb2NhdGlvbkhlYWRlciA9IHJlcXVlc3QuZ2V0UmVzcG9uc2VIZWFkZXIoXCJMb2NhdGlvblwiKTtcbiAgICAgICAgICB2YXIgcmVkaXJlY3RlZFVybCA9IG51bGw7XG4gICAgICAgICAgaWYgKGxvY2F0aW9uSGVhZGVyKSB7XG4gICAgICAgICAgICB2YXIgcmVkaXJlY3RlZFVybCA9IGxvY2F0aW9uSGVhZGVyLnN1YnN0cigwLCAxKSA9PT0gXCIvXCIgPyBsb2NhdGlvbi5vcmlnaW4gKyBsb2NhdGlvbkhlYWRlciA6IGxvY2F0aW9uSGVhZGVyO1xuICAgICAgICAgIH1cbiAgICAgICAgICBuZXh0LmNhbGwobmV4dENvbnRleHQsICF4aHIub2socmVxdWVzdCkgJiYgcmVxdWVzdCwgcmVxdWVzdC5yZXNwb25zZSB8fCByZXF1ZXN0LnJlc3BvbnNlVGV4dCwgcmVkaXJlY3RlZFVybCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmVxdWVzdC5zZW5kKCk7XG4gICAgICByZXR1cm4gcmVxdWVzdDtcbiAgICB9LFxuICAgIGxvYWREb2N1bWVudDogZnVuY3Rpb24odXJsLCBuZXh0LCBuZXh0Q29udGV4dCkge1xuICAgICAgdGhpcy5sb2FkKHVybCwgbmV4dCwgbmV4dENvbnRleHQpLnJlc3BvbnNlVHlwZSA9IFwiZG9jdW1lbnRcIjtcbiAgICB9XG4gIH07XG4gIHNjb3BlLnhociA9IHhocjtcbn0pO1xuXG5IVE1MSW1wb3J0cy5hZGRNb2R1bGUoZnVuY3Rpb24oc2NvcGUpIHtcbiAgdmFyIHhociA9IHNjb3BlLnhocjtcbiAgdmFyIGZsYWdzID0gc2NvcGUuZmxhZ3M7XG4gIHZhciBMb2FkZXIgPSBmdW5jdGlvbihvbkxvYWQsIG9uQ29tcGxldGUpIHtcbiAgICB0aGlzLmNhY2hlID0ge307XG4gICAgdGhpcy5vbmxvYWQgPSBvbkxvYWQ7XG4gICAgdGhpcy5vbmNvbXBsZXRlID0gb25Db21wbGV0ZTtcbiAgICB0aGlzLmluZmxpZ2h0ID0gMDtcbiAgICB0aGlzLnBlbmRpbmcgPSB7fTtcbiAgfTtcbiAgTG9hZGVyLnByb3RvdHlwZSA9IHtcbiAgICBhZGROb2RlczogZnVuY3Rpb24obm9kZXMpIHtcbiAgICAgIHRoaXMuaW5mbGlnaHQgKz0gbm9kZXMubGVuZ3RoO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBub2Rlcy5sZW5ndGgsIG47IGkgPCBsICYmIChuID0gbm9kZXNbaV0pOyBpKyspIHtcbiAgICAgICAgdGhpcy5yZXF1aXJlKG4pO1xuICAgICAgfVxuICAgICAgdGhpcy5jaGVja0RvbmUoKTtcbiAgICB9LFxuICAgIGFkZE5vZGU6IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgIHRoaXMuaW5mbGlnaHQrKztcbiAgICAgIHRoaXMucmVxdWlyZShub2RlKTtcbiAgICAgIHRoaXMuY2hlY2tEb25lKCk7XG4gICAgfSxcbiAgICByZXF1aXJlOiBmdW5jdGlvbihlbHQpIHtcbiAgICAgIHZhciB1cmwgPSBlbHQuc3JjIHx8IGVsdC5ocmVmO1xuICAgICAgZWx0Ll9fbm9kZVVybCA9IHVybDtcbiAgICAgIGlmICghdGhpcy5kZWR1cGUodXJsLCBlbHQpKSB7XG4gICAgICAgIHRoaXMuZmV0Y2godXJsLCBlbHQpO1xuICAgICAgfVxuICAgIH0sXG4gICAgZGVkdXBlOiBmdW5jdGlvbih1cmwsIGVsdCkge1xuICAgICAgaWYgKHRoaXMucGVuZGluZ1t1cmxdKSB7XG4gICAgICAgIHRoaXMucGVuZGluZ1t1cmxdLnB1c2goZWx0KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICB2YXIgcmVzb3VyY2U7XG4gICAgICBpZiAodGhpcy5jYWNoZVt1cmxdKSB7XG4gICAgICAgIHRoaXMub25sb2FkKHVybCwgZWx0LCB0aGlzLmNhY2hlW3VybF0pO1xuICAgICAgICB0aGlzLnRhaWwoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICB0aGlzLnBlbmRpbmdbdXJsXSA9IFsgZWx0IF07XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcbiAgICBmZXRjaDogZnVuY3Rpb24odXJsLCBlbHQpIHtcbiAgICAgIGZsYWdzLmxvYWQgJiYgY29uc29sZS5sb2coXCJmZXRjaFwiLCB1cmwsIGVsdCk7XG4gICAgICBpZiAoIXVybCkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHRoaXMucmVjZWl2ZSh1cmwsIGVsdCwge1xuICAgICAgICAgICAgZXJyb3I6IFwiaHJlZiBtdXN0IGJlIHNwZWNpZmllZFwiXG4gICAgICAgICAgfSwgbnVsbCk7XG4gICAgICAgIH0uYmluZCh0aGlzKSwgMCk7XG4gICAgICB9IGVsc2UgaWYgKHVybC5tYXRjaCgvXmRhdGE6LykpIHtcbiAgICAgICAgdmFyIHBpZWNlcyA9IHVybC5zcGxpdChcIixcIik7XG4gICAgICAgIHZhciBoZWFkZXIgPSBwaWVjZXNbMF07XG4gICAgICAgIHZhciBib2R5ID0gcGllY2VzWzFdO1xuICAgICAgICBpZiAoaGVhZGVyLmluZGV4T2YoXCI7YmFzZTY0XCIpID4gLTEpIHtcbiAgICAgICAgICBib2R5ID0gYXRvYihib2R5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBib2R5ID0gZGVjb2RlVVJJQ29tcG9uZW50KGJvZHkpO1xuICAgICAgICB9XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdGhpcy5yZWNlaXZlKHVybCwgZWx0LCBudWxsLCBib2R5KTtcbiAgICAgICAgfS5iaW5kKHRoaXMpLCAwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciByZWNlaXZlWGhyID0gZnVuY3Rpb24oZXJyLCByZXNvdXJjZSwgcmVkaXJlY3RlZFVybCkge1xuICAgICAgICAgIHRoaXMucmVjZWl2ZSh1cmwsIGVsdCwgZXJyLCByZXNvdXJjZSwgcmVkaXJlY3RlZFVybCk7XG4gICAgICAgIH0uYmluZCh0aGlzKTtcbiAgICAgICAgeGhyLmxvYWQodXJsLCByZWNlaXZlWGhyKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHJlY2VpdmU6IGZ1bmN0aW9uKHVybCwgZWx0LCBlcnIsIHJlc291cmNlLCByZWRpcmVjdGVkVXJsKSB7XG4gICAgICB0aGlzLmNhY2hlW3VybF0gPSByZXNvdXJjZTtcbiAgICAgIHZhciAkcCA9IHRoaXMucGVuZGluZ1t1cmxdO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSAkcC5sZW5ndGgsIHA7IGkgPCBsICYmIChwID0gJHBbaV0pOyBpKyspIHtcbiAgICAgICAgdGhpcy5vbmxvYWQodXJsLCBwLCByZXNvdXJjZSwgZXJyLCByZWRpcmVjdGVkVXJsKTtcbiAgICAgICAgdGhpcy50YWlsKCk7XG4gICAgICB9XG4gICAgICB0aGlzLnBlbmRpbmdbdXJsXSA9IG51bGw7XG4gICAgfSxcbiAgICB0YWlsOiBmdW5jdGlvbigpIHtcbiAgICAgIC0tdGhpcy5pbmZsaWdodDtcbiAgICAgIHRoaXMuY2hlY2tEb25lKCk7XG4gICAgfSxcbiAgICBjaGVja0RvbmU6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCF0aGlzLmluZmxpZ2h0KSB7XG4gICAgICAgIHRoaXMub25jb21wbGV0ZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgc2NvcGUuTG9hZGVyID0gTG9hZGVyO1xufSk7XG5cbkhUTUxJbXBvcnRzLmFkZE1vZHVsZShmdW5jdGlvbihzY29wZSkge1xuICB2YXIgT2JzZXJ2ZXIgPSBmdW5jdGlvbihhZGRDYWxsYmFjaykge1xuICAgIHRoaXMuYWRkQ2FsbGJhY2sgPSBhZGRDYWxsYmFjaztcbiAgICB0aGlzLm1vID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIodGhpcy5oYW5kbGVyLmJpbmQodGhpcykpO1xuICB9O1xuICBPYnNlcnZlci5wcm90b3R5cGUgPSB7XG4gICAgaGFuZGxlcjogZnVuY3Rpb24obXV0YXRpb25zKSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IG11dGF0aW9ucy5sZW5ndGgsIG07IGkgPCBsICYmIChtID0gbXV0YXRpb25zW2ldKTsgaSsrKSB7XG4gICAgICAgIGlmIChtLnR5cGUgPT09IFwiY2hpbGRMaXN0XCIgJiYgbS5hZGRlZE5vZGVzLmxlbmd0aCkge1xuICAgICAgICAgIHRoaXMuYWRkZWROb2RlcyhtLmFkZGVkTm9kZXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBhZGRlZE5vZGVzOiBmdW5jdGlvbihub2Rlcykge1xuICAgICAgaWYgKHRoaXMuYWRkQ2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5hZGRDYWxsYmFjayhub2Rlcyk7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IG5vZGVzLmxlbmd0aCwgbiwgbG9hZGluZzsgaSA8IGwgJiYgKG4gPSBub2Rlc1tpXSk7IGkrKykge1xuICAgICAgICBpZiAobi5jaGlsZHJlbiAmJiBuLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgIHRoaXMuYWRkZWROb2RlcyhuLmNoaWxkcmVuKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgb2JzZXJ2ZTogZnVuY3Rpb24ocm9vdCkge1xuICAgICAgdGhpcy5tby5vYnNlcnZlKHJvb3QsIHtcbiAgICAgICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgICAgICBzdWJ0cmVlOiB0cnVlXG4gICAgICB9KTtcbiAgICB9XG4gIH07XG4gIHNjb3BlLk9ic2VydmVyID0gT2JzZXJ2ZXI7XG59KTtcblxuSFRNTEltcG9ydHMuYWRkTW9kdWxlKGZ1bmN0aW9uKHNjb3BlKSB7XG4gIHZhciBwYXRoID0gc2NvcGUucGF0aDtcbiAgdmFyIHJvb3REb2N1bWVudCA9IHNjb3BlLnJvb3REb2N1bWVudDtcbiAgdmFyIGZsYWdzID0gc2NvcGUuZmxhZ3M7XG4gIHZhciBpc0lFID0gc2NvcGUuaXNJRTtcbiAgdmFyIElNUE9SVF9MSU5LX1RZUEUgPSBzY29wZS5JTVBPUlRfTElOS19UWVBFO1xuICB2YXIgSU1QT1JUX1NFTEVDVE9SID0gXCJsaW5rW3JlbD1cIiArIElNUE9SVF9MSU5LX1RZUEUgKyBcIl1cIjtcbiAgdmFyIGltcG9ydFBhcnNlciA9IHtcbiAgICBkb2N1bWVudFNlbGVjdG9yczogSU1QT1JUX1NFTEVDVE9SLFxuICAgIGltcG9ydHNTZWxlY3RvcnM6IFsgSU1QT1JUX1NFTEVDVE9SLCBcImxpbmtbcmVsPXN0eWxlc2hlZXRdXCIsIFwic3R5bGVcIiwgXCJzY3JpcHQ6bm90KFt0eXBlXSlcIiwgJ3NjcmlwdFt0eXBlPVwidGV4dC9qYXZhc2NyaXB0XCJdJyBdLmpvaW4oXCIsXCIpLFxuICAgIG1hcDoge1xuICAgICAgbGluazogXCJwYXJzZUxpbmtcIixcbiAgICAgIHNjcmlwdDogXCJwYXJzZVNjcmlwdFwiLFxuICAgICAgc3R5bGU6IFwicGFyc2VTdHlsZVwiXG4gICAgfSxcbiAgICBkeW5hbWljRWxlbWVudHM6IFtdLFxuICAgIHBhcnNlTmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbmV4dCA9IHRoaXMubmV4dFRvUGFyc2UoKTtcbiAgICAgIGlmIChuZXh0KSB7XG4gICAgICAgIHRoaXMucGFyc2UobmV4dCk7XG4gICAgICB9XG4gICAgfSxcbiAgICBwYXJzZTogZnVuY3Rpb24oZWx0KSB7XG4gICAgICBpZiAodGhpcy5pc1BhcnNlZChlbHQpKSB7XG4gICAgICAgIGZsYWdzLnBhcnNlICYmIGNvbnNvbGUubG9nKFwiWyVzXSBpcyBhbHJlYWR5IHBhcnNlZFwiLCBlbHQubG9jYWxOYW1lKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGZuID0gdGhpc1t0aGlzLm1hcFtlbHQubG9jYWxOYW1lXV07XG4gICAgICBpZiAoZm4pIHtcbiAgICAgICAgdGhpcy5tYXJrUGFyc2luZyhlbHQpO1xuICAgICAgICBmbi5jYWxsKHRoaXMsIGVsdCk7XG4gICAgICB9XG4gICAgfSxcbiAgICBwYXJzZUR5bmFtaWM6IGZ1bmN0aW9uKGVsdCwgcXVpZXQpIHtcbiAgICAgIHRoaXMuZHluYW1pY0VsZW1lbnRzLnB1c2goZWx0KTtcbiAgICAgIGlmICghcXVpZXQpIHtcbiAgICAgICAgdGhpcy5wYXJzZU5leHQoKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIG1hcmtQYXJzaW5nOiBmdW5jdGlvbihlbHQpIHtcbiAgICAgIGZsYWdzLnBhcnNlICYmIGNvbnNvbGUubG9nKFwicGFyc2luZ1wiLCBlbHQpO1xuICAgICAgdGhpcy5wYXJzaW5nRWxlbWVudCA9IGVsdDtcbiAgICB9LFxuICAgIG1hcmtQYXJzaW5nQ29tcGxldGU6IGZ1bmN0aW9uKGVsdCkge1xuICAgICAgZWx0Ll9faW1wb3J0UGFyc2VkID0gdHJ1ZTtcbiAgICAgIHRoaXMubWFya0R5bmFtaWNQYXJzaW5nQ29tcGxldGUoZWx0KTtcbiAgICAgIGlmIChlbHQuX19pbXBvcnRFbGVtZW50KSB7XG4gICAgICAgIGVsdC5fX2ltcG9ydEVsZW1lbnQuX19pbXBvcnRQYXJzZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLm1hcmtEeW5hbWljUGFyc2luZ0NvbXBsZXRlKGVsdC5fX2ltcG9ydEVsZW1lbnQpO1xuICAgICAgfVxuICAgICAgdGhpcy5wYXJzaW5nRWxlbWVudCA9IG51bGw7XG4gICAgICBmbGFncy5wYXJzZSAmJiBjb25zb2xlLmxvZyhcImNvbXBsZXRlZFwiLCBlbHQpO1xuICAgIH0sXG4gICAgbWFya0R5bmFtaWNQYXJzaW5nQ29tcGxldGU6IGZ1bmN0aW9uKGVsdCkge1xuICAgICAgdmFyIGkgPSB0aGlzLmR5bmFtaWNFbGVtZW50cy5pbmRleE9mKGVsdCk7XG4gICAgICBpZiAoaSA+PSAwKSB7XG4gICAgICAgIHRoaXMuZHluYW1pY0VsZW1lbnRzLnNwbGljZShpLCAxKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHBhcnNlSW1wb3J0OiBmdW5jdGlvbihlbHQpIHtcbiAgICAgIGlmIChIVE1MSW1wb3J0cy5fX2ltcG9ydHNQYXJzaW5nSG9vaykge1xuICAgICAgICBIVE1MSW1wb3J0cy5fX2ltcG9ydHNQYXJzaW5nSG9vayhlbHQpO1xuICAgICAgfVxuICAgICAgaWYgKGVsdC5pbXBvcnQpIHtcbiAgICAgICAgZWx0LmltcG9ydC5fX2ltcG9ydFBhcnNlZCA9IHRydWU7XG4gICAgICB9XG4gICAgICB0aGlzLm1hcmtQYXJzaW5nQ29tcGxldGUoZWx0KTtcbiAgICAgIGlmIChlbHQuX19yZXNvdXJjZSAmJiAhZWx0Ll9fZXJyb3IpIHtcbiAgICAgICAgZWx0LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KFwibG9hZFwiLCB7XG4gICAgICAgICAgYnViYmxlczogZmFsc2VcbiAgICAgICAgfSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWx0LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KFwiZXJyb3JcIiwge1xuICAgICAgICAgIGJ1YmJsZXM6IGZhbHNlXG4gICAgICAgIH0pKTtcbiAgICAgIH1cbiAgICAgIGlmIChlbHQuX19wZW5kaW5nKSB7XG4gICAgICAgIHZhciBmbjtcbiAgICAgICAgd2hpbGUgKGVsdC5fX3BlbmRpbmcubGVuZ3RoKSB7XG4gICAgICAgICAgZm4gPSBlbHQuX19wZW5kaW5nLnNoaWZ0KCk7XG4gICAgICAgICAgaWYgKGZuKSB7XG4gICAgICAgICAgICBmbih7XG4gICAgICAgICAgICAgIHRhcmdldDogZWx0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMucGFyc2VOZXh0KCk7XG4gICAgfSxcbiAgICBwYXJzZUxpbms6IGZ1bmN0aW9uKGxpbmtFbHQpIHtcbiAgICAgIGlmIChub2RlSXNJbXBvcnQobGlua0VsdCkpIHtcbiAgICAgICAgdGhpcy5wYXJzZUltcG9ydChsaW5rRWx0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxpbmtFbHQuaHJlZiA9IGxpbmtFbHQuaHJlZjtcbiAgICAgICAgdGhpcy5wYXJzZUdlbmVyaWMobGlua0VsdCk7XG4gICAgICB9XG4gICAgfSxcbiAgICBwYXJzZVN0eWxlOiBmdW5jdGlvbihlbHQpIHtcbiAgICAgIHZhciBzcmMgPSBlbHQ7XG4gICAgICBlbHQgPSBjbG9uZVN0eWxlKGVsdCk7XG4gICAgICBzcmMuX19hcHBsaWVkRWxlbWVudCA9IGVsdDtcbiAgICAgIGVsdC5fX2ltcG9ydEVsZW1lbnQgPSBzcmM7XG4gICAgICB0aGlzLnBhcnNlR2VuZXJpYyhlbHQpO1xuICAgIH0sXG4gICAgcGFyc2VHZW5lcmljOiBmdW5jdGlvbihlbHQpIHtcbiAgICAgIHRoaXMudHJhY2tFbGVtZW50KGVsdCk7XG4gICAgICB0aGlzLmFkZEVsZW1lbnRUb0RvY3VtZW50KGVsdCk7XG4gICAgfSxcbiAgICByb290SW1wb3J0Rm9yRWxlbWVudDogZnVuY3Rpb24oZWx0KSB7XG4gICAgICB2YXIgbiA9IGVsdDtcbiAgICAgIHdoaWxlIChuLm93bmVyRG9jdW1lbnQuX19pbXBvcnRMaW5rKSB7XG4gICAgICAgIG4gPSBuLm93bmVyRG9jdW1lbnQuX19pbXBvcnRMaW5rO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG47XG4gICAgfSxcbiAgICBhZGRFbGVtZW50VG9Eb2N1bWVudDogZnVuY3Rpb24oZWx0KSB7XG4gICAgICB2YXIgcG9ydCA9IHRoaXMucm9vdEltcG9ydEZvckVsZW1lbnQoZWx0Ll9faW1wb3J0RWxlbWVudCB8fCBlbHQpO1xuICAgICAgcG9ydC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShlbHQsIHBvcnQpO1xuICAgIH0sXG4gICAgdHJhY2tFbGVtZW50OiBmdW5jdGlvbihlbHQsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgZG9uZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgY2FsbGJhY2soZSk7XG4gICAgICAgIH1cbiAgICAgICAgc2VsZi5tYXJrUGFyc2luZ0NvbXBsZXRlKGVsdCk7XG4gICAgICAgIHNlbGYucGFyc2VOZXh0KCk7XG4gICAgICB9O1xuICAgICAgZWx0LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGRvbmUpO1xuICAgICAgZWx0LmFkZEV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLCBkb25lKTtcbiAgICAgIGlmIChpc0lFICYmIGVsdC5sb2NhbE5hbWUgPT09IFwic3R5bGVcIikge1xuICAgICAgICB2YXIgZmFrZUxvYWQgPSBmYWxzZTtcbiAgICAgICAgaWYgKGVsdC50ZXh0Q29udGVudC5pbmRleE9mKFwiQGltcG9ydFwiKSA9PSAtMSkge1xuICAgICAgICAgIGZha2VMb2FkID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChlbHQuc2hlZXQpIHtcbiAgICAgICAgICBmYWtlTG9hZCA9IHRydWU7XG4gICAgICAgICAgdmFyIGNzciA9IGVsdC5zaGVldC5jc3NSdWxlcztcbiAgICAgICAgICB2YXIgbGVuID0gY3NyID8gY3NyLmxlbmd0aCA6IDA7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDAsIHI7IGkgPCBsZW4gJiYgKHIgPSBjc3JbaV0pOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChyLnR5cGUgPT09IENTU1J1bGUuSU1QT1JUX1JVTEUpIHtcbiAgICAgICAgICAgICAgZmFrZUxvYWQgPSBmYWtlTG9hZCAmJiBCb29sZWFuKHIuc3R5bGVTaGVldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmYWtlTG9hZCkge1xuICAgICAgICAgIGVsdC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudChcImxvYWRcIiwge1xuICAgICAgICAgICAgYnViYmxlczogZmFsc2VcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIHBhcnNlU2NyaXB0OiBmdW5jdGlvbihzY3JpcHRFbHQpIHtcbiAgICAgIHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xuICAgICAgc2NyaXB0Ll9faW1wb3J0RWxlbWVudCA9IHNjcmlwdEVsdDtcbiAgICAgIHNjcmlwdC5zcmMgPSBzY3JpcHRFbHQuc3JjID8gc2NyaXB0RWx0LnNyYyA6IGdlbmVyYXRlU2NyaXB0RGF0YVVybChzY3JpcHRFbHQpO1xuICAgICAgc2NvcGUuY3VycmVudFNjcmlwdCA9IHNjcmlwdEVsdDtcbiAgICAgIHRoaXMudHJhY2tFbGVtZW50KHNjcmlwdCwgZnVuY3Rpb24oZSkge1xuICAgICAgICBzY3JpcHQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzY3JpcHQpO1xuICAgICAgICBzY29wZS5jdXJyZW50U2NyaXB0ID0gbnVsbDtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5hZGRFbGVtZW50VG9Eb2N1bWVudChzY3JpcHQpO1xuICAgIH0sXG4gICAgbmV4dFRvUGFyc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fbWF5UGFyc2UgPSBbXTtcbiAgICAgIHJldHVybiAhdGhpcy5wYXJzaW5nRWxlbWVudCAmJiAodGhpcy5uZXh0VG9QYXJzZUluRG9jKHJvb3REb2N1bWVudCkgfHwgdGhpcy5uZXh0VG9QYXJzZUR5bmFtaWMoKSk7XG4gICAgfSxcbiAgICBuZXh0VG9QYXJzZUluRG9jOiBmdW5jdGlvbihkb2MsIGxpbmspIHtcbiAgICAgIGlmIChkb2MgJiYgdGhpcy5fbWF5UGFyc2UuaW5kZXhPZihkb2MpIDwgMCkge1xuICAgICAgICB0aGlzLl9tYXlQYXJzZS5wdXNoKGRvYyk7XG4gICAgICAgIHZhciBub2RlcyA9IGRvYy5xdWVyeVNlbGVjdG9yQWxsKHRoaXMucGFyc2VTZWxlY3RvcnNGb3JOb2RlKGRvYykpO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IG5vZGVzLmxlbmd0aCwgcCA9IDAsIG47IGkgPCBsICYmIChuID0gbm9kZXNbaV0pOyBpKyspIHtcbiAgICAgICAgICBpZiAoIXRoaXMuaXNQYXJzZWQobikpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmhhc1Jlc291cmNlKG4pKSB7XG4gICAgICAgICAgICAgIHJldHVybiBub2RlSXNJbXBvcnQobikgPyB0aGlzLm5leHRUb1BhcnNlSW5Eb2Mobi5pbXBvcnQsIG4pIDogbjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBsaW5rO1xuICAgIH0sXG4gICAgbmV4dFRvUGFyc2VEeW5hbWljOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLmR5bmFtaWNFbGVtZW50c1swXTtcbiAgICB9LFxuICAgIHBhcnNlU2VsZWN0b3JzRm9yTm9kZTogZnVuY3Rpb24obm9kZSkge1xuICAgICAgdmFyIGRvYyA9IG5vZGUub3duZXJEb2N1bWVudCB8fCBub2RlO1xuICAgICAgcmV0dXJuIGRvYyA9PT0gcm9vdERvY3VtZW50ID8gdGhpcy5kb2N1bWVudFNlbGVjdG9ycyA6IHRoaXMuaW1wb3J0c1NlbGVjdG9ycztcbiAgICB9LFxuICAgIGlzUGFyc2VkOiBmdW5jdGlvbihub2RlKSB7XG4gICAgICByZXR1cm4gbm9kZS5fX2ltcG9ydFBhcnNlZDtcbiAgICB9LFxuICAgIG5lZWRzRHluYW1pY1BhcnNpbmc6IGZ1bmN0aW9uKGVsdCkge1xuICAgICAgcmV0dXJuIHRoaXMuZHluYW1pY0VsZW1lbnRzLmluZGV4T2YoZWx0KSA+PSAwO1xuICAgIH0sXG4gICAgaGFzUmVzb3VyY2U6IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgIGlmIChub2RlSXNJbXBvcnQobm9kZSkgJiYgbm9kZS5pbXBvcnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH07XG4gIGZ1bmN0aW9uIG5vZGVJc0ltcG9ydChlbHQpIHtcbiAgICByZXR1cm4gZWx0LmxvY2FsTmFtZSA9PT0gXCJsaW5rXCIgJiYgZWx0LnJlbCA9PT0gSU1QT1JUX0xJTktfVFlQRTtcbiAgfVxuICBmdW5jdGlvbiBnZW5lcmF0ZVNjcmlwdERhdGFVcmwoc2NyaXB0KSB7XG4gICAgdmFyIHNjcmlwdENvbnRlbnQgPSBnZW5lcmF0ZVNjcmlwdENvbnRlbnQoc2NyaXB0KTtcbiAgICByZXR1cm4gXCJkYXRhOnRleHQvamF2YXNjcmlwdDtjaGFyc2V0PXV0Zi04LFwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHNjcmlwdENvbnRlbnQpO1xuICB9XG4gIGZ1bmN0aW9uIGdlbmVyYXRlU2NyaXB0Q29udGVudChzY3JpcHQpIHtcbiAgICByZXR1cm4gc2NyaXB0LnRleHRDb250ZW50ICsgZ2VuZXJhdGVTb3VyY2VNYXBIaW50KHNjcmlwdCk7XG4gIH1cbiAgZnVuY3Rpb24gZ2VuZXJhdGVTb3VyY2VNYXBIaW50KHNjcmlwdCkge1xuICAgIHZhciBvd25lciA9IHNjcmlwdC5vd25lckRvY3VtZW50O1xuICAgIG93bmVyLl9faW1wb3J0ZWRTY3JpcHRzID0gb3duZXIuX19pbXBvcnRlZFNjcmlwdHMgfHwgMDtcbiAgICB2YXIgbW9uaWtlciA9IHNjcmlwdC5vd25lckRvY3VtZW50LmJhc2VVUkk7XG4gICAgdmFyIG51bSA9IG93bmVyLl9faW1wb3J0ZWRTY3JpcHRzID8gXCItXCIgKyBvd25lci5fX2ltcG9ydGVkU2NyaXB0cyA6IFwiXCI7XG4gICAgb3duZXIuX19pbXBvcnRlZFNjcmlwdHMrKztcbiAgICByZXR1cm4gXCJcXG4vLyMgc291cmNlVVJMPVwiICsgbW9uaWtlciArIG51bSArIFwiLmpzXFxuXCI7XG4gIH1cbiAgZnVuY3Rpb24gY2xvbmVTdHlsZShzdHlsZSkge1xuICAgIHZhciBjbG9uZSA9IHN0eWxlLm93bmVyRG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInN0eWxlXCIpO1xuICAgIGNsb25lLnRleHRDb250ZW50ID0gc3R5bGUudGV4dENvbnRlbnQ7XG4gICAgcGF0aC5yZXNvbHZlVXJsc0luU3R5bGUoY2xvbmUpO1xuICAgIHJldHVybiBjbG9uZTtcbiAgfVxuICBzY29wZS5wYXJzZXIgPSBpbXBvcnRQYXJzZXI7XG4gIHNjb3BlLklNUE9SVF9TRUxFQ1RPUiA9IElNUE9SVF9TRUxFQ1RPUjtcbn0pO1xuXG5IVE1MSW1wb3J0cy5hZGRNb2R1bGUoZnVuY3Rpb24oc2NvcGUpIHtcbiAgdmFyIGZsYWdzID0gc2NvcGUuZmxhZ3M7XG4gIHZhciBJTVBPUlRfTElOS19UWVBFID0gc2NvcGUuSU1QT1JUX0xJTktfVFlQRTtcbiAgdmFyIElNUE9SVF9TRUxFQ1RPUiA9IHNjb3BlLklNUE9SVF9TRUxFQ1RPUjtcbiAgdmFyIHJvb3REb2N1bWVudCA9IHNjb3BlLnJvb3REb2N1bWVudDtcbiAgdmFyIExvYWRlciA9IHNjb3BlLkxvYWRlcjtcbiAgdmFyIE9ic2VydmVyID0gc2NvcGUuT2JzZXJ2ZXI7XG4gIHZhciBwYXJzZXIgPSBzY29wZS5wYXJzZXI7XG4gIHZhciBpbXBvcnRlciA9IHtcbiAgICBkb2N1bWVudHM6IHt9LFxuICAgIGRvY3VtZW50UHJlbG9hZFNlbGVjdG9yczogSU1QT1JUX1NFTEVDVE9SLFxuICAgIGltcG9ydHNQcmVsb2FkU2VsZWN0b3JzOiBbIElNUE9SVF9TRUxFQ1RPUiBdLmpvaW4oXCIsXCIpLFxuICAgIGxvYWROb2RlOiBmdW5jdGlvbihub2RlKSB7XG4gICAgICBpbXBvcnRMb2FkZXIuYWRkTm9kZShub2RlKTtcbiAgICB9LFxuICAgIGxvYWRTdWJ0cmVlOiBmdW5jdGlvbihwYXJlbnQpIHtcbiAgICAgIHZhciBub2RlcyA9IHRoaXMubWFyc2hhbE5vZGVzKHBhcmVudCk7XG4gICAgICBpbXBvcnRMb2FkZXIuYWRkTm9kZXMobm9kZXMpO1xuICAgIH0sXG4gICAgbWFyc2hhbE5vZGVzOiBmdW5jdGlvbihwYXJlbnQpIHtcbiAgICAgIHJldHVybiBwYXJlbnQucXVlcnlTZWxlY3RvckFsbCh0aGlzLmxvYWRTZWxlY3RvcnNGb3JOb2RlKHBhcmVudCkpO1xuICAgIH0sXG4gICAgbG9hZFNlbGVjdG9yc0Zvck5vZGU6IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgIHZhciBkb2MgPSBub2RlLm93bmVyRG9jdW1lbnQgfHwgbm9kZTtcbiAgICAgIHJldHVybiBkb2MgPT09IHJvb3REb2N1bWVudCA/IHRoaXMuZG9jdW1lbnRQcmVsb2FkU2VsZWN0b3JzIDogdGhpcy5pbXBvcnRzUHJlbG9hZFNlbGVjdG9ycztcbiAgICB9LFxuICAgIGxvYWRlZDogZnVuY3Rpb24odXJsLCBlbHQsIHJlc291cmNlLCBlcnIsIHJlZGlyZWN0ZWRVcmwpIHtcbiAgICAgIGZsYWdzLmxvYWQgJiYgY29uc29sZS5sb2coXCJsb2FkZWRcIiwgdXJsLCBlbHQpO1xuICAgICAgZWx0Ll9fcmVzb3VyY2UgPSByZXNvdXJjZTtcbiAgICAgIGVsdC5fX2Vycm9yID0gZXJyO1xuICAgICAgaWYgKGlzSW1wb3J0TGluayhlbHQpKSB7XG4gICAgICAgIHZhciBkb2MgPSB0aGlzLmRvY3VtZW50c1t1cmxdO1xuICAgICAgICBpZiAoZG9jID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBkb2MgPSBlcnIgPyBudWxsIDogbWFrZURvY3VtZW50KHJlc291cmNlLCByZWRpcmVjdGVkVXJsIHx8IHVybCk7XG4gICAgICAgICAgaWYgKGRvYykge1xuICAgICAgICAgICAgZG9jLl9faW1wb3J0TGluayA9IGVsdDtcbiAgICAgICAgICAgIHRoaXMuYm9vdERvY3VtZW50KGRvYyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuZG9jdW1lbnRzW3VybF0gPSBkb2M7XG4gICAgICAgIH1cbiAgICAgICAgZWx0LmltcG9ydCA9IGRvYztcbiAgICAgIH1cbiAgICAgIHBhcnNlci5wYXJzZU5leHQoKTtcbiAgICB9LFxuICAgIGJvb3REb2N1bWVudDogZnVuY3Rpb24oZG9jKSB7XG4gICAgICB0aGlzLmxvYWRTdWJ0cmVlKGRvYyk7XG4gICAgICB0aGlzLm9ic2VydmVyLm9ic2VydmUoZG9jKTtcbiAgICAgIHBhcnNlci5wYXJzZU5leHQoKTtcbiAgICB9LFxuICAgIGxvYWRlZEFsbDogZnVuY3Rpb24oKSB7XG4gICAgICBwYXJzZXIucGFyc2VOZXh0KCk7XG4gICAgfVxuICB9O1xuICB2YXIgaW1wb3J0TG9hZGVyID0gbmV3IExvYWRlcihpbXBvcnRlci5sb2FkZWQuYmluZChpbXBvcnRlciksIGltcG9ydGVyLmxvYWRlZEFsbC5iaW5kKGltcG9ydGVyKSk7XG4gIGltcG9ydGVyLm9ic2VydmVyID0gbmV3IE9ic2VydmVyKCk7XG4gIGZ1bmN0aW9uIGlzSW1wb3J0TGluayhlbHQpIHtcbiAgICByZXR1cm4gaXNMaW5rUmVsKGVsdCwgSU1QT1JUX0xJTktfVFlQRSk7XG4gIH1cbiAgZnVuY3Rpb24gaXNMaW5rUmVsKGVsdCwgcmVsKSB7XG4gICAgcmV0dXJuIGVsdC5sb2NhbE5hbWUgPT09IFwibGlua1wiICYmIGVsdC5nZXRBdHRyaWJ1dGUoXCJyZWxcIikgPT09IHJlbDtcbiAgfVxuICBmdW5jdGlvbiBoYXNCYXNlVVJJQWNjZXNzb3IoZG9jKSB7XG4gICAgcmV0dXJuICEhT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihkb2MsIFwiYmFzZVVSSVwiKTtcbiAgfVxuICBmdW5jdGlvbiBtYWtlRG9jdW1lbnQocmVzb3VyY2UsIHVybCkge1xuICAgIHZhciBkb2MgPSBkb2N1bWVudC5pbXBsZW1lbnRhdGlvbi5jcmVhdGVIVE1MRG9jdW1lbnQoSU1QT1JUX0xJTktfVFlQRSk7XG4gICAgZG9jLl9VUkwgPSB1cmw7XG4gICAgdmFyIGJhc2UgPSBkb2MuY3JlYXRlRWxlbWVudChcImJhc2VcIik7XG4gICAgYmFzZS5zZXRBdHRyaWJ1dGUoXCJocmVmXCIsIHVybCk7XG4gICAgaWYgKCFkb2MuYmFzZVVSSSAmJiAhaGFzQmFzZVVSSUFjY2Vzc29yKGRvYykpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShkb2MsIFwiYmFzZVVSSVwiLCB7XG4gICAgICAgIHZhbHVlOiB1cmxcbiAgICAgIH0pO1xuICAgIH1cbiAgICB2YXIgbWV0YSA9IGRvYy5jcmVhdGVFbGVtZW50KFwibWV0YVwiKTtcbiAgICBtZXRhLnNldEF0dHJpYnV0ZShcImNoYXJzZXRcIiwgXCJ1dGYtOFwiKTtcbiAgICBkb2MuaGVhZC5hcHBlbmRDaGlsZChtZXRhKTtcbiAgICBkb2MuaGVhZC5hcHBlbmRDaGlsZChiYXNlKTtcbiAgICBkb2MuYm9keS5pbm5lckhUTUwgPSByZXNvdXJjZTtcbiAgICBpZiAod2luZG93LkhUTUxUZW1wbGF0ZUVsZW1lbnQgJiYgSFRNTFRlbXBsYXRlRWxlbWVudC5ib290c3RyYXApIHtcbiAgICAgIEhUTUxUZW1wbGF0ZUVsZW1lbnQuYm9vdHN0cmFwKGRvYyk7XG4gICAgfVxuICAgIHJldHVybiBkb2M7XG4gIH1cbiAgaWYgKCFkb2N1bWVudC5iYXNlVVJJKSB7XG4gICAgdmFyIGJhc2VVUklEZXNjcmlwdG9yID0ge1xuICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGJhc2UgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiYmFzZVwiKTtcbiAgICAgICAgcmV0dXJuIGJhc2UgPyBiYXNlLmhyZWYgOiB3aW5kb3cubG9jYXRpb24uaHJlZjtcbiAgICAgIH0sXG4gICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9O1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShkb2N1bWVudCwgXCJiYXNlVVJJXCIsIGJhc2VVUklEZXNjcmlwdG9yKTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocm9vdERvY3VtZW50LCBcImJhc2VVUklcIiwgYmFzZVVSSURlc2NyaXB0b3IpO1xuICB9XG4gIHNjb3BlLmltcG9ydGVyID0gaW1wb3J0ZXI7XG4gIHNjb3BlLmltcG9ydExvYWRlciA9IGltcG9ydExvYWRlcjtcbn0pO1xuXG5IVE1MSW1wb3J0cy5hZGRNb2R1bGUoZnVuY3Rpb24oc2NvcGUpIHtcbiAgdmFyIHBhcnNlciA9IHNjb3BlLnBhcnNlcjtcbiAgdmFyIGltcG9ydGVyID0gc2NvcGUuaW1wb3J0ZXI7XG4gIHZhciBkeW5hbWljID0ge1xuICAgIGFkZGVkOiBmdW5jdGlvbihub2Rlcykge1xuICAgICAgdmFyIG93bmVyLCBwYXJzZWQsIGxvYWRpbmc7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IG5vZGVzLmxlbmd0aCwgbjsgaSA8IGwgJiYgKG4gPSBub2Rlc1tpXSk7IGkrKykge1xuICAgICAgICBpZiAoIW93bmVyKSB7XG4gICAgICAgICAgb3duZXIgPSBuLm93bmVyRG9jdW1lbnQ7XG4gICAgICAgICAgcGFyc2VkID0gcGFyc2VyLmlzUGFyc2VkKG93bmVyKTtcbiAgICAgICAgfVxuICAgICAgICBsb2FkaW5nID0gdGhpcy5zaG91bGRMb2FkTm9kZShuKTtcbiAgICAgICAgaWYgKGxvYWRpbmcpIHtcbiAgICAgICAgICBpbXBvcnRlci5sb2FkTm9kZShuKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5zaG91bGRQYXJzZU5vZGUobikgJiYgcGFyc2VkKSB7XG4gICAgICAgICAgcGFyc2VyLnBhcnNlRHluYW1pYyhuLCBsb2FkaW5nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgc2hvdWxkTG9hZE5vZGU6IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgIHJldHVybiBub2RlLm5vZGVUeXBlID09PSAxICYmIG1hdGNoZXMuY2FsbChub2RlLCBpbXBvcnRlci5sb2FkU2VsZWN0b3JzRm9yTm9kZShub2RlKSk7XG4gICAgfSxcbiAgICBzaG91bGRQYXJzZU5vZGU6IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgIHJldHVybiBub2RlLm5vZGVUeXBlID09PSAxICYmIG1hdGNoZXMuY2FsbChub2RlLCBwYXJzZXIucGFyc2VTZWxlY3RvcnNGb3JOb2RlKG5vZGUpKTtcbiAgICB9XG4gIH07XG4gIGltcG9ydGVyLm9ic2VydmVyLmFkZENhbGxiYWNrID0gZHluYW1pYy5hZGRlZC5iaW5kKGR5bmFtaWMpO1xuICB2YXIgbWF0Y2hlcyA9IEhUTUxFbGVtZW50LnByb3RvdHlwZS5tYXRjaGVzIHx8IEhUTUxFbGVtZW50LnByb3RvdHlwZS5tYXRjaGVzU2VsZWN0b3IgfHwgSFRNTEVsZW1lbnQucHJvdG90eXBlLndlYmtpdE1hdGNoZXNTZWxlY3RvciB8fCBIVE1MRWxlbWVudC5wcm90b3R5cGUubW96TWF0Y2hlc1NlbGVjdG9yIHx8IEhUTUxFbGVtZW50LnByb3RvdHlwZS5tc01hdGNoZXNTZWxlY3Rvcjtcbn0pO1xuXG4oZnVuY3Rpb24oc2NvcGUpIHtcbiAgdmFyIGluaXRpYWxpemVNb2R1bGVzID0gc2NvcGUuaW5pdGlhbGl6ZU1vZHVsZXM7XG4gIHZhciBpc0lFID0gc2NvcGUuaXNJRTtcbiAgaWYgKHNjb3BlLnVzZU5hdGl2ZSkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoaXNJRSAmJiB0eXBlb2Ygd2luZG93LkN1c3RvbUV2ZW50ICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB3aW5kb3cuQ3VzdG9tRXZlbnQgPSBmdW5jdGlvbihpblR5cGUsIHBhcmFtcykge1xuICAgICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xuICAgICAgdmFyIGUgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIkN1c3RvbUV2ZW50XCIpO1xuICAgICAgZS5pbml0Q3VzdG9tRXZlbnQoaW5UeXBlLCBCb29sZWFuKHBhcmFtcy5idWJibGVzKSwgQm9vbGVhbihwYXJhbXMuY2FuY2VsYWJsZSksIHBhcmFtcy5kZXRhaWwpO1xuICAgICAgcmV0dXJuIGU7XG4gICAgfTtcbiAgICB3aW5kb3cuQ3VzdG9tRXZlbnQucHJvdG90eXBlID0gd2luZG93LkV2ZW50LnByb3RvdHlwZTtcbiAgfVxuICBpbml0aWFsaXplTW9kdWxlcygpO1xuICB2YXIgcm9vdERvY3VtZW50ID0gc2NvcGUucm9vdERvY3VtZW50O1xuICBmdW5jdGlvbiBib290c3RyYXAoKSB7XG4gICAgSFRNTEltcG9ydHMuaW1wb3J0ZXIuYm9vdERvY3VtZW50KHJvb3REb2N1bWVudCk7XG4gIH1cbiAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09IFwiY29tcGxldGVcIiB8fCBkb2N1bWVudC5yZWFkeVN0YXRlID09PSBcImludGVyYWN0aXZlXCIgJiYgIXdpbmRvdy5hdHRhY2hFdmVudCkge1xuICAgIGJvb3RzdHJhcCgpO1xuICB9IGVsc2Uge1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsIGJvb3RzdHJhcCk7XG4gIH1cbn0pKEhUTUxJbXBvcnRzKTtcblxud2luZG93LkN1c3RvbUVsZW1lbnRzID0gd2luZG93LkN1c3RvbUVsZW1lbnRzIHx8IHtcbiAgZmxhZ3M6IHt9XG59O1xuXG4oZnVuY3Rpb24oc2NvcGUpIHtcbiAgdmFyIGZsYWdzID0gc2NvcGUuZmxhZ3M7XG4gIHZhciBtb2R1bGVzID0gW107XG4gIHZhciBhZGRNb2R1bGUgPSBmdW5jdGlvbihtb2R1bGUpIHtcbiAgICBtb2R1bGVzLnB1c2gobW9kdWxlKTtcbiAgfTtcbiAgdmFyIGluaXRpYWxpemVNb2R1bGVzID0gZnVuY3Rpb24oKSB7XG4gICAgbW9kdWxlcy5mb3JFYWNoKGZ1bmN0aW9uKG1vZHVsZSkge1xuICAgICAgbW9kdWxlKHNjb3BlKTtcbiAgICB9KTtcbiAgfTtcbiAgc2NvcGUuYWRkTW9kdWxlID0gYWRkTW9kdWxlO1xuICBzY29wZS5pbml0aWFsaXplTW9kdWxlcyA9IGluaXRpYWxpemVNb2R1bGVzO1xuICBzY29wZS5oYXNOYXRpdmUgPSBCb29sZWFuKGRvY3VtZW50LnJlZ2lzdGVyRWxlbWVudCk7XG4gIHNjb3BlLnVzZU5hdGl2ZSA9ICFmbGFncy5yZWdpc3RlciAmJiBzY29wZS5oYXNOYXRpdmUgJiYgIXdpbmRvdy5TaGFkb3dET01Qb2x5ZmlsbCAmJiAoIXdpbmRvdy5IVE1MSW1wb3J0cyB8fCBIVE1MSW1wb3J0cy51c2VOYXRpdmUpO1xufSkoQ3VzdG9tRWxlbWVudHMpO1xuXG5DdXN0b21FbGVtZW50cy5hZGRNb2R1bGUoZnVuY3Rpb24oc2NvcGUpIHtcbiAgdmFyIElNUE9SVF9MSU5LX1RZUEUgPSB3aW5kb3cuSFRNTEltcG9ydHMgPyBIVE1MSW1wb3J0cy5JTVBPUlRfTElOS19UWVBFIDogXCJub25lXCI7XG4gIGZ1bmN0aW9uIGZvclN1YnRyZWUobm9kZSwgY2IpIHtcbiAgICBmaW5kQWxsRWxlbWVudHMobm9kZSwgZnVuY3Rpb24oZSkge1xuICAgICAgaWYgKGNiKGUpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgZm9yUm9vdHMoZSwgY2IpO1xuICAgIH0pO1xuICAgIGZvclJvb3RzKG5vZGUsIGNiKTtcbiAgfVxuICBmdW5jdGlvbiBmaW5kQWxsRWxlbWVudHMobm9kZSwgZmluZCwgZGF0YSkge1xuICAgIHZhciBlID0gbm9kZS5maXJzdEVsZW1lbnRDaGlsZDtcbiAgICBpZiAoIWUpIHtcbiAgICAgIGUgPSBub2RlLmZpcnN0Q2hpbGQ7XG4gICAgICB3aGlsZSAoZSAmJiBlLm5vZGVUeXBlICE9PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xuICAgICAgICBlID0gZS5uZXh0U2libGluZztcbiAgICAgIH1cbiAgICB9XG4gICAgd2hpbGUgKGUpIHtcbiAgICAgIGlmIChmaW5kKGUsIGRhdGEpICE9PSB0cnVlKSB7XG4gICAgICAgIGZpbmRBbGxFbGVtZW50cyhlLCBmaW5kLCBkYXRhKTtcbiAgICAgIH1cbiAgICAgIGUgPSBlLm5leHRFbGVtZW50U2libGluZztcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgZnVuY3Rpb24gZm9yUm9vdHMobm9kZSwgY2IpIHtcbiAgICB2YXIgcm9vdCA9IG5vZGUuc2hhZG93Um9vdDtcbiAgICB3aGlsZSAocm9vdCkge1xuICAgICAgZm9yU3VidHJlZShyb290LCBjYik7XG4gICAgICByb290ID0gcm9vdC5vbGRlclNoYWRvd1Jvb3Q7XG4gICAgfVxuICB9XG4gIHZhciBwcm9jZXNzaW5nRG9jdW1lbnRzO1xuICBmdW5jdGlvbiBmb3JEb2N1bWVudFRyZWUoZG9jLCBjYikge1xuICAgIHByb2Nlc3NpbmdEb2N1bWVudHMgPSBbXTtcbiAgICBfZm9yRG9jdW1lbnRUcmVlKGRvYywgY2IpO1xuICAgIHByb2Nlc3NpbmdEb2N1bWVudHMgPSBudWxsO1xuICB9XG4gIGZ1bmN0aW9uIF9mb3JEb2N1bWVudFRyZWUoZG9jLCBjYikge1xuICAgIGRvYyA9IHdyYXAoZG9jKTtcbiAgICBpZiAocHJvY2Vzc2luZ0RvY3VtZW50cy5pbmRleE9mKGRvYykgPj0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBwcm9jZXNzaW5nRG9jdW1lbnRzLnB1c2goZG9jKTtcbiAgICB2YXIgaW1wb3J0cyA9IGRvYy5xdWVyeVNlbGVjdG9yQWxsKFwibGlua1tyZWw9XCIgKyBJTVBPUlRfTElOS19UWVBFICsgXCJdXCIpO1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gaW1wb3J0cy5sZW5ndGgsIG47IGkgPCBsICYmIChuID0gaW1wb3J0c1tpXSk7IGkrKykge1xuICAgICAgaWYgKG4uaW1wb3J0KSB7XG4gICAgICAgIF9mb3JEb2N1bWVudFRyZWUobi5pbXBvcnQsIGNiKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY2IoZG9jKTtcbiAgfVxuICBzY29wZS5mb3JEb2N1bWVudFRyZWUgPSBmb3JEb2N1bWVudFRyZWU7XG4gIHNjb3BlLmZvclN1YnRyZWUgPSBmb3JTdWJ0cmVlO1xufSk7XG5cbkN1c3RvbUVsZW1lbnRzLmFkZE1vZHVsZShmdW5jdGlvbihzY29wZSkge1xuICB2YXIgZmxhZ3MgPSBzY29wZS5mbGFncztcbiAgdmFyIGZvclN1YnRyZWUgPSBzY29wZS5mb3JTdWJ0cmVlO1xuICB2YXIgZm9yRG9jdW1lbnRUcmVlID0gc2NvcGUuZm9yRG9jdW1lbnRUcmVlO1xuICBmdW5jdGlvbiBhZGRlZE5vZGUobm9kZSkge1xuICAgIHJldHVybiBhZGRlZChub2RlKSB8fCBhZGRlZFN1YnRyZWUobm9kZSk7XG4gIH1cbiAgZnVuY3Rpb24gYWRkZWQobm9kZSkge1xuICAgIGlmIChzY29wZS51cGdyYWRlKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgYXR0YWNoZWQobm9kZSk7XG4gIH1cbiAgZnVuY3Rpb24gYWRkZWRTdWJ0cmVlKG5vZGUpIHtcbiAgICBmb3JTdWJ0cmVlKG5vZGUsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIGlmIChhZGRlZChlKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICBmdW5jdGlvbiBhdHRhY2hlZE5vZGUobm9kZSkge1xuICAgIGF0dGFjaGVkKG5vZGUpO1xuICAgIGlmIChpbkRvY3VtZW50KG5vZGUpKSB7XG4gICAgICBmb3JTdWJ0cmVlKG5vZGUsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgYXR0YWNoZWQoZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgdmFyIGhhc1BvbHlmaWxsTXV0YXRpb25zID0gIXdpbmRvdy5NdXRhdGlvbk9ic2VydmVyIHx8IHdpbmRvdy5NdXRhdGlvbk9ic2VydmVyID09PSB3aW5kb3cuSnNNdXRhdGlvbk9ic2VydmVyO1xuICBzY29wZS5oYXNQb2x5ZmlsbE11dGF0aW9ucyA9IGhhc1BvbHlmaWxsTXV0YXRpb25zO1xuICB2YXIgaXNQZW5kaW5nTXV0YXRpb25zID0gZmFsc2U7XG4gIHZhciBwZW5kaW5nTXV0YXRpb25zID0gW107XG4gIGZ1bmN0aW9uIGRlZmVyTXV0YXRpb24oZm4pIHtcbiAgICBwZW5kaW5nTXV0YXRpb25zLnB1c2goZm4pO1xuICAgIGlmICghaXNQZW5kaW5nTXV0YXRpb25zKSB7XG4gICAgICBpc1BlbmRpbmdNdXRhdGlvbnMgPSB0cnVlO1xuICAgICAgc2V0VGltZW91dCh0YWtlTXV0YXRpb25zKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gdGFrZU11dGF0aW9ucygpIHtcbiAgICBpc1BlbmRpbmdNdXRhdGlvbnMgPSBmYWxzZTtcbiAgICB2YXIgJHAgPSBwZW5kaW5nTXV0YXRpb25zO1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gJHAubGVuZ3RoLCBwOyBpIDwgbCAmJiAocCA9ICRwW2ldKTsgaSsrKSB7XG4gICAgICBwKCk7XG4gICAgfVxuICAgIHBlbmRpbmdNdXRhdGlvbnMgPSBbXTtcbiAgfVxuICBmdW5jdGlvbiBhdHRhY2hlZChlbGVtZW50KSB7XG4gICAgaWYgKGhhc1BvbHlmaWxsTXV0YXRpb25zKSB7XG4gICAgICBkZWZlck11dGF0aW9uKGZ1bmN0aW9uKCkge1xuICAgICAgICBfYXR0YWNoZWQoZWxlbWVudCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgX2F0dGFjaGVkKGVsZW1lbnQpO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBfYXR0YWNoZWQoZWxlbWVudCkge1xuICAgIGlmIChlbGVtZW50Ll9fdXBncmFkZWRfXyAmJiAoZWxlbWVudC5hdHRhY2hlZENhbGxiYWNrIHx8IGVsZW1lbnQuZGV0YWNoZWRDYWxsYmFjaykpIHtcbiAgICAgIGlmICghZWxlbWVudC5fX2F0dGFjaGVkICYmIGluRG9jdW1lbnQoZWxlbWVudCkpIHtcbiAgICAgICAgZWxlbWVudC5fX2F0dGFjaGVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKGVsZW1lbnQuYXR0YWNoZWRDYWxsYmFjaykge1xuICAgICAgICAgIGVsZW1lbnQuYXR0YWNoZWRDYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIGRldGFjaGVkTm9kZShub2RlKSB7XG4gICAgZGV0YWNoZWQobm9kZSk7XG4gICAgZm9yU3VidHJlZShub2RlLCBmdW5jdGlvbihlKSB7XG4gICAgICBkZXRhY2hlZChlKTtcbiAgICB9KTtcbiAgfVxuICBmdW5jdGlvbiBkZXRhY2hlZChlbGVtZW50KSB7XG4gICAgaWYgKGhhc1BvbHlmaWxsTXV0YXRpb25zKSB7XG4gICAgICBkZWZlck11dGF0aW9uKGZ1bmN0aW9uKCkge1xuICAgICAgICBfZGV0YWNoZWQoZWxlbWVudCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgX2RldGFjaGVkKGVsZW1lbnQpO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBfZGV0YWNoZWQoZWxlbWVudCkge1xuICAgIGlmIChlbGVtZW50Ll9fdXBncmFkZWRfXyAmJiAoZWxlbWVudC5hdHRhY2hlZENhbGxiYWNrIHx8IGVsZW1lbnQuZGV0YWNoZWRDYWxsYmFjaykpIHtcbiAgICAgIGlmIChlbGVtZW50Ll9fYXR0YWNoZWQgJiYgIWluRG9jdW1lbnQoZWxlbWVudCkpIHtcbiAgICAgICAgZWxlbWVudC5fX2F0dGFjaGVkID0gZmFsc2U7XG4gICAgICAgIGlmIChlbGVtZW50LmRldGFjaGVkQ2FsbGJhY2spIHtcbiAgICAgICAgICBlbGVtZW50LmRldGFjaGVkQ2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBpbkRvY3VtZW50KGVsZW1lbnQpIHtcbiAgICB2YXIgcCA9IGVsZW1lbnQ7XG4gICAgdmFyIGRvYyA9IHdyYXAoZG9jdW1lbnQpO1xuICAgIHdoaWxlIChwKSB7XG4gICAgICBpZiAocCA9PSBkb2MpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBwID0gcC5wYXJlbnROb2RlIHx8IHAubm9kZVR5cGUgPT09IE5vZGUuRE9DVU1FTlRfRlJBR01FTlRfTk9ERSAmJiBwLmhvc3Q7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIHdhdGNoU2hhZG93KG5vZGUpIHtcbiAgICBpZiAobm9kZS5zaGFkb3dSb290ICYmICFub2RlLnNoYWRvd1Jvb3QuX193YXRjaGVkKSB7XG4gICAgICBmbGFncy5kb20gJiYgY29uc29sZS5sb2coXCJ3YXRjaGluZyBzaGFkb3ctcm9vdCBmb3I6IFwiLCBub2RlLmxvY2FsTmFtZSk7XG4gICAgICB2YXIgcm9vdCA9IG5vZGUuc2hhZG93Um9vdDtcbiAgICAgIHdoaWxlIChyb290KSB7XG4gICAgICAgIG9ic2VydmUocm9vdCk7XG4gICAgICAgIHJvb3QgPSByb290Lm9sZGVyU2hhZG93Um9vdDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gaGFuZGxlcihtdXRhdGlvbnMpIHtcbiAgICBpZiAoZmxhZ3MuZG9tKSB7XG4gICAgICB2YXIgbXggPSBtdXRhdGlvbnNbMF07XG4gICAgICBpZiAobXggJiYgbXgudHlwZSA9PT0gXCJjaGlsZExpc3RcIiAmJiBteC5hZGRlZE5vZGVzKSB7XG4gICAgICAgIGlmIChteC5hZGRlZE5vZGVzKSB7XG4gICAgICAgICAgdmFyIGQgPSBteC5hZGRlZE5vZGVzWzBdO1xuICAgICAgICAgIHdoaWxlIChkICYmIGQgIT09IGRvY3VtZW50ICYmICFkLmhvc3QpIHtcbiAgICAgICAgICAgIGQgPSBkLnBhcmVudE5vZGU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciB1ID0gZCAmJiAoZC5VUkwgfHwgZC5fVVJMIHx8IGQuaG9zdCAmJiBkLmhvc3QubG9jYWxOYW1lKSB8fCBcIlwiO1xuICAgICAgICAgIHUgPSB1LnNwbGl0KFwiLz9cIikuc2hpZnQoKS5zcGxpdChcIi9cIikucG9wKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnNvbGUuZ3JvdXAoXCJtdXRhdGlvbnMgKCVkKSBbJXNdXCIsIG11dGF0aW9ucy5sZW5ndGgsIHUgfHwgXCJcIik7XG4gICAgfVxuICAgIG11dGF0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKG14KSB7XG4gICAgICBpZiAobXgudHlwZSA9PT0gXCJjaGlsZExpc3RcIikge1xuICAgICAgICBmb3JFYWNoKG14LmFkZGVkTm9kZXMsIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICBpZiAoIW4ubG9jYWxOYW1lKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGFkZGVkTm9kZShuKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGZvckVhY2gobXgucmVtb3ZlZE5vZGVzLCBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgaWYgKCFuLmxvY2FsTmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkZXRhY2hlZE5vZGUobik7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGZsYWdzLmRvbSAmJiBjb25zb2xlLmdyb3VwRW5kKCk7XG4gIH1cbiAgZnVuY3Rpb24gdGFrZVJlY29yZHMobm9kZSkge1xuICAgIG5vZGUgPSB3cmFwKG5vZGUpO1xuICAgIGlmICghbm9kZSkge1xuICAgICAgbm9kZSA9IHdyYXAoZG9jdW1lbnQpO1xuICAgIH1cbiAgICB3aGlsZSAobm9kZS5wYXJlbnROb2RlKSB7XG4gICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlO1xuICAgIH1cbiAgICB2YXIgb2JzZXJ2ZXIgPSBub2RlLl9fb2JzZXJ2ZXI7XG4gICAgaWYgKG9ic2VydmVyKSB7XG4gICAgICBoYW5kbGVyKG9ic2VydmVyLnRha2VSZWNvcmRzKCkpO1xuICAgICAgdGFrZU11dGF0aW9ucygpO1xuICAgIH1cbiAgfVxuICB2YXIgZm9yRWFjaCA9IEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwuYmluZChBcnJheS5wcm90b3R5cGUuZm9yRWFjaCk7XG4gIGZ1bmN0aW9uIG9ic2VydmUoaW5Sb290KSB7XG4gICAgaWYgKGluUm9vdC5fX29ic2VydmVyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGhhbmRsZXIpO1xuICAgIG9ic2VydmVyLm9ic2VydmUoaW5Sb290LCB7XG4gICAgICBjaGlsZExpc3Q6IHRydWUsXG4gICAgICBzdWJ0cmVlOiB0cnVlXG4gICAgfSk7XG4gICAgaW5Sb290Ll9fb2JzZXJ2ZXIgPSBvYnNlcnZlcjtcbiAgfVxuICBmdW5jdGlvbiB1cGdyYWRlRG9jdW1lbnQoZG9jKSB7XG4gICAgZG9jID0gd3JhcChkb2MpO1xuICAgIGZsYWdzLmRvbSAmJiBjb25zb2xlLmdyb3VwKFwidXBncmFkZURvY3VtZW50OiBcIiwgZG9jLmJhc2VVUkkuc3BsaXQoXCIvXCIpLnBvcCgpKTtcbiAgICBhZGRlZE5vZGUoZG9jKTtcbiAgICBvYnNlcnZlKGRvYyk7XG4gICAgZmxhZ3MuZG9tICYmIGNvbnNvbGUuZ3JvdXBFbmQoKTtcbiAgfVxuICBmdW5jdGlvbiB1cGdyYWRlRG9jdW1lbnRUcmVlKGRvYykge1xuICAgIGZvckRvY3VtZW50VHJlZShkb2MsIHVwZ3JhZGVEb2N1bWVudCk7XG4gIH1cbiAgdmFyIG9yaWdpbmFsQ3JlYXRlU2hhZG93Um9vdCA9IEVsZW1lbnQucHJvdG90eXBlLmNyZWF0ZVNoYWRvd1Jvb3Q7XG4gIGlmIChvcmlnaW5hbENyZWF0ZVNoYWRvd1Jvb3QpIHtcbiAgICBFbGVtZW50LnByb3RvdHlwZS5jcmVhdGVTaGFkb3dSb290ID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcm9vdCA9IG9yaWdpbmFsQ3JlYXRlU2hhZG93Um9vdC5jYWxsKHRoaXMpO1xuICAgICAgQ3VzdG9tRWxlbWVudHMud2F0Y2hTaGFkb3codGhpcyk7XG4gICAgICByZXR1cm4gcm9vdDtcbiAgICB9O1xuICB9XG4gIHNjb3BlLndhdGNoU2hhZG93ID0gd2F0Y2hTaGFkb3c7XG4gIHNjb3BlLnVwZ3JhZGVEb2N1bWVudFRyZWUgPSB1cGdyYWRlRG9jdW1lbnRUcmVlO1xuICBzY29wZS51cGdyYWRlU3VidHJlZSA9IGFkZGVkU3VidHJlZTtcbiAgc2NvcGUudXBncmFkZUFsbCA9IGFkZGVkTm9kZTtcbiAgc2NvcGUuYXR0YWNoZWROb2RlID0gYXR0YWNoZWROb2RlO1xuICBzY29wZS50YWtlUmVjb3JkcyA9IHRha2VSZWNvcmRzO1xufSk7XG5cbkN1c3RvbUVsZW1lbnRzLmFkZE1vZHVsZShmdW5jdGlvbihzY29wZSkge1xuICB2YXIgZmxhZ3MgPSBzY29wZS5mbGFncztcbiAgZnVuY3Rpb24gdXBncmFkZShub2RlKSB7XG4gICAgaWYgKCFub2RlLl9fdXBncmFkZWRfXyAmJiBub2RlLm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xuICAgICAgdmFyIGlzID0gbm9kZS5nZXRBdHRyaWJ1dGUoXCJpc1wiKTtcbiAgICAgIHZhciBkZWZpbml0aW9uID0gc2NvcGUuZ2V0UmVnaXN0ZXJlZERlZmluaXRpb24oaXMgfHwgbm9kZS5sb2NhbE5hbWUpO1xuICAgICAgaWYgKGRlZmluaXRpb24pIHtcbiAgICAgICAgaWYgKGlzICYmIGRlZmluaXRpb24udGFnID09IG5vZGUubG9jYWxOYW1lKSB7XG4gICAgICAgICAgcmV0dXJuIHVwZ3JhZGVXaXRoRGVmaW5pdGlvbihub2RlLCBkZWZpbml0aW9uKTtcbiAgICAgICAgfSBlbHNlIGlmICghaXMgJiYgIWRlZmluaXRpb24uZXh0ZW5kcykge1xuICAgICAgICAgIHJldHVybiB1cGdyYWRlV2l0aERlZmluaXRpb24obm9kZSwgZGVmaW5pdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gdXBncmFkZVdpdGhEZWZpbml0aW9uKGVsZW1lbnQsIGRlZmluaXRpb24pIHtcbiAgICBmbGFncy51cGdyYWRlICYmIGNvbnNvbGUuZ3JvdXAoXCJ1cGdyYWRlOlwiLCBlbGVtZW50LmxvY2FsTmFtZSk7XG4gICAgaWYgKGRlZmluaXRpb24uaXMpIHtcbiAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKFwiaXNcIiwgZGVmaW5pdGlvbi5pcyk7XG4gICAgfVxuICAgIGltcGxlbWVudFByb3RvdHlwZShlbGVtZW50LCBkZWZpbml0aW9uKTtcbiAgICBlbGVtZW50Ll9fdXBncmFkZWRfXyA9IHRydWU7XG4gICAgY3JlYXRlZChlbGVtZW50KTtcbiAgICBzY29wZS5hdHRhY2hlZE5vZGUoZWxlbWVudCk7XG4gICAgc2NvcGUudXBncmFkZVN1YnRyZWUoZWxlbWVudCk7XG4gICAgZmxhZ3MudXBncmFkZSAmJiBjb25zb2xlLmdyb3VwRW5kKCk7XG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH1cbiAgZnVuY3Rpb24gaW1wbGVtZW50UHJvdG90eXBlKGVsZW1lbnQsIGRlZmluaXRpb24pIHtcbiAgICBpZiAoT2JqZWN0Ll9fcHJvdG9fXykge1xuICAgICAgZWxlbWVudC5fX3Byb3RvX18gPSBkZWZpbml0aW9uLnByb3RvdHlwZTtcbiAgICB9IGVsc2Uge1xuICAgICAgY3VzdG9tTWl4aW4oZWxlbWVudCwgZGVmaW5pdGlvbi5wcm90b3R5cGUsIGRlZmluaXRpb24ubmF0aXZlKTtcbiAgICAgIGVsZW1lbnQuX19wcm90b19fID0gZGVmaW5pdGlvbi5wcm90b3R5cGU7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIGN1c3RvbU1peGluKGluVGFyZ2V0LCBpblNyYywgaW5OYXRpdmUpIHtcbiAgICB2YXIgdXNlZCA9IHt9O1xuICAgIHZhciBwID0gaW5TcmM7XG4gICAgd2hpbGUgKHAgIT09IGluTmF0aXZlICYmIHAgIT09IEhUTUxFbGVtZW50LnByb3RvdHlwZSkge1xuICAgICAgdmFyIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhwKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBrOyBrID0ga2V5c1tpXTsgaSsrKSB7XG4gICAgICAgIGlmICghdXNlZFtrXSkge1xuICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShpblRhcmdldCwgaywgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihwLCBrKSk7XG4gICAgICAgICAgdXNlZFtrXSA9IDE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHAgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocCk7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIGNyZWF0ZWQoZWxlbWVudCkge1xuICAgIGlmIChlbGVtZW50LmNyZWF0ZWRDYWxsYmFjaykge1xuICAgICAgZWxlbWVudC5jcmVhdGVkQ2FsbGJhY2soKTtcbiAgICB9XG4gIH1cbiAgc2NvcGUudXBncmFkZSA9IHVwZ3JhZGU7XG4gIHNjb3BlLnVwZ3JhZGVXaXRoRGVmaW5pdGlvbiA9IHVwZ3JhZGVXaXRoRGVmaW5pdGlvbjtcbiAgc2NvcGUuaW1wbGVtZW50UHJvdG90eXBlID0gaW1wbGVtZW50UHJvdG90eXBlO1xufSk7XG5cbkN1c3RvbUVsZW1lbnRzLmFkZE1vZHVsZShmdW5jdGlvbihzY29wZSkge1xuICB2YXIgdXBncmFkZURvY3VtZW50VHJlZSA9IHNjb3BlLnVwZ3JhZGVEb2N1bWVudFRyZWU7XG4gIHZhciB1cGdyYWRlID0gc2NvcGUudXBncmFkZTtcbiAgdmFyIHVwZ3JhZGVXaXRoRGVmaW5pdGlvbiA9IHNjb3BlLnVwZ3JhZGVXaXRoRGVmaW5pdGlvbjtcbiAgdmFyIGltcGxlbWVudFByb3RvdHlwZSA9IHNjb3BlLmltcGxlbWVudFByb3RvdHlwZTtcbiAgdmFyIHVzZU5hdGl2ZSA9IHNjb3BlLnVzZU5hdGl2ZTtcbiAgZnVuY3Rpb24gcmVnaXN0ZXIobmFtZSwgb3B0aW9ucykge1xuICAgIHZhciBkZWZpbml0aW9uID0gb3B0aW9ucyB8fCB7fTtcbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImRvY3VtZW50LnJlZ2lzdGVyRWxlbWVudDogZmlyc3QgYXJndW1lbnQgYG5hbWVgIG11c3Qgbm90IGJlIGVtcHR5XCIpO1xuICAgIH1cbiAgICBpZiAobmFtZS5pbmRleE9mKFwiLVwiKSA8IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImRvY3VtZW50LnJlZ2lzdGVyRWxlbWVudDogZmlyc3QgYXJndW1lbnQgKCduYW1lJykgbXVzdCBjb250YWluIGEgZGFzaCAoJy0nKS4gQXJndW1lbnQgcHJvdmlkZWQgd2FzICdcIiArIFN0cmluZyhuYW1lKSArIFwiJy5cIik7XG4gICAgfVxuICAgIGlmIChpc1Jlc2VydmVkVGFnKG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gZXhlY3V0ZSAncmVnaXN0ZXJFbGVtZW50JyBvbiAnRG9jdW1lbnQnOiBSZWdpc3RyYXRpb24gZmFpbGVkIGZvciB0eXBlICdcIiArIFN0cmluZyhuYW1lKSArIFwiJy4gVGhlIHR5cGUgbmFtZSBpcyBpbnZhbGlkLlwiKTtcbiAgICB9XG4gICAgaWYgKGdldFJlZ2lzdGVyZWREZWZpbml0aW9uKG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEdXBsaWNhdGVEZWZpbml0aW9uRXJyb3I6IGEgdHlwZSB3aXRoIG5hbWUgJ1wiICsgU3RyaW5nKG5hbWUpICsgXCInIGlzIGFscmVhZHkgcmVnaXN0ZXJlZFwiKTtcbiAgICB9XG4gICAgaWYgKCFkZWZpbml0aW9uLnByb3RvdHlwZSkge1xuICAgICAgZGVmaW5pdGlvbi5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEhUTUxFbGVtZW50LnByb3RvdHlwZSk7XG4gICAgfVxuICAgIGRlZmluaXRpb24uX19uYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgIGRlZmluaXRpb24ubGlmZWN5Y2xlID0gZGVmaW5pdGlvbi5saWZlY3ljbGUgfHwge307XG4gICAgZGVmaW5pdGlvbi5hbmNlc3RyeSA9IGFuY2VzdHJ5KGRlZmluaXRpb24uZXh0ZW5kcyk7XG4gICAgcmVzb2x2ZVRhZ05hbWUoZGVmaW5pdGlvbik7XG4gICAgcmVzb2x2ZVByb3RvdHlwZUNoYWluKGRlZmluaXRpb24pO1xuICAgIG92ZXJyaWRlQXR0cmlidXRlQXBpKGRlZmluaXRpb24ucHJvdG90eXBlKTtcbiAgICByZWdpc3RlckRlZmluaXRpb24oZGVmaW5pdGlvbi5fX25hbWUsIGRlZmluaXRpb24pO1xuICAgIGRlZmluaXRpb24uY3RvciA9IGdlbmVyYXRlQ29uc3RydWN0b3IoZGVmaW5pdGlvbik7XG4gICAgZGVmaW5pdGlvbi5jdG9yLnByb3RvdHlwZSA9IGRlZmluaXRpb24ucHJvdG90eXBlO1xuICAgIGRlZmluaXRpb24ucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gZGVmaW5pdGlvbi5jdG9yO1xuICAgIGlmIChzY29wZS5yZWFkeSkge1xuICAgICAgdXBncmFkZURvY3VtZW50VHJlZShkb2N1bWVudCk7XG4gICAgfVxuICAgIHJldHVybiBkZWZpbml0aW9uLmN0b3I7XG4gIH1cbiAgZnVuY3Rpb24gb3ZlcnJpZGVBdHRyaWJ1dGVBcGkocHJvdG90eXBlKSB7XG4gICAgaWYgKHByb3RvdHlwZS5zZXRBdHRyaWJ1dGUuX3BvbHlmaWxsZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHNldEF0dHJpYnV0ZSA9IHByb3RvdHlwZS5zZXRBdHRyaWJ1dGU7XG4gICAgcHJvdG90eXBlLnNldEF0dHJpYnV0ZSA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgICBjaGFuZ2VBdHRyaWJ1dGUuY2FsbCh0aGlzLCBuYW1lLCB2YWx1ZSwgc2V0QXR0cmlidXRlKTtcbiAgICB9O1xuICAgIHZhciByZW1vdmVBdHRyaWJ1dGUgPSBwcm90b3R5cGUucmVtb3ZlQXR0cmlidXRlO1xuICAgIHByb3RvdHlwZS5yZW1vdmVBdHRyaWJ1dGUgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgICBjaGFuZ2VBdHRyaWJ1dGUuY2FsbCh0aGlzLCBuYW1lLCBudWxsLCByZW1vdmVBdHRyaWJ1dGUpO1xuICAgIH07XG4gICAgcHJvdG90eXBlLnNldEF0dHJpYnV0ZS5fcG9seWZpbGxlZCA9IHRydWU7XG4gIH1cbiAgZnVuY3Rpb24gY2hhbmdlQXR0cmlidXRlKG5hbWUsIHZhbHVlLCBvcGVyYXRpb24pIHtcbiAgICBuYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciBvbGRWYWx1ZSA9IHRoaXMuZ2V0QXR0cmlidXRlKG5hbWUpO1xuICAgIG9wZXJhdGlvbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHZhciBuZXdWYWx1ZSA9IHRoaXMuZ2V0QXR0cmlidXRlKG5hbWUpO1xuICAgIGlmICh0aGlzLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayAmJiBuZXdWYWx1ZSAhPT0gb2xkVmFsdWUpIHtcbiAgICAgIHRoaXMuYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrKG5hbWUsIG9sZFZhbHVlLCBuZXdWYWx1ZSk7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIGlzUmVzZXJ2ZWRUYWcobmFtZSkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVzZXJ2ZWRUYWdMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAobmFtZSA9PT0gcmVzZXJ2ZWRUYWdMaXN0W2ldKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICB2YXIgcmVzZXJ2ZWRUYWdMaXN0ID0gWyBcImFubm90YXRpb24teG1sXCIsIFwiY29sb3ItcHJvZmlsZVwiLCBcImZvbnQtZmFjZVwiLCBcImZvbnQtZmFjZS1zcmNcIiwgXCJmb250LWZhY2UtdXJpXCIsIFwiZm9udC1mYWNlLWZvcm1hdFwiLCBcImZvbnQtZmFjZS1uYW1lXCIsIFwibWlzc2luZy1nbHlwaFwiIF07XG4gIGZ1bmN0aW9uIGFuY2VzdHJ5KGV4dG5kcykge1xuICAgIHZhciBleHRlbmRlZSA9IGdldFJlZ2lzdGVyZWREZWZpbml0aW9uKGV4dG5kcyk7XG4gICAgaWYgKGV4dGVuZGVlKSB7XG4gICAgICByZXR1cm4gYW5jZXN0cnkoZXh0ZW5kZWUuZXh0ZW5kcykuY29uY2F0KFsgZXh0ZW5kZWUgXSk7XG4gICAgfVxuICAgIHJldHVybiBbXTtcbiAgfVxuICBmdW5jdGlvbiByZXNvbHZlVGFnTmFtZShkZWZpbml0aW9uKSB7XG4gICAgdmFyIGJhc2VUYWcgPSBkZWZpbml0aW9uLmV4dGVuZHM7XG4gICAgZm9yICh2YXIgaSA9IDAsIGE7IGEgPSBkZWZpbml0aW9uLmFuY2VzdHJ5W2ldOyBpKyspIHtcbiAgICAgIGJhc2VUYWcgPSBhLmlzICYmIGEudGFnO1xuICAgIH1cbiAgICBkZWZpbml0aW9uLnRhZyA9IGJhc2VUYWcgfHwgZGVmaW5pdGlvbi5fX25hbWU7XG4gICAgaWYgKGJhc2VUYWcpIHtcbiAgICAgIGRlZmluaXRpb24uaXMgPSBkZWZpbml0aW9uLl9fbmFtZTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gcmVzb2x2ZVByb3RvdHlwZUNoYWluKGRlZmluaXRpb24pIHtcbiAgICBpZiAoIU9iamVjdC5fX3Byb3RvX18pIHtcbiAgICAgIHZhciBuYXRpdmVQcm90b3R5cGUgPSBIVE1MRWxlbWVudC5wcm90b3R5cGU7XG4gICAgICBpZiAoZGVmaW5pdGlvbi5pcykge1xuICAgICAgICB2YXIgaW5zdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoZGVmaW5pdGlvbi50YWcpO1xuICAgICAgICB2YXIgZXhwZWN0ZWRQcm90b3R5cGUgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoaW5zdCk7XG4gICAgICAgIGlmIChleHBlY3RlZFByb3RvdHlwZSA9PT0gZGVmaW5pdGlvbi5wcm90b3R5cGUpIHtcbiAgICAgICAgICBuYXRpdmVQcm90b3R5cGUgPSBleHBlY3RlZFByb3RvdHlwZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdmFyIHByb3RvID0gZGVmaW5pdGlvbi5wcm90b3R5cGUsIGFuY2VzdG9yO1xuICAgICAgd2hpbGUgKHByb3RvICYmIHByb3RvICE9PSBuYXRpdmVQcm90b3R5cGUpIHtcbiAgICAgICAgYW5jZXN0b3IgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocHJvdG8pO1xuICAgICAgICBwcm90by5fX3Byb3RvX18gPSBhbmNlc3RvcjtcbiAgICAgICAgcHJvdG8gPSBhbmNlc3RvcjtcbiAgICAgIH1cbiAgICAgIGRlZmluaXRpb24ubmF0aXZlID0gbmF0aXZlUHJvdG90eXBlO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBpbnN0YW50aWF0ZShkZWZpbml0aW9uKSB7XG4gICAgcmV0dXJuIHVwZ3JhZGVXaXRoRGVmaW5pdGlvbihkb21DcmVhdGVFbGVtZW50KGRlZmluaXRpb24udGFnKSwgZGVmaW5pdGlvbik7XG4gIH1cbiAgdmFyIHJlZ2lzdHJ5ID0ge307XG4gIGZ1bmN0aW9uIGdldFJlZ2lzdGVyZWREZWZpbml0aW9uKG5hbWUpIHtcbiAgICBpZiAobmFtZSkge1xuICAgICAgcmV0dXJuIHJlZ2lzdHJ5W25hbWUudG9Mb3dlckNhc2UoKV07XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIHJlZ2lzdGVyRGVmaW5pdGlvbihuYW1lLCBkZWZpbml0aW9uKSB7XG4gICAgcmVnaXN0cnlbbmFtZV0gPSBkZWZpbml0aW9uO1xuICB9XG4gIGZ1bmN0aW9uIGdlbmVyYXRlQ29uc3RydWN0b3IoZGVmaW5pdGlvbikge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBpbnN0YW50aWF0ZShkZWZpbml0aW9uKTtcbiAgICB9O1xuICB9XG4gIHZhciBIVE1MX05BTUVTUEFDRSA9IFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbFwiO1xuICBmdW5jdGlvbiBjcmVhdGVFbGVtZW50TlMobmFtZXNwYWNlLCB0YWcsIHR5cGVFeHRlbnNpb24pIHtcbiAgICBpZiAobmFtZXNwYWNlID09PSBIVE1MX05BTUVTUEFDRSkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVsZW1lbnQodGFnLCB0eXBlRXh0ZW5zaW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGRvbUNyZWF0ZUVsZW1lbnROUyhuYW1lc3BhY2UsIHRhZyk7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQodGFnLCB0eXBlRXh0ZW5zaW9uKSB7XG4gICAgdmFyIGRlZmluaXRpb24gPSBnZXRSZWdpc3RlcmVkRGVmaW5pdGlvbih0eXBlRXh0ZW5zaW9uIHx8IHRhZyk7XG4gICAgaWYgKGRlZmluaXRpb24pIHtcbiAgICAgIGlmICh0YWcgPT0gZGVmaW5pdGlvbi50YWcgJiYgdHlwZUV4dGVuc2lvbiA9PSBkZWZpbml0aW9uLmlzKSB7XG4gICAgICAgIHJldHVybiBuZXcgZGVmaW5pdGlvbi5jdG9yKCk7XG4gICAgICB9XG4gICAgICBpZiAoIXR5cGVFeHRlbnNpb24gJiYgIWRlZmluaXRpb24uaXMpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBkZWZpbml0aW9uLmN0b3IoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGVsZW1lbnQ7XG4gICAgaWYgKHR5cGVFeHRlbnNpb24pIHtcbiAgICAgIGVsZW1lbnQgPSBjcmVhdGVFbGVtZW50KHRhZyk7XG4gICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShcImlzXCIsIHR5cGVFeHRlbnNpb24pO1xuICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgfVxuICAgIGVsZW1lbnQgPSBkb21DcmVhdGVFbGVtZW50KHRhZyk7XG4gICAgaWYgKHRhZy5pbmRleE9mKFwiLVwiKSA+PSAwKSB7XG4gICAgICBpbXBsZW1lbnRQcm90b3R5cGUoZWxlbWVudCwgSFRNTEVsZW1lbnQpO1xuICAgIH1cbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfVxuICBmdW5jdGlvbiBjbG9uZU5vZGUoZGVlcCkge1xuICAgIHZhciBuID0gZG9tQ2xvbmVOb2RlLmNhbGwodGhpcywgZGVlcCk7XG4gICAgdXBncmFkZShuKTtcbiAgICByZXR1cm4gbjtcbiAgfVxuICB2YXIgZG9tQ3JlYXRlRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQuYmluZChkb2N1bWVudCk7XG4gIHZhciBkb21DcmVhdGVFbGVtZW50TlMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMuYmluZChkb2N1bWVudCk7XG4gIHZhciBkb21DbG9uZU5vZGUgPSBOb2RlLnByb3RvdHlwZS5jbG9uZU5vZGU7XG4gIHZhciBpc0luc3RhbmNlO1xuICBpZiAoIU9iamVjdC5fX3Byb3RvX18gJiYgIXVzZU5hdGl2ZSkge1xuICAgIGlzSW5zdGFuY2UgPSBmdW5jdGlvbihvYmosIGN0b3IpIHtcbiAgICAgIHZhciBwID0gb2JqO1xuICAgICAgd2hpbGUgKHApIHtcbiAgICAgICAgaWYgKHAgPT09IGN0b3IucHJvdG90eXBlKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcCA9IHAuX19wcm90b19fO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgaXNJbnN0YW5jZSA9IGZ1bmN0aW9uKG9iaiwgYmFzZSkge1xuICAgICAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIGJhc2U7XG4gICAgfTtcbiAgfVxuICBkb2N1bWVudC5yZWdpc3RlckVsZW1lbnQgPSByZWdpc3RlcjtcbiAgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCA9IGNyZWF0ZUVsZW1lbnQ7XG4gIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyA9IGNyZWF0ZUVsZW1lbnROUztcbiAgTm9kZS5wcm90b3R5cGUuY2xvbmVOb2RlID0gY2xvbmVOb2RlO1xuICBzY29wZS5yZWdpc3RyeSA9IHJlZ2lzdHJ5O1xuICBzY29wZS5pbnN0YW5jZW9mID0gaXNJbnN0YW5jZTtcbiAgc2NvcGUucmVzZXJ2ZWRUYWdMaXN0ID0gcmVzZXJ2ZWRUYWdMaXN0O1xuICBzY29wZS5nZXRSZWdpc3RlcmVkRGVmaW5pdGlvbiA9IGdldFJlZ2lzdGVyZWREZWZpbml0aW9uO1xuICBkb2N1bWVudC5yZWdpc3RlciA9IGRvY3VtZW50LnJlZ2lzdGVyRWxlbWVudDtcbn0pO1xuXG4oZnVuY3Rpb24oc2NvcGUpIHtcbiAgdmFyIHVzZU5hdGl2ZSA9IHNjb3BlLnVzZU5hdGl2ZTtcbiAgdmFyIGluaXRpYWxpemVNb2R1bGVzID0gc2NvcGUuaW5pdGlhbGl6ZU1vZHVsZXM7XG4gIHZhciBpc0lFMTFPck9sZGVyID0gL1RyaWRlbnQvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCk7XG4gIGlmIChpc0lFMTFPck9sZGVyKSB7XG4gICAgKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGltcG9ydE5vZGUgPSBkb2N1bWVudC5pbXBvcnROb2RlO1xuICAgICAgZG9jdW1lbnQuaW1wb3J0Tm9kZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbiA9IGltcG9ydE5vZGUuYXBwbHkoZG9jdW1lbnQsIGFyZ3VtZW50cyk7XG4gICAgICAgIGlmIChuLm5vZGVUeXBlID09IG4uRE9DVU1FTlRfRlJBR01FTlRfTk9ERSkge1xuICAgICAgICAgIHZhciBmID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICAgIGYuYXBwZW5kQ2hpbGQobik7XG4gICAgICAgICAgcmV0dXJuIGY7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIG47XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSkoKTtcbiAgfVxuICBpZiAodXNlTmF0aXZlKSB7XG4gICAgdmFyIG5vcCA9IGZ1bmN0aW9uKCkge307XG4gICAgc2NvcGUud2F0Y2hTaGFkb3cgPSBub3A7XG4gICAgc2NvcGUudXBncmFkZSA9IG5vcDtcbiAgICBzY29wZS51cGdyYWRlQWxsID0gbm9wO1xuICAgIHNjb3BlLnVwZ3JhZGVEb2N1bWVudFRyZWUgPSBub3A7XG4gICAgc2NvcGUudXBncmFkZVN1YnRyZWUgPSBub3A7XG4gICAgc2NvcGUudGFrZVJlY29yZHMgPSBub3A7XG4gICAgc2NvcGUuaW5zdGFuY2VvZiA9IGZ1bmN0aW9uKG9iaiwgYmFzZSkge1xuICAgICAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIGJhc2U7XG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICBpbml0aWFsaXplTW9kdWxlcygpO1xuICB9XG4gIHZhciB1cGdyYWRlRG9jdW1lbnRUcmVlID0gc2NvcGUudXBncmFkZURvY3VtZW50VHJlZTtcbiAgaWYgKCF3aW5kb3cud3JhcCkge1xuICAgIGlmICh3aW5kb3cuU2hhZG93RE9NUG9seWZpbGwpIHtcbiAgICAgIHdpbmRvdy53cmFwID0gU2hhZG93RE9NUG9seWZpbGwud3JhcElmTmVlZGVkO1xuICAgICAgd2luZG93LnVud3JhcCA9IFNoYWRvd0RPTVBvbHlmaWxsLnVud3JhcElmTmVlZGVkO1xuICAgIH0gZWxzZSB7XG4gICAgICB3aW5kb3cud3JhcCA9IHdpbmRvdy51bndyYXAgPSBmdW5jdGlvbihub2RlKSB7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgICAgfTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gYm9vdHN0cmFwKCkge1xuICAgIHVwZ3JhZGVEb2N1bWVudFRyZWUod3JhcChkb2N1bWVudCkpO1xuICAgIGlmICh3aW5kb3cuSFRNTEltcG9ydHMpIHtcbiAgICAgIEhUTUxJbXBvcnRzLl9faW1wb3J0c1BhcnNpbmdIb29rID0gZnVuY3Rpb24oZWx0KSB7XG4gICAgICAgIHVwZ3JhZGVEb2N1bWVudFRyZWUod3JhcChlbHQuaW1wb3J0KSk7XG4gICAgICB9O1xuICAgIH1cbiAgICBDdXN0b21FbGVtZW50cy5yZWFkeSA9IHRydWU7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIEN1c3RvbUVsZW1lbnRzLnJlYWR5VGltZSA9IERhdGUubm93KCk7XG4gICAgICBpZiAod2luZG93LkhUTUxJbXBvcnRzKSB7XG4gICAgICAgIEN1c3RvbUVsZW1lbnRzLmVsYXBzZWQgPSBDdXN0b21FbGVtZW50cy5yZWFkeVRpbWUgLSBIVE1MSW1wb3J0cy5yZWFkeVRpbWU7XG4gICAgICB9XG4gICAgICBkb2N1bWVudC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudChcIldlYkNvbXBvbmVudHNSZWFkeVwiLCB7XG4gICAgICAgIGJ1YmJsZXM6IHRydWVcbiAgICAgIH0pKTtcbiAgICB9KTtcbiAgfVxuICBpZiAoaXNJRTExT3JPbGRlciAmJiB0eXBlb2Ygd2luZG93LkN1c3RvbUV2ZW50ICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB3aW5kb3cuQ3VzdG9tRXZlbnQgPSBmdW5jdGlvbihpblR5cGUsIHBhcmFtcykge1xuICAgICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xuICAgICAgdmFyIGUgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIkN1c3RvbUV2ZW50XCIpO1xuICAgICAgZS5pbml0Q3VzdG9tRXZlbnQoaW5UeXBlLCBCb29sZWFuKHBhcmFtcy5idWJibGVzKSwgQm9vbGVhbihwYXJhbXMuY2FuY2VsYWJsZSksIHBhcmFtcy5kZXRhaWwpO1xuICAgICAgcmV0dXJuIGU7XG4gICAgfTtcbiAgICB3aW5kb3cuQ3VzdG9tRXZlbnQucHJvdG90eXBlID0gd2luZG93LkV2ZW50LnByb3RvdHlwZTtcbiAgfVxuICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gXCJjb21wbGV0ZVwiIHx8IHNjb3BlLmZsYWdzLmVhZ2VyKSB7XG4gICAgYm9vdHN0cmFwKCk7XG4gIH0gZWxzZSBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gXCJpbnRlcmFjdGl2ZVwiICYmICF3aW5kb3cuYXR0YWNoRXZlbnQgJiYgKCF3aW5kb3cuSFRNTEltcG9ydHMgfHwgd2luZG93LkhUTUxJbXBvcnRzLnJlYWR5KSkge1xuICAgIGJvb3RzdHJhcCgpO1xuICB9IGVsc2Uge1xuICAgIHZhciBsb2FkRXZlbnQgPSB3aW5kb3cuSFRNTEltcG9ydHMgJiYgIUhUTUxJbXBvcnRzLnJlYWR5ID8gXCJIVE1MSW1wb3J0c0xvYWRlZFwiIDogXCJET01Db250ZW50TG9hZGVkXCI7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIobG9hZEV2ZW50LCBib290c3RyYXApO1xuICB9XG59KSh3aW5kb3cuQ3VzdG9tRWxlbWVudHMpO1xuXG5pZiAodHlwZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgKGZ1bmN0aW9uKCkge1xuICAgIHZhciBURU1QTEFURV9UQUcgPSBcInRlbXBsYXRlXCI7XG4gICAgSFRNTFRlbXBsYXRlRWxlbWVudCA9IGZ1bmN0aW9uKCkge307XG4gICAgSFRNTFRlbXBsYXRlRWxlbWVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEhUTUxFbGVtZW50LnByb3RvdHlwZSk7XG4gICAgSFRNTFRlbXBsYXRlRWxlbWVudC5kZWNvcmF0ZSA9IGZ1bmN0aW9uKHRlbXBsYXRlKSB7XG4gICAgICBpZiAoIXRlbXBsYXRlLmNvbnRlbnQpIHtcbiAgICAgICAgdGVtcGxhdGUuY29udGVudCA9IHRlbXBsYXRlLm93bmVyRG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICB2YXIgY2hpbGQ7XG4gICAgICAgIHdoaWxlIChjaGlsZCA9IHRlbXBsYXRlLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICB0ZW1wbGF0ZS5jb250ZW50LmFwcGVuZENoaWxkKGNoaWxkKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgSFRNTFRlbXBsYXRlRWxlbWVudC5ib290c3RyYXAgPSBmdW5jdGlvbihkb2MpIHtcbiAgICAgIHZhciB0ZW1wbGF0ZXMgPSBkb2MucXVlcnlTZWxlY3RvckFsbChURU1QTEFURV9UQUcpO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0ZW1wbGF0ZXMubGVuZ3RoLCB0OyBpIDwgbCAmJiAodCA9IHRlbXBsYXRlc1tpXSk7IGkrKykge1xuICAgICAgICBIVE1MVGVtcGxhdGVFbGVtZW50LmRlY29yYXRlKHQpO1xuICAgICAgfVxuICAgIH07XG4gICAgYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICBIVE1MVGVtcGxhdGVFbGVtZW50LmJvb3RzdHJhcChkb2N1bWVudCk7XG4gICAgfSk7XG4gIH0pKCk7XG59XG5cbihmdW5jdGlvbihzY29wZSkge1xuICB2YXIgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3R5bGVcIik7XG4gIHN0eWxlLnRleHRDb250ZW50ID0gXCJcIiArIFwiYm9keSB7XCIgKyBcInRyYW5zaXRpb246IG9wYWNpdHkgZWFzZS1pbiAwLjJzO1wiICsgXCIgfSBcXG5cIiArIFwiYm9keVt1bnJlc29sdmVkXSB7XCIgKyBcIm9wYWNpdHk6IDA7IGRpc3BsYXk6IGJsb2NrOyBvdmVyZmxvdzogaGlkZGVuOyBwb3NpdGlvbjogcmVsYXRpdmU7XCIgKyBcIiB9IFxcblwiO1xuICB2YXIgaGVhZCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJoZWFkXCIpO1xuICBoZWFkLmluc2VydEJlZm9yZShzdHlsZSwgaGVhZC5maXJzdENoaWxkKTtcbn0pKHdpbmRvdy5XZWJDb21wb25lbnRzKTsiXX0=
