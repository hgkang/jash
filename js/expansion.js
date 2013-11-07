

/*


//----------------------------
    // Expansion 
    //----------------------------
    function f_reduce(list,acc) { 
        for (var i=0; i<list.length; i++) {
            acc = list[i](acc);            
        }
        return acc;
    }
    function expand(s,echo) {
        var r = /{[^{}]+}/;
        r = /{(?!})[^{}]+}/;  //    ??????
        
        
        var match = s.match(r);
        var result = [];
        if (match) {
//            echo('then');
            var pre = s.substr(0, match.index);
            var inner = s.substr(match.index+1, match[0].length-2);
            var inners = inner.split(',');
            var post = s.slice(match.index+match[0].length);
//            echo('pre='+pre + ' inner=' + inner + ' inners=' + inners + ' post=' + post);
            for (var i=0; i< inners.length; i++) {
//                echo(inners[i]);
                result = result.concat([pre+inners[i]+post]);
//                echo('result='+result);
            }
            //echo(result);
            var acc = [];
            for (i=0; i<result.length; i++) {
                acc = acc.concat(expand(result[i],echo));
            }           
            return acc;
        }
        else {
//            echo('else');
            //echo(s);
            return s;
        }
    }
    
    
    function test(ws, echo) {
        ws = [
            "a{1,b{1,2,{}}c,e}f",
            'a{1,2}c',
            '{}'
        ];
              
        for (var i=0; i<ws.length; i++) {
            echo('test case='+ws[i]+', result=' + expand(ws[i],echo));
        }
    }
});

*/