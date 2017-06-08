/*
** an asyncronous loader and audio decoder and file splitter
**
*/

// @param: url - audio file 
// data - {'id':Segment, 'id':Segment}}
// callback - a function implemented to handle returns
// @returns: // Segment is given property of audiobuffer

function loadsplit(url, data, callback) {
	// body...
	
	let request = new XMLHttpRequest();
	request.open('GET', url, true);
	request.responseType = 'arraybuffer';
	console.log('url', url, 'data', data)
	//console.log('url', url, 'data', data) ;

	request.onreadystatechange = function(){
    //alert(request.readyState + " " + request.status);
    if (request.readyState ==4 && request.status == 200)
          console.log('loading');
    };

	request.onload = function() {
		var audioData = request.response;
		console.log('audioData', audioData)
		audioCtx.decodeAudioData(audioData).then(function(buffer) {
            console.log('decoding');
			for(let id in data) {
				let start = data[id].start ;
				let dur = data[id].dur ;
				AudioBufferSlice(buffer, start, start+dur, function(e, buf){
                    data[id].audiobuffer = buf ;
	            }) // end slicer  
			}

			callback(data) ; // all done
		}).catch(function(err) {
          console.log('decodeAudioData failed: ' + err );
        }); // end decode
	} // end onload
  	request.send();
}

// function harvested from https://www.pincer.io/npm/libraries/audiobuffer-slice
  function AudioBufferSlice(buffer, begin, end, callback) {
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

