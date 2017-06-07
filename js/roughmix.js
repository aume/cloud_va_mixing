
"use strict";

function AumeMix(){
    // a blank segment for silence
    //let blankSegment = this.newSegment(['bftype', 'filename', 10, 1, 1, 1])


    //let tracks = this.getRenderMix();
    
}


// AumeMix.prototype.convertVA 
// helper function to map from [time value]
// to control points with time 0-1
// @param: Array of [[time, value], [time, value], [time, value]]
// @ returns array of ControlPoints
AumeMix.prototype.convertVA = function(data, duration) {

    let value = data.map(function(obj){
        return this.newControlPoint(obj[0]/duration, obj[1])
    }.bind(this));
    return value;

}


// AumeMix.prototype.getSegmentsFromTracks
// Helper function for file segment loading to generate a 
// dictionary of unique filename and segements 
// @param: the list of tracks returned from AumeMix.prototype.generateMix
// @returns: {"filename":{'segments':{'id':Segment, 'id':Segment}}}...
AumeMix.prototype.getSegmentsFromTracks = function(tracks) {
    let results = {}
    tracks.forEach(function(track){
        track.clips.forEach(function(clip){
            let key = clip.segment.filename ;
            let ckey = clip.segment.id ;
            if(!results.hasOwnProperty(key)) results[key] = {} ;
            if (!results[key].hasOwnProperty(ckey)) results[key][ckey] = clip.segment ;
        })
    })
    return results ;
}



/*
    AumeMix.prototype.getRenderMix
    Args: 
    words - Dictionary of [{'word':word, 'files':[43,23,876]}]
    duration - Integer duration in seconds
    valenceEnv - Array of Control Points {'time':0, 'val':1.0}
    arousalEnv - Array of Control Points {'time':0, 'val':1.0}
*/

        
        
AumeMix.prototype.generateMix = function(words, duration, valenceEnv, arousalEnv){
    let valence = this.convertVA(valenceEnv, duration);

    let arousal = this.convertVA(arousalEnv, duration);
    console.log(valence, arousal)
/*
    Request 1: Get the Track Mix Tracks
    words - Dictionary of [{'word':word, 'files':[43,23,876]}, ]
    duration - Integer duration in seconds
    valenceEnv - Array of Control Points {'time':0, 'val':1.0}
    arousalEnv - Array of Control Points {'time':0, 'val':1.0}

    Returns:
    Variable    Type    Value
    words       string  The words used
    duration    int     The duration in seconds
    tracks      array   An array of Tracks


    // VA envelopes 
    # random testing
*/

    // var valenceEnv = [this.newControlPoint(0, random()), this.newControlPoint(duration, random())]+\
    // [this.newControlPoint(random(), random()) for i in range(3)]
    // arousalEnv = [this.newControlPoint(0, random()), this.newControlPoint(duration, random())]+\
    // [this.newControlPoint(random(), random()) for i in range(3)]
    
    let timeKeeper = 0
    let timedDecisionInterval = 1.0
    //this.blankSegment.dur = 1.0
    //this.volumeAdjustInterval = 0.1

    // The magic of audio metaphor SLiCE http://eprints.iat.sfu.ca/849/
    // search = aume_local.AUME()
    // searchResults = search.aume(words)
    
    // create array for each track
    //tracks = [this.newTrack(key,bf) for key in searchResults.keys() for bf in ['back', 'fore']]
    let tracks = []
    words.forEach(function(obj){

        let selectlist = "SELECT bfclass, filename, start, duration, valance, arousal, rowid "
        let tablelist = "FROM segmentlist JOIN filelist ON segmentlist.fileid=filelist.fileid "
        let clauselist = "";
        obj['files'].forEach(function(fileid){
            if(clauselist.length==0) {clauselist+="WHERE "}
                else{clauselist+=" OR "}
                clauselist += "segmentlist.fileid="+fileid ;
                
        });
        let query = selectlist+tablelist+clauselist ;

        let segs = db.exec(query);
        let bsegs = segs[0]['values'].filter(function(obj){
            if(obj[0] === 'back') return true;
            else return false ;
        }) ;
        let fsegs = segs[0]['values'].filter(function(obj){
            if(obj[0] === 'fore') return true;
            else return false ;
        }) ;


        if(bsegs.length)tracks.push(this.newTrack(obj['word'], 'back', bsegs));
        if(fsegs.length)tracks.push(this.newTrack(obj['word'], 'fore', fsegs));
    }.bind(this)) ;

    // rip through the mix laying down tracks
    while (timeKeeper < duration){
        // calculate the time of the next decision point
        timeKeeper = this.nextDecisionPoint(tracks, timeKeeper+timedDecisionInterval)
        
        // get all the track numbers that need a segment at that point
        let needsSegment = tracks.filter(function(track){
            if(track.clips.length<=0)
                return true            
            let clip = track.clips.slice(-1)[0]
            if (clip.offset+clip.segment.dur <= timeKeeper) 
                return true
            return false
        }) ;

        //console.log('needs seg: ' + needsSegment)
        // calculate v,a values of curves for time
        let v = this.getEnvelopeValue(valence, timeKeeper/duration)
        let a = this.getEnvelopeValue(arousal, timeKeeper/duration)
        // console.log('v', v)
        // console.log('a', a)
        // execute decision point populating tracks with clips        
        this.decisionPoint(needsSegment, v, a, timeKeeper)
    }
    return tracks
}

AumeMix.prototype.decisionPoint = function(tracks, valence, arousal, time){
    /*
    Select a segments for Tracks
    Implements the Minimum Conflicts Algorithm
    Args: the tracks, a list of track numbers that need clips, valence and arousal at time
    */
    tracks.forEach(function(track){
        let bestSegment = track.possibleSegments[0];
        let previous = this.computeDistance(bestSegment.valence, valence, bestSegment.arousal, arousal) ;

        track.possibleSegments.forEach(function(segment){
            let distance = this.computeDistance(segment.valence, valence, segment.arousal, arousal) ;
            if (distance<previous) {
                bestSegment=segment;
            }
        }.bind(this)) ;
        let clip = this.newClip(time, bestSegment) ;
        track.clips.push(clip) ;
    }.bind(this)) ;
}
      
AumeMix.prototype.getEnvelopeValue = function(envelope, time){
    // Calculates the current value of the envelope
    // Args: array of control points, time
    // Returns: Float value
    let lPoint = envelope.filter(function(obj){
        if(obj.time<=time) return true ;
        else return false;
    }) ;

    lPoint = lPoint.slice(-1)[0] ;
    
    let rPoint = envelope.filter(function(obj){
        if(obj.time>=time) return true ;
        else if(time>1.0) return true ;
        else return false;
    }) ;
    rPoint = rPoint[0];

    //console.log('time', time, 'lPoint', lPoint.val, 'rPoint', rPoint.val)

    let slope = (rPoint.val-lPoint.val)/(rPoint.time-lPoint.time)
    let intercept = lPoint.val-slope*lPoint.time

    let value = time*slope+intercept ;
    return value;
}



AumeMix.prototype.nextDecisionPoint = function(tracks, interval){
    //Given the tracks and timed decision interval, work out which is sooner"""
    let times = tracks.map(function(track){
        let clip = track.clips.slice(-1)[0] ;
        if(!clip) return interval;//console.log(!clip)
        return clip.offset + clip.segment.dur ;
    });
    times.push(interval);
    let value = Math.min.apply(null, times) ;
    return value
}
        
AumeMix.prototype.computeDistance = function(v1,v2, a1,a2){
      return Math.sqrt(Math.pow(v2-v1,2)+Math.pow(a2-a1,2)) ;
  }
    
    
AumeMix.prototype.needsClip = function(track, time) {
    // Function to check if a track has a clip at a specified time
    // Args: a Track, time in seconds
    // Returns: Boolean
    if(track.clips.length<=0)
        return true            
    let clip = track.clips.slice(-1)[0]
    if (clip.offset+clip.segment.dur <= time) 
        return true
    return false
}
        
    

AumeMix.prototype.Track = function() { 
    /*
    a dictionary/struct with key value pairs
    concept     string  concept this track represents
    bftype      string  bf type of this track (back, fore, backfore)
    name        string  Name of track including words and BF type e.g. barking-dog-foreground
    pan         float   0.0-1.0 
    clips       array   An array of Clips
    envelope    array   An array of ControlPoints
    segments    array   segments for this track to choose from to assign to a clip
    */
    this.concept='' ;
    this.bftype ='' ;
    this.name = '' ;
    this.pan = 0.0 ;
    this.clips = new Array() ;
    this.envelope = new Array() ;
    this.possibleSegments = new Array() ;
}
    
    
AumeMix.prototype.ControlPoint = function() {
    /*
    a dictionary/struct with key value pairs
    time        float   In seconds
    val         float   0.0-1.0
    */
    this.time = 0.0 ;
    this.val = 0.0 ;
}

AumeMix.prototype.Clip = function(){
    /*
    offset      float   Start time of clip on track in seconds
    segment     Segment The clip Segment
    */
    this.offset = 0.0 ;
    this.segment = null ;
}

AumeMix.prototype.Segment = function() {
    /*
    filename    string  Path of the sound file
    start       float   Start of the segment in seconds
    dur         float   Duration of the segment in seconds
    features    Dictionary     mean and std of features for this clip
    valence     float   Representing the percieved valence of the clip
    arousal     float   Representing the percieved arousal of the clip
    segment     Segment
    hasPlayed 

    */
    this.filename = '' ;
    this.start = 0.0 ;
    this.dur = 0.0 ;
    this.features={} ;
    this.valence = 0.0 ;
    this.arousal = 0.0 ;
    this.segment = null ; // audio buffer
    this.hasPlayed = 0 ; // no repeats
}    
        
AumeMix.prototype.newTrack = function(word, bftype, segments){
    //Helper function to create and return a new Track
    let track = new this.Track() ;
    track.possibleSegments = segments.map(function(obj){
        return this.newSegment(obj) ;
    }.bind(this));
    track.concept=word
    track.bftype =bftype
    track.name = word
    track.pan = 0.5
    track.clips = []
    track.envelope = [] // the output volume envelope of this track
    return track
}
    

        
AumeMix.prototype.newClip = function(offset, segment){
    //Helper function to create and return a new Clip"""
    let clip = new this.Clip()
    clip.offset = offset
    clip.segment = segment
    return clip
}

AumeMix.prototype.newSegment = function(seg){
    //Helper function to create and return a new Segment
    // Args: [bftype, filename, start, duration, valance, arousal]
    let segment = new this.Segment()
    if(seg[3]== 0) // we do this because we sometimes want a dummy
        return segment
    segment.segment = seg
    segment.filename = seg[1]
    segment.start = seg[2]
    segment.dur = seg[3]
    segment.valence = seg[4]
    segment.arousal = seg[5]
    segment.id = seg[6]
    return segment
}

AumeMix.prototype.newControlPoint = function(time, val){
    //Helper function to create and return a new ControlPoint"""
    let cp = new this.ControlPoint()
    cp.time = time
    cp.val = val
    return cp
}
