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
    array.set(samples, 0) ;
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
      let pArray = [t.lowshelf.frequency, t.lowshelf.gain,
                    t.mid.frequency, t.mid.gain,
                    t.highshelf.frequency, t.highshelf.gain] ;

      let sliderArray = [] ;
      let mixer = document.createElement('div');
      pArray.forEach(function(obj){
        console.log(obj)
        let sliderbox = document.createElement('div');
        sliderbox.className = 'sliderbox' ;

        let sliderText = document.createElement('em') ;
        sliderText.innerHTML = obj.name ;
        sliderText.className = 'slidertext' ;

        let fslider = document.createElement('input');
        fslider.className = 'slider' ;

        fslider.type = 'range';
        fslider.setAttribute('orient','vertical');
        //obj.minValue = 0 ;
        fslider.min  = obj.minValue_;
        fslider.max  = obj.maxValue_;
        fslider.value = obj.value;
        fslider.step= 0.01;
        (function(obj){
          fslider.addEventListener("change", function() {
               obj.value = this.value ;
               //sliderText.innerHTML = this.value ;
               //console.log(t, obj, obj.value) ;
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
  console.log('mixValence', this.mixValence, 'mixArousal', this.mixArousal)
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
}





