

function VAmeter() {
	this.canvas = document.createElement('canvas');
	this.canvas.id = 'someId';
	this.context = this.canvas.getContext('2d');
	document.body.appendChild(this.canvas);
} 


VAmeter.prototype.update = function(v, a) {
	this.context.
};