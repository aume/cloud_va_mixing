

function Meter(track) {
	this.dotX = 0 ;
	this.dotY = 0 ;

	this.dot_canvas = document.createElement('canvas') ;
	this.dot_canvas.className = 'vameter' ;
	this.dot_canvas.setAttribute('width', 100) ;
	this.dot_canvas.setAttribute('height', 100) ;
	this.dot_context = this.dot_canvas.getContext("2d");

	// this.osc_canvas = document.createElement('canvas') ;
	// this.osc_canvas.setAttribute('width', 300) ;
	// this.osc_canvas.setAttribute('height', 200) ;
	// this.osc_context = this.osc_canvas.getContext("2d");

	this.audioTrack = track ;
	this.update() ;
}

Meter.prototype.updateDot = function() {
	let width = this.dot_canvas.width ;
	let height = this.dot_canvas.height ;

	this.dotY = map(this.audioTrack.arousal, 2, -2, 0, height) ;
	this.dotX = map(this.audioTrack.valence, -1, 0, 0, width) ;
	this.dotX = clamp(this.dotX, 0, height)
	this.dotY = clamp(this.dotY, 0, height)

	

	console.log("arousal", this.audioTrack.arousal, "valence", this.audioTrack.valence) ;

	this.dot_context.lineWidth = 1 ;
	this.dot_context.fillStyle="white";
	this.dot_context.fillRect(0,0,width, height);


	
	this.dot_context.strokeStyle = "#000" ;
	this.dot_context.beginPath();
	this.dot_context.moveTo(width/2, 0);
	this.dot_context.lineTo(width/2, height);
	this.dot_context.moveTo(0, height/2);
	this.dot_context.lineTo(width, height/2);
	this.dot_context.stroke();
	this.dot_context.strokeRect(0,0,width,height); 


	this.dot_context.lineWidth = 2 ;
	this.dot_context.strokeStyle = "#000" ;
	this.dot_context.fillStyle = "#fff" ;
	this.dot_context.beginPath();
	this.dot_context.ellipse(this.dotX, this.dotY, 10, 10, 0, 0, 2 * Math.PI);
	this.dot_context.stroke();
	this.dot_context.fill() ;
};

// Meter.prototype.updateOsc = function() {
// 	let dataArray = this.audioTrack.analyser.dataArray ;
// 	this.audioTrack.analyser.getByteTimeDomainData(dataArray);

// 	let bufferLength = this.audioTrack.analyser.bufferLength ;
	
// 	this.osc_context.fillStyle="white";
// 	this.osc_context.fillRect(0,0,this.osc_canvas.width, this.osc_canvas.height);

// 	this.osc_context.lineWidth = 2;
// 	this.osc_context.strokeStyle = 'rgb(0, 0, 0)';

// 	this.osc_context.beginPath();

// 	let sliceWidth = this.osc_canvas.width * 1.0 / bufferLength;
// 	let x = 0;

// 	let avg = 0 ;
// 	for (let i = 0; i < bufferLength; i++) {
// 	let v = dataArray[i] / 128.0;
// 	let y = v * this.osc_canvas.height / 2;

// 	if (i === 0) {
// 	  this.osc_context.moveTo(x, y);
// 	} else {
// 	  this.osc_context.lineTo(x, y);
// 	}
// 		x += sliceWidth;
// 	}

// 	this.osc_context.lineTo(this.osc_canvas.width, this.osc_canvas.height / 2);
// 	this.osc_context.stroke();
	
// };

Meter.prototype.update = function() {

	this.updateDot() ;
	//this.updateOsc() ;
	let that = this ;
  	requestAnimationFrame(function(){that.update()}, 100) ;

};