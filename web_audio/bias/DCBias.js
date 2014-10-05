(function() {
	
	function DCBias(context) {
		
		var output = context.createGain();
		var bufferSource = context.createBufferSource();
		var buffer = context.createBuffer(1, 1, context.sampleRate);

		buffer.getChannelData(0)[0] = 1.0;
		bufferSource.buffer = buffer;
		bufferSource.loop = true;
		
		bufferSource.connect(output);
		bufferSource.start(0);
		
		return output;
		
	}

	//
	
	if(typeof module !== 'undefined' && module.exports) {
		module.exports = DCBias;
	} else {
		this.DCBias = DCBias;
	}

}).call(this);
