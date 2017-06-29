/*
**
**
** controlmix.js
** implements PD controller for va audio mixing a roughmix
**
**
*/

// @param - tracks, semgment pool, va envelopes


function map(X, A, B, C, D) {
  //If your number X falls between A and B, and you would like Y to fall between C and D, you can apply the following linear transform:
  //https://stackoverflow.com/questions/345187/math-mapping-numbers
  return (X-A)/(B-A) * (D-C) + C
}

function clamp(v, min, max) {
    return (Math.min(max, Math.max(min, v)));
}

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
    
    // all tracks feed into master with merger
    this.merger = audioCtx.createChannelMerger(this.audioTracks.length) ; // assume stereo for each track

    // master audio track and GUI
    this.master = new AudioTrack(this.merger) ;
    this.master.output.connect(audioCtx.destination) ;

    // let masterMeter = new Meter(this.master) ;
    // let channel = document.createElement('div') ;
    // channel.className = "master_channel" ;
    // channel.appendChild(masterMeter.dot_canvas) ;
    // channel.appendChild(masterMeter.osc_canvas) ;
    // document.body.appendChild(channel) ;

    //
    // add a web audio track to each track
    // add tracks to GUI
    for (var i = 0; i < this.audioTracks.length; i++) {
      let track = this.audioTracks[i] ;

      // new audio track with input
      track.audioTrack = new AudioTrack(audioCtx.createBufferSource()) ;
      // specify output to merger node
      track.audioTrack.output.connect(this.merger,0, i) ;

      // new meter for the track
      let meter = new Meter(track.audioTrack) ;
      let mixer = createSliders(track.audioTrack) ;
      let channel = document.createElement('div') ;
      channel.className = "channel" ;
      channel.appendChild(mixer) ;
      channel.appendChild(meter.dot_canvas) ;
      channel.appendChild(meter.osc_canvas) ;
      document.body.appendChild(channel) ;

    }


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

        let sliderText = document.createElement('code') ;
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
      return mixer ; 
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





