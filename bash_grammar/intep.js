


var parser = require("./bash2.js").parser;
parser.yy = require("./absyn.js");

var parse = exports.parse = function (input) {
    return parser.parse(input);
};

parse("a1 a2 a3; b1 b_2; _c");