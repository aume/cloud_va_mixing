/*
**
**
** controlmix.js
** implements PD controller for va audio mixing a roughmix
**
**
*/

// @param - tracks, semgment pool, va envelopes


function FIFO(array, samples) {
    if(samples.length>array.length) return;
    let t = array.subarray(0, array.length-samples.length) ;
    array.set(t, samples.length) ;
    array.set(samples) ;
}

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

function ControlMix(tracks) {

    this.audioTracks = tracks; 

  

    // we want to check the valence and arousal of the mix from time to time
    this.mixValence = 0 ;
    this.mixArousal = 0 ;
    this.extractor = new Extractor(1024) ; // extractor.js used in script processor to predict VA
    this.mixBuffer = new Float32Array(44100*2) ; // 2 second fifo buffer for VA prediction
    this.checkVA() ; // timed function
    // update with FIFO(this.mixBuffer, samples)

    this.merger = audioCtx.createChannelMerger(this.audioTracks.length) ; // assume stereo for each track
    this.processor = audioCtx.createScriptProcessor(1024, 1, 1) ;

    this.merger.connect(this.processor) ;
    this.merger.connect(audioCtx.destination) ;

    //
    // audio processor function
    //
    this.processor.onaudioprocess = function(audioProcessingEvent) {
        var inputBuffer = audioProcessingEvent.inputBuffer;
        var samples = inputBuffer.getChannelData(0);
        // get the average, bincount is fftsize / 2
        FIFO(this.mixBuffer, samples)
        // let array =  new Uint8Array(this.analyser.frequencyBinCount);
        // this.analyser.getByteFrequencyData(array);
        //let average = getAverageVolume(array)
    }.bind(this)

    //
    //
    // add a web audio track to each track
    let channelCount = 0 ;
    this.audioTracks.forEach(function(track){
      track.audioTrack = new AudioTrack() ;
      createSliders(track.audioTrack) ;

      track.audioTrack.output.connect(this.merger,0, channelCount) ;
      channelCount+=1 ;
    }.bind(this)) ;

    //
    // generate the sliders for eqs
    //
    function createSliders(t) {
      console.log(t)
      let pArray = [t.lowshelf.frequency, 
                    t.mid.frequency, 
                    t.highshelf.frequency] ;
      let sliderArray = [] ;
      let mixer = document.createElement('div');
      pArray.forEach(function(obj){
        console.log(obj)
        let sliderbox = document.createElement('div');
        sliderbox.className = 'sliderbox' ;
        let sliderText = document.createElement('em') ;
        let fslider = document.createElement('input');
        sliderText.innerHTML = guid() ;
        
        fslider.type = 'range';
        fslider.setAttribute('orient','vertical');
        obj.minValue = 0 ;
        fslider.min  = 0;//obj.minValue;
        fslider.max  = obj.maxValue;
        fslider.value = obj.value;
        fslider.step= 0.1;
        (function(obj){
          fslider.addEventListener("change", function() {
               obj.value = this.value ;
               sliderText.innerHTML = this.value ;
               console.log(t, obj, obj.value) ;
            }, false);
        })(obj) ;
        obj.slider = fslider ;
        sliderbox.appendChild(fslider);
        sliderbox.appendChild(sliderText) ;
        mixer.appendChild(sliderbox) ;
        
      });
      document.body.appendChild(mixer); 
    }

    // get the scheduler ready

    this.sched = new WebAudioScheduler({ context: audioCtx });
    //this.sched.start(this.scheduleMix, {parent: this});  

    this.sched.on("start", () => {
      console.log('started scheduler') ;
      //this.audioTracks.forEach(function(obj){obj.connectAll()}) ;
    });

    this.sched.on("stop", () => {
      console.log('scheduler stoped')
      //this.audioTracks.forEach(function(obj){obj.releaseAll()}) ;
    });

}

// do check va repededly
ControlMix.prototype.checkVA = function() {
  let features = this.extractor.extractFeatures(this.mixBuffer) ;
  this.mixValence = this.extractor.valence(features) ;
  this.mixArousal = this.extractor.arousal(features) ;
  console.log('mixValence', this.mixValence, 'mixArousal', this.mixArousal, 'features', features)
  let that = this ;
  setTimeout(function(){that.checkVA()}, 1000) ;
};

ControlMix.prototype.start = function() {
  this.sched.start(this.scheduleMix, {parent: this});  
};

ControlMix.prototype.stop = function() {
  this.sched.stop();  
};


ControlMix.prototype.scheduleMix = function(e) {
  let t0 = e.playbackTime;
  let parent = e.args.parent ;
  // schedule a clip to be played on a track
  parent.audioTracks.forEach(function(track){
    track.clips.forEach(function(clip){
      let seg = clip.segment ;
      console.log(clip) ;
      parent.sched.insert(t0 + clip.offset, parent.scheduleClip, { buffer: seg.audiobuffer, duration: seg.dur, track:track.audioTrack });
    }.bind(parent)) ;
  }.bind(parent)) ;
}


//
//
// Scheduler stuff
//
//
ControlMix.prototype.scheduleClip = function(e) {
  let t0 = e.playbackTime;
  let t1 = t0 + e.args.duration;
  e.args.track.swapBuffer(e.args.buffer) ;
  //console.log("scheduleClip", e) ;

  // let source = audioCtx.createBufferSource() ;
  // source.connect(audioCtx.destination) ;
  // source.buffer = e.args.buffer ;
  // source.start() ;

  //this.sched.nextTick(t1, () => {
    // on complete do something or not
  //});
}





function AudioTrack() {
  // eq params adjusted with e.g.
  // lowshelf.gain.value = 0.6; (-40,40)
  // lowshelf.frequency.value = 300;
  this.myInput = audioCtx.createBufferSource() ;
  this.lowshelf = audioCtx.createBiquadFilter();
  this.mid = audioCtx.createBiquadFilter();
  this.highshelf = audioCtx.createBiquadFilter();

  //set the filter types (you could set all to 5, for a different result, feel free to experiment)
  this.lowshelf.type = 3;
  this.mid.type = 5;
  this.highshelf.type = 4;

  //
  this.lowshelf.frequency.value = 200 ;
  this.mid.frequency.value = 2000 ;
  this.highshelf.value = 10000 ;

  // this.lowshelf.gain.value = -1000 ;
  // this.mid.gain.value = -1000 ;
  // this.highshelf.gain.value = 1000 ;

  //connect 'em in order
  this.myInput.connect(this.lowshelf);
  this.lowshelf.connect(this.mid);
  this.mid.connect(this.highshelf);
  this.output = this.highshelf ;
  //this.highshelf.connect(audioCtx.destination);

  // the eq pid controllers
  // this.lowGainPD = new PID() ;
  // this.lowFreqPD = new PID() ;
  // this.midGainPD = new PID() ;
  // this.midFreqPD = new PID() ;
  // this.highGainPD = new PID() ;
  // this.highFreqPD = new PID() ;
}



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
  this.myInput.disconnect() ;
  this.myInput = null ;
  this.myInput = audioCtx.createBufferSource() ;
  this.myInput.buffer = buffer;
  this.myInput.connect(this.lowshelf) ;
  this.myInput.start() ;
};

