if (typeof require !== 'undefined') {
    var scope = exports;
} else {
    var scope = parser.yy;
}


scope.ppNode = function (n) { 
//    function log (x) { console.log(x); }
    function ps(n) { 
        var s = "";
        switch(n.kind) {                                
            case 'SEQ': 
                s = n.data.reduce(function(acc,item) { 
                    if (acc==="") { return ps(item); }
                    else {return acc+';\n'+ps(item);} 
                },"");
                return s;
            case 'SIMPLE_COMMAND':
                s = n.data.reduce(function(acc,item) { 
                    if (acc==="") { return ps(item); }
                    else {return acc+' '+ ps(item); }
                },"");
                return s;
            case 'word':
                return n.data;
            default:
                break;
        }
    }
    console.log ('<pp result>\n'+ ps(n));
};

scope.Node = function (kind, data) {
    this.kind = kind;
    this.data = data;
};
