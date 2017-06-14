// Main extrator object to hold data and implement file handling, 
// audio decoding and feature extration
Extractor = function(){
    this.windowSize = 512 ;
    this.windowType = "hamming" ;
    this.numMFCC = 3 ;
    this.featureNames =  [
        'mfcc', 'loudness', 'energy', 'zcr','spectralCentroid', 
        'spectralSlope','spectralRolloff', 'spectralFlatness', 
        'spectralSpread', 'spectralSkewness', 'spectralKurtosis',
        'perceptualSpread','perceptualSharpness'];
    console.log(this) ;
};


//
//
// here we extract features
//
//
Extractor.prototype.extractFeatures = function(buffer) {
    console.log('begin callback') ;
    let source = buffer;//.getChannelData(0);   

    Meyda.bufferSize = this.windowSize ;
    Meyda.windowingFunction = this.windowType;
    //Meyda.callback = meydaCallback(Meyda) ;
    Meyda.melBands = this.numMFCC ;

    let features = {} ;
    for (let i = 0; i < this.featureNames.length; i++) {
        features[this.featureNames[i]] = {data: new Array(), average:0, std_dev:0} ;
    }

    this.mfccData = new Array(this.numMFCC) ;
    for (let j = 0; j < this.mfccData.length; j++) this.mfccData[j]=new Array();
    features['mfcc'] = {data:this.mfccData, average:new Array(this.numMFCC),  std_dev:new Array(this.numMFCC)} ;


    // go across the audio samples and decompose into audio features
    //
    let dump ;
    let collector =[];


    for (let i = 0; i < buffer.length-this.windowSize; i+=this.windowSize/2) {

        dump = Meyda.extract(this.featureNames, source.slice(i,i+this.windowSize)) ;
        collector.push(dump) ;
        for (let j = 0; j < this.featureNames.length; j++) {

            let name = this.featureNames[j] ;
            let feature = features[name] ;
            if(name == 'loudness') {

                feature.data.push(dump[name]['total']) ;

            } else if(name ==='mfcc') {
                //console.log(dump[name]) ;
                for (let k = 0; k < feature.data.length; k++) {
                    
                    feature.data[k].push(dump[name][k]) ;
                }
            } else {

                feature.data.push(dump[name]) ;
            }
        }
    }

    this.featureStatistics(features, this.featureNames)
    return features ;

} // end extractFeatrues


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
        delete features[name] ;
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