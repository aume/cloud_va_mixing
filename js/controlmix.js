/*
**
**
** controlmix.js
** implements PD controller for va audio mixing a roughmix
**
**
*/

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

function AudioTrack(output) {

  // eq params adjusted with e.g.
  // lowshelf.gain.value = 0.6; (-40,40)
  // lowshelf.frequency.value = 300;
  this.myInput = null;//audioCtx.createBufferSource() ;
  this.lowshelf = audioCtx.createBiquadFilter();
  this.mid = audioCtx.createBiquadFilter();
  this.highshelf = audioCtx.createBiquadFilter();

  //set the filter types (you could set all to 5, for a different result, feel free to experiment)
  this.lowshelf.type = 3;
  this.mid.type = 5;
  this.highshelf.type = 4;

  //connect 'em in order
  yourInput.connect(lowshelf);
  this.lowshelf.connect(this.mid);
  this.mid.connect(this.highshelf);
  this.highshelf.connect(output);

  // the eq pid controllers
  this.lowGainPD = new PID() ;
  this.lowFreqPD = new PID() ;
  this.midGainPD = new PID() ;
  this.midFreqPD = new PID() ;
  this.highGainPD = new PID() ;
  this.highFreqPD = new PID() ;
}

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

// stop and release the node
// then create and connect 
AudioTrack.prototype.swapBuffer = function(buffer) {
  this.myInput.stop() ;
  this.myInput.disconnect() ;
  this.myInput = null ;
  this.myInput = audioCtx.createBufferSource() ;
  this.myInput.buffer = buffer;
  this.myInput.connect(this.lowshelf) ;
  this.myInput.start() ;
};

// @param - tracks, semgment pool, va envelopes
function ControlMix(tracks) {

    // add a web audio track to each track
    tracks.forEach(function(track){
      track.audioTrack = new AudioTrack() ;
    }) ;

    this.audioTracks = tracks; 
    this.merger = audioCtx.createChannelMergerNode(tracks.length) ;
    this.analyzer = audioCtx.createAnalyzerNode() ;
    this.processor = audioCtx.createScriptProcessorNode(1024) ;

    this.sched = new WebAudioScheduler({ context: audioCtx });

    this.sched.on("start", () => {
      masterGain = audioCtx.createGain();
      masterGain.connect(audioCtx.destination);
    });

    this.sched.on("stop", () => {
      masterGain.disconnect();
      masterGain = null;
    });

}


ControlMix.prototype.mixit = function(first_argument) {
    // body...
};


ControlMix.prototype.getEnvelopeValue = function(envelope, time){
    // Calculates the current value of the envelope
    // Args: array of control points, time
    // Returns: Float value
    let lPoint = envelope.filter(function(obj){
        if(obj[0]<=time) return true ;
        else return false;
    }) ;

    lPoint = lPoint.slice(-1)[0] ;
    
    let rPoint = envelope.filter(function(obj){
        if(obj[0]>=time) return true ;
        else if(time>1.0) return true ;
        else return false;
    }) ;
    rPoint = rPoint[0];

    //console.log('time', time, 'lPoint', lPoint.val, 'rPoint', rPoint.val)

    let slope = (rPoint[1]-lPoint[1])/(rPoint[0]-lPoint[0])
    let intercept = lPoint[1]-slope*lPoint[0]

    let value = time*slope+intercept ;
    return value;
}


ControlMix.prototype.scheduleMix = function(e) {
  let t0 = e.playbackTime;

  // schedule a clip to be played on a track
  this.tracks.forEach(function(track){
    track.clips.forEach(function(clip){
      let seg = clip.segment ;
      sched.insert(t0 + clip.offset, scheduleClip, { buffer: seg.audioBuffer, duration: seg.dur, track:track.audioTrack });
    }.bind(this)) ;
  }) ;
}


//
// connect: buffer source -> gain node 
//                           audio dest -> analyser -> processor node
//                                                      PD
//
function scheduleClip(e) {
  let t0 = e.playbackTime;
  let t1 = t0 + e.args.duration;
  e.args.track.swapBuffer(e.args.buffer) ;


  sched.nextTick(t1, () => {
    // on complete do something or not
  });
}



document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    sched.aheadTime = 0.1;
  } else {
    sched.aheadTime = 1.0;
    sched.process();
  }
});

document.getElementById("start-button").addEventListener("click", () => {
  sched.start(metronome);  
});

document.getElementById("stop-button").addEventListener("click", () => {
  sched.stop(true);
});

