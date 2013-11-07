function getAppRootURL() {
    var temp = document.URL.substr(0,  document.URL.lastIndexOf('?'));
    return temp.substr(0, temp.lastIndexOf('/'));
}

function log () {
    var debug = true;
    var msg = '';
    //var i = 1;
    if (debug) {        
        for (var i=0; i<arguments.length; i++) { 
            msg += arguments[i];
        }
        console.log (msg);
    }
}

function error(s) { throw s; }
function todo(s) { throw "TODO: " + s; }

String.prototype.strip = function(char) {
    return this.replace(new RegExp("^" + char + "*"), '').
        replace(new RegExp(char + "*$"), '');
};

function isString(arg) {
  return typeof arg === 'string';
}

function dir(obj) {
    var result = '';
    for (var property in obj) {
        if (obj.hasOwnProperty(property)) {
            result += property + ', ';
        }
    }
    return result;
}


//$.extend_if_has = function(desc, source, array) {
//    for (var i=array.length;i--;) {
//        if (typeof source[array[i]] != 'undefined') {
//            desc[array[i]] = source[array[i]];
//        }
//    }
//    return desc;
//};


/* webida utils */ 