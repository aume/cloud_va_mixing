/*
**
**
** controlmix.js
** implements PD controller for va audio mixing a roughmix
**
**
*/

// @param - tracks, semgment pool, va envelopes
function ControlMix(tracks) {

    this.audioTracks = tracks; 

    this.merger = audioCtx.createChannelMerger(this.audioTracks.length) ; // assume stereo for each track
    this.analyser = audioCtx.createAnalyser() ;
    this.processor = audioCtx.createScriptProcessor(1024, 1, 1) ;

    this.processor.onaudioprocess = function() {
        // get the average, bincount is fftsize / 2
        let array =  new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(array);
        //let average = getAverageVolume(array)
    }.bind(this)

    // add a web audio track to each track
    let channelCount = 0 ;
    this.audioTracks.forEach(function(track){
      track.audioTrack = new AudioTrack() ;
      createSliders(track.audioTrack) ;

      //track.audioTrack.output.connect(this.merger,0, channelCount) ;
      channelCount+=1 ;
    }.bind(this)) ;

    // generate the sliders for eqs
    function createSliders(t) {
      console.log(t)
      let pArray = [t.lowshelf.frequency, 
                    t.mid.frequency, 
                    t.highshelf.frequency] ;
      let sliderArray = [] ;
      pArray.forEach(function(obj){
        fslider = document.createElement('input');
        fslider.type = 'range';
        fslider.setAttribute('orient','vertical');
        fslider.min  = obj.minValue;
        fslider.max  = obj.maxValue;
        fslider.value = obj.value;
        fslider.step= 0.1;
        (function(obj){
          fslider.addEventListener("change", function() {
               obj.value = this.value ;
               console.log(t, obj, obj.value) ;
            }, false);
        })(obj) ;
        obj.slider = fslider ;
        document.body.appendChild(fslider); 
      });
    }



    //this.merger.connect(this.analyser) ;
    //this.analyser.connect(this.processor)
    this.merger.connect(audioCtx.destination) ;


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
  console.log("scheduleClip", e) ;

  // let source = audioCtx.createBufferSource() ;
  // source.connect(audioCtx.destination) ;
  // source.buffer = e.args.buffer ;
  // source.start() ;

  //this.sched.nextTick(t1, () => {
    // on complete do something or not
  //});
}



// simple PD controller for AudioTrack
function PID() {
    
    this.set_point = 0.0
    this.measured = 0.0

    this.Kp = 0.1
    this.Kd = 0.01

    this.derivative  = 0
    this.previous_error = 0
    this.dt = 1 //timer_interval
}

PID.prototype.update = function(measured) {
    let error = this.set_point-measured
    this.derivative = (error - this.previous_error)/this.dt
    output = this.Kp*error + this.Kd*this.derivative
    this.previous_error = error
    return otuput
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
  this.highshelf.connect(audioCtx.destination);

  // the eq pid controllers
  this.lowGainPD = new PID() ;
  this.lowFreqPD = new PID() ;
  this.midGainPD = new PID() ;
  this.midFreqPD = new PID() ;
  this.highGainPD = new PID() ;
  this.highFreqPD = new PID() ;
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
  this.lowshelf.gain.value = this.lowGainPD.update() ;
  this.lowshelf.frequency.value = this.lowFreqPD.update() ;
  this.mid.gain.value = this.midGainPD.update();
  this.mid.frequency.value = this.midFreqPD.update() ;
  this.highshelf.gain.value = this.highGainPD.update() ;
  this.highshelf.frequency.value = this.highFreqPD.update() ;
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

