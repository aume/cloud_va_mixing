

function AudioTrack(input) {
  // eq params adjusted with e.g.
  // lowshelf.gain.value = 0.6; (-40,40)
  // lowshelf.frequency.value = 300;

  let windowSize = 1024 ;

  this.myInput = input ;

  this.lowshelf = audioCtx.createBiquadFilter();
  this.mid = audioCtx.createBiquadFilter();
  this.highshelf = audioCtx.createBiquadFilter();

  // for loking at va and oscilloscape metering
  this.analyser = audioCtx.createAnalyser() ;
  this.analyser.fftSize = windowSize;
  this.analyser.bufferLength = this.analyser.frequencyBinCount;
  this.analyser.dataArray = new Uint8Array(this.analyser.bufferLength);
  this.processor = audioCtx.createScriptProcessor(windowSize, 1, 1) ;
  //this.processor.connect(audioCtx.destination);
  this.analyser.connect(this.processor) ;

  // analyze and keep track of VA
  // window size and seconds
  this.extractor = new Extractor(windowSize, 4) ; // extractor.js used in script processor to predict VA
  this.valence = 0 ;
  this.arousal = 0 ;

  this.extractorLock = false ;
  
  this.buffer = []
  //this.mixBuffer = new Float32Array(44100*4) ; // 4 second fifo buffer for VA prediction
  this.checkVA() ; // timed function

  //
  // audio processor function
  //
  this.processor.onaudioprocess = function(audioProcessingEvent) {
      if(!this.extractorLock) {
        var inputBuffer = audioProcessingEvent.inputBuffer;
        var samples = inputBuffer.getChannelData(0);
        this.extractor.extractFeatures(samples) ;
      }
  }.bind(this)

  

  //set the filter types (you could set all to 5, for a different result, feel free to experiment)
  this.lowshelf.type = "lowshelf";
  this.mid.type = "peaking";
  this.highshelf.type = "highshelf";

  this.lowshelf.frequency.value = 200 ;
  this.lowshelf.frequency.name = 'low-f' ;
  this.lowshelf.gain.name = 'low-g' ;
  this.lowshelf.frequency.minValue_ = 20 ;
  this.lowshelf.frequency.maxValue_ = 1000 ;
  this.lowshelf.gain.minValue_ = -20 ;
  this.lowshelf.gain.maxValue_ = 20 ;

  this.mid.frequency.value = 2000 ;
  this.mid.frequency.name = 'mid-f' ;
  this.mid.gain.name = 'mid-g' ;
  this.mid.frequency.minValue_ = 100 ;
  this.mid.frequency.maxValue_ = 10000 ;
  this.mid.gain.minValue_ = -20 ;
  this.mid.gain.maxValue_ = 20 ;

  this.highshelf.value = 10000 ;
  this.highshelf.frequency.name = 'high-f' ;
  this.highshelf.gain.name = 'high-g' ;
  this.highshelf.frequency.minValue_ = 5000 ;
  this.highshelf.frequency.maxValue_ = 15000 ;
  this.highshelf.gain.minValue_ = -20 ;
  this.highshelf.gain.maxValue_ = 20 ;

  // this.lowshelf.gain.value = -1000 ;
  // this.mid.gain.value = -1000 ;
  // this.highshelf.gain.value = 1000 ;

  //connect 'em in order
  this.myInput.connect(this.lowshelf);
  this.lowshelf.connect(this.mid);
  this.mid.connect(this.highshelf);
  this.output = this.highshelf ;

  this.output.connect(this.analyser) ;
  //this.highshelf.connect(audioCtx.destination);

  // the eq pid controllers
  // this.lowGainPD = new PID() ;
  // this.lowFreqPD = new PID() ;
  // this.midGainPD = new PID() ;
  // this.midFreqPD = new PID() ;
  // this.highGainPD = new PID() ;
  // this.highFreqPD = new PID() ;
}

// do check va repededly
AudioTrack.prototype.checkVA = function() {
  let va = this.extractor.getValenceArousal() ;
  this.valence = va.valence ;
  this.arousal = va.arousal ;
  let that = this ;
  setTimeout(function(){that.checkVA()}, 100) ;
};

// release everything
AudioTrack.prototype.releaseAll = function() {
  this.myInput.stop();
  this.myInput.disconnect();
  this.myInput = null ;
  this.lowshelf.disconnect();
  this.lowshelf = null ;
  this.mid.disconnect();
  this.mid = null ;
  this.highshelf.disconnect();
  this.highshelf = null ;
};

AudioTrack.prototype.update = function(value) {
  // update the eq pid controllers and 
  // set new eq values
  // this.lowshelf.gain.value = this.lowGainPD.update() ;
  // this.lowshelf.frequency.value = this.lowFreqPD.update() ;
  // this.mid.gain.value = this.midGainPD.update();
  // this.mid.frequency.value = this.midFreqPD.update() ;
  // this.highshelf.gain.value = this.highGainPD.update() ;
  // this.highshelf.frequency.value = this.highFreqPD.update() ;
};

// stop and release the node
// then create and connect 
AudioTrack.prototype.swapBuffer = function(buffer) {
  //this.myInput.stop() ;
  this.extractorLock = true ;
  this.myInput.disconnect() ;
  this.myInput = null ;
  this.myInput = audioCtx.createBufferSource() ;
  this.myInput.buffer = buffer;
  this.myInput.connect(this.lowshelf) ;
  this.myInput.start() ;
  this.extractorLock = false ;
};