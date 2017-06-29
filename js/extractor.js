// Main extrator object to hold data and implement file handling, 
// audio decoding and feature extration
Extractor = function(windowSize, duration){
    this.windowSize = windowSize ;
    this.windowType = "hamming" ;
    this.numMFCC = 3 ;
    this.featureNames =  [
        'mfcc', 'loudness', 'energy', 'zcr','spectralCentroid', 
        'spectralSlope','spectralRolloff', 'spectralFlatness', 
        'spectralSpread', 'spectralSkewness', 'spectralKurtosis',
        'perceptualSpread','perceptualSharpness'];

    let arrayLength = Math.floor((44100*duration)/windowSize) ;
    this.features = {} ;
    for (let i = 0; i < this.featureNames.length; i++) {
        let myArray = new Array(arrayLength) ;
        myArray.fill(1) ;
        this.features[this.featureNames[i]] = {'data': myArray, 'average':0, 'std_dev':0} ;
    }

    // setup the mfcc data collector
    this.mfccData = new Array(this.numMFCC) ;
    for (let j = 0; j < this.mfccData.length; j++) {
      let myArray = new Array(arrayLength) ;
      myArray.fill(1) ;
      this.mfccData[j]=myArray;
    }
    this.features['mfcc'] = {'data':this.mfccData, 'average':new Array(this.numMFCC),  'std_dev':new Array(this.numMFCC)} ;

    Meyda.bufferSize = this.windowSize ;
    Meyda.windowingFunction = this.windowType;
    //Meyda.callback = meydaCallback(Meyda) ;
    Meyda.melBands = this.numMFCC ;
};


//
//
// here we extract features
//
// buffer length should be same size as windowsize
Extractor.prototype.extractFeatures = function(buffer) {
    //console.log('begin callback') ;
    let source = buffer;//.getChannelData(0);   

    // go across the audio samples and decompose into audio features
    //

        let dump = Meyda.extract(this.featureNames, source) ;
        //collector.push(dump) ;
        for (let j = 0; j < this.featureNames.length; j++) {

            let name = this.featureNames[j] ;
            let feature = this.features[name] ;
            if(name == 'loudness') {
                feature.data.shift() ;
                feature.data.push(dump[name]['total']) ;

            } else if(name ==='mfcc') {
                //console.log(dump[name]) ;
                for (let k = 0; k < feature.data.length; k++) {
                    feature.data[k].shift() ;
                    feature.data[k].push(dump[name][k]) ;
                }
            } else {
                feature.data.shift() ;
                feature.data.push(dump[name]) ;
            }
        }
    //}



} // end extractFeatrues


Extractor.prototype.getValenceArousal = function(first_argument) {
  let statistics = this.featureStatistics(this.features, this.featureNames) ;
  let v = this.valence(this.features) ;
  let a = this.arousal(this.features) ;

  return {'valence':v, 'arousal':a}
};
//
//
// calculate the audio feature statistics
//
//
Extractor.prototype.featureStatistics = function (features, featureNames) {
    let mfccs = [] ;
    for (let i = 0; i < featureNames.length; i++) {
        let name = featureNames[i] ;
        let feature = features[name] ;
        if(name ==='mfcc') {
            for (let j = 0; j < feature.data.length; j++) {
                features['mfcc '+j+' average'] = math.mean(feature.data[j]);
                features['mfcc '+j+' std_dev'] = math.std(feature.data[j]) ;
            }
        } else {
            features[name +' average'] = math.mean(feature.data) ;
            features[name +' std_dev'] = math.std(feature.data);//average(feature.average, feature.data) ;
        }
        //delete features[name] ;
    }  
} 


Extractor.prototype.valence = function(features) {
	Valence =
      0.3169 * features['mfcc 0 std_dev'] +
     -0.1044 * features['loudness average'] +
     -0.3476 * features['loudness std_dev'] +
      0.0137 * features['energy average'] +
     -0.0162 * features['energy std_dev'] +
      0.0027 * features['zcr average'] +
      0.0219 * features['zcr std_dev'] +
     -0.0115 * features['spectralCentroid average'] +
     -0.0378 * features['spectralCentroid std_dev'] +
      0      * features['spectralRolloff average'] +
     -3.6721 * features['spectralFlatness std_dev'] +
     -0.0102 * features['spectralSpread average'] +
      0.0415 * features['spectralSpread std_dev'] +
     -0.1737 * features['spectralSkewness average'] +
      0.1039 * features['spectralSkewness std_dev'] +
      0.0008 * features['spectralKurtosis average'] +
      0.0004 * features['spectralKurtosis std_dev'] +
      2.9459 * features['perceptualSpread average'] +
     -1.497  * features['perceptualSharpness average'] +
     -2.2809 * features['perceptualSharpness std_dev'] +
      0.9723 ;
      return Valence ;
};

Extractor.prototype.arousal = function(features) {
	Arousal =
     -0.2507 * features['mfcc 0 average'] +
      0.1834 * features['mfcc 1 average'] +
     -0.1541 * features['mfcc 2 average'] +
      0.5448 * features['mfcc 2 std_dev'] +
      0.1269 * features['loudness average'] +
      0.3401 * features['loudness std_dev'] +
      0.0124 * features['energy average'] +
     -0.0348 * features['energy std_dev'] +
     -0.0018 * features['zcr average'] +
      0.0162 * features['spectralCentroid average'] +
      0      * features['spectralRolloff average'] +
      0      * features['spectralRolloff std_dev'] +
     -0.7037 * features['spectralFlatness average'] +
      2.257  * features['spectralFlatness std_dev'] +
     -0.0062 * features['spectralSpread average'] +
      0.0704 * features['spectralSkewness average'] +
     -0.1142 * features['spectralSkewness std_dev'] +
      0.0001 * features['spectralKurtosis std_dev'] +
     -2.5891 * features['perceptualSpread average'] +
     -9.8507 * features['perceptualSpread std_dev'] +
     -2.1821 * features['perceptualSharpness std_dev'] +
      0.1103 ;

      return Arousal ;
};