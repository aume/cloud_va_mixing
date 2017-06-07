/*
** an asyncronous loader and audio decoder and file splitter
**
*/

// @param: {"filename":{'segments':{'id':Segment, 'id':Segment}}}
// callback is a function implemented to handle returns
// @returns: // Segment is given property of audiobuffer

function loadsplit(data, callback) {
	// body...
	let url = Object.keys(data)[0] ;
	let request = new XMLHttpRequest();
	request.open('GET', url, true);
	request.responseType = 'arraybuffer';
	request.send();

	request.onload = function() {
		var audioData = request.response;
		audioCtx.decodeAudioData(audioData, function(buffer) {
			for(let id in data[url]) {
				let start = data[url][id].start ;
				let dur = data[url][id].dur ;
				AudioBufferSlice(buffer, start, start+dur, function(e, buf){
                    data[url][id].audiobuffer = buf ;
	            }) // end slicer  
			}
			callback(data[url]) ; // all done
		}) // end decode
	} // end onload
  

  // function harvested from https://www.pincer.io/npm/libraries/audiobuffer-slice
  function AudioBufferSlice(buffer, begin, end) {
        let audioContext = audioCtx ;
        if (!(this instanceof AudioBufferSlice)) {
            return new AudioBufferSlice(buffer, begin, end, callback);
        }

        var error = null;

        var duration = buffer.duration;
        var channels = buffer.numberOfChannels;
        var rate = buffer.sampleRate;

        if (typeof end === 'function') {
            callback = end;
            end = duration;
        }

        //  seconds
        begin = begin;
        end = end;

        if (begin < 0) {
            error = new RangeError('begin time must be greater than 0');
        }

        if (end > duration) {
            error = new RangeError('end time must be less than or equal to ' + duration);
        }

        if (typeof callback !== 'function') {
            error = new TypeError('callback must be a function');
        }

        var startOffset = rate * begin;
        var endOffset = rate * end;
        var frameCount = endOffset - startOffset;
        var newArrayBuffer;

        try {
            newArrayBuffer = audioContext.createBuffer(channels, endOffset - startOffset, rate);
            var anotherArray = new Float32Array(frameCount);
            var offset = 0;

            for (var channel = 0; channel < channels; channel++) {
              buffer.copyFromChannel(anotherArray, channel, startOffset);
              newArrayBuffer.copyToChannel(anotherArray, channel, offset);
            }
        } catch(e) {
            error = e;
        }
        //return newArrayBuffer ;
        callback(error, newArrayBuffer);
    }
}

