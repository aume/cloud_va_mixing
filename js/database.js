// Load the database
var db = null ;


function initdb(callback) {
	// async requ. for database
	var xhr = new XMLHttpRequest();
	xhr.open('GET', './aume_Freesound_currated.sqlite', true);
	xhr.responseType = 'arraybuffer';
	xhr.send();

	xhr.onload = function(e) {
	    var uInt8Array = new Uint8Array(this.response);
	    db = new SQL.Database(uInt8Array);
	    callback() ;
	}
}