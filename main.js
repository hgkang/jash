/** @see //webida.js */


function getAppRootURL() {
    var temp = document.URL.substr(0,  document.URL.lastIndexOf('?'));
    return temp.substr(0, temp.lastIndexOf('/'));
}

require.config({
    //baseUrl: '.', 
    //baseUrl: './',
    "paths": {
        webida: '//' + document.cookie.replace(/(?:(?:^|.*;\s*)webida\.host\s*\=\s*([^;]*).*$)|^.*$/, "$1"),
//        webida: '//webida.js',        
        underscore: 'js/lodash.min',        
        //bash: 'bash_grammar'
    }
});


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


$.extend_if_has = function(desc, source, array) {
    for (var i=array.length;i--;) {
        if (typeof source[array[i]] != 'undefined') {
            desc[array[i]] = source[array[i]];
        }
    }
    return desc;
};

///-------------------------
// extending parser 
//--------------------------
//bash2.yy.ppNode = function (n, pp) { 
//    function ps(n) { 
//        var s = "";
//        switch(n.kind) {                                
//            case 'SEQ': 
//                s = n.data.reduce(function(acc,item) { 
//                    if (acc==="") { return ps(item); }
//                    else {return acc+';\n'+ps(item);} 
//                },"");
//                return s;
//            case 'SIMPLE_COMMAND':
//                s = n.data.reduce(function(acc,item) { 
//                    if (acc==="") { return ps(item); }
//                    else {return acc+' '+ ps(item); }
//                },"");
//                return s;
//            case 'WORD':
//                return n.data;
//            default:
//                break;
//        }
//    }
//    if (pp === undefined) {
//        console.log ('<pp result>\n'+ ps(n));
//    } else {
//        pp(ps(n));
//    }
//};
bash2.yy.Node = function (kind, data) {
    this.kind = kind;
    this.data = data;
};
function walker (doit,n, acc) {
    var recur = walker.bind(this, doit);

    switch (n.kind) { 
        case 'SIMPLE_LIST':
            acc = recur(n.data);
            break;
        case 'PIPELINE_COMMAND_LIST':
            for (var i=0; i<n.data.length; i++) {
                acc = recur(n.data[i], acc);
            }
            break;
        case 'PIPELINE_COMMAND':
            acc = recur(n.data,acc); 
            break;
        case 'COMMAND': 
            acc = recur(n.data,acc);
            break;        
        case 'SIMPLE_COMMAND':
            acc = doit.simple_command(n.data, acc);
            break;
        default:
            error('IMPL: you should not reach here');
    }  
    return acc;
}

bash2.yy.walker = walker;

require(['webida/webida', 'underscore', 'js/URIjs/URI'],function(webida, _, URI) {
    var destFS;
    var mount;

    
	//temp (from IDE)       
    function getRedirectUrl() {
        var cur = new URI(location.href);
        var authRel = new URI('./auth.html');
        var redirectUrl = authRel.absoluteTo(cur);
        redirectUrl.query('');
        return redirectUrl.toString();
    }
    var CLIENT_ID = 'Zu1j2lUb9yM6UM3r';

    webida.auth.initAuth(CLIENT_ID, getRedirectUrl());
    
                
    
    (function($) {
        $.fn.wash = function(o, options) {
            
            if ($('body').data('wash')) {
                return $('body').data('wash').terminal;
            }
            this.addClass('wash');
            options = options || {};
            o.interp = o.interp || function(command, term) {
                term.echo("you don't set interp for wash");
            };
            
            var settings = {
                keypress: function(e) {
                    if (e.which == 96) {
                        return false;
                    }
                }
            };
            if (options) {
                $.extend(settings, options);
            }
            this.append('<div class="td"></div>');
            var self = this;
            self.terminal = this.find('.td').terminal(o.interp, settings);
            
            var focus = true;
            $(document.documentElement).keypress(function(e) {
                if (e.which == 96) {
                    self.slideToggle('fast');
                    self.terminal.focus(focus = !focus);
                    self.terminal.attr({
                        scrollTop: self.terminal.attr("scrollHeight")
                    });
                }
            });
            $('body').data('wash', this);
            //this.hide();
            return self;
        };
    })(jQuery);
    jQuery(document).ready(main); 
        
    function main ($) {
        webida.auth.myinfo (function(error, user_info) {
            if (error) {  alert('Terminal app can be used only when logged in' + error);   }
            else {
                destFS = user_info.fsid;
                mount = webida.fs.mountByFsid(destFS);                        
                log('dstFS=',destFS);
                var o = new Interpreter();
                
                $('#wash').wash(o, {
                    prompt: o.env.pwd + '> ', 
                    name: 'wash',
                    height: 200,
                    enabled: true,
                    greetings: 'Welcome to "wash" world',
                });
            }
        });                       
    } 
    
    
    //--------------------------------------------------------------------------    
    function Interpreter() {
        // temp
        //test([],terminal.echo); return; 
        this.env = { pwd:'/', home:'/' };

        this.walker = function (n) { // side effect (visit) order is important 
            var walker = this.walker;
            switch (n.kind) { 
                case 'SIMPLE_LIST':
                    walker(n.data); 
                    break;
                case 'PIPELINE_COMMAND_LIST':
                    for (var i=0; i<n.data.length; i++) {
                        walker(n.data[i]); 
                    }
                    break;
                case 'PIPELINE_COMMAND':
                    walker(n.data); 
                    break;
                case 'COMMAND': 
                    walker(n.data);
                    break;        
                case 'SIMPLE_COMMAND':
                    this.simple_command(n.data);
                    break;
                default:
                    error('IMPL: you should not reach here');
            }  
        };       
        
        this.interp = function(input, terminal) {
            this.terminal = terminal;
            var n = bash2.parse(input);
            //bash2.yy.walker(this, absyn);
            this.walker(n);
        };
       
        this.simple_command = function (words) {
            echo = this.terminal.echo;
            function serror(s) { echo("Webida Server Error: "+s); }
            var command = words[0];
            var args = [];
            for (var i=1; i<words.length; i++) {
                args = args.concat(words[i]);  
            }
            switch(words[0]) {
                case 'ls':
                    var lsPath;
                    if (args.length === 0) {
                        lsPath = this.env.pwd;
                    }
                    else if (args[0].charAt(0) == '/') {
                        lsPath = args[0];
                    }
                    else if (args[0].charAt(0) == '.') {
                        lsPath = this.env.pwd + args[0].substring(1);
                    }
                    else {
                        lsPath = this.env.pwd + args[0];
                    }
                    list_dir(echo, lsPath.replace('//','/'));
                    break;
                case 'cd': // 성공 (해당 디렉토리 존재) 했을때만 pwd 설정하도록
                    // normalized path: 
                    function prompt(path) {
                        path = this.env.pwd;
                        this.terminal.set_prompt(this.env.pwd + '>');
                    }
                    function doIfExists(path) {
                        mount.exists(path, function(error, exists) {
                            if (error) serror(error);
                            else if (exists) {
                                this.env.pwd = path;
                                prompt(path);
                            }
                            else { 
                                echo(path + ': No such file or directory');
                            }
                        });                    
                    }
                    if (args.length ===0) {
                        prompt(this.env.home);
                    } else if (args[0].charAt(0) == '/') {                        
                        doIfExists(args[0]);                        
                    } else if (args[0].charAt(0) == '.') {
                        if (args[0].length == 1) {
                            // do nothing
                        } else if (args[0].charAt(1) == '.') {
                            todo(); 
                            // parentOf(pwd) 에서 부터 뭔가하고, 성공하면 pwd 바꾸기
                        }
                    }
                    else {
                        doIfExists((this.env.pwd + args[0]).replace('//','/'));
                    }
                    break;
                default:
                    for (i=0; i<words.length; i++) {
                        echo (words[i] + ' ');
                    }    
                    break;
            }
            this.terminal.echo(env);
            //return this.env; // no update yet,
        };    
    }      
    
    var interpreter = new Interpreter(terminal, { pwd:'/', home:'/' });
    function interp_ (input, terminal) {       
        var absyn = bash2.parse(input);
        bash2.yy.walker(interpreter,absyn);
    }


    function list_dir(printer, path) {
        function print(file) {
            if (file.isDirectory) {
                printer('\x1b[1;31m'+file.filename);
            } else {
                printer(file.filename);
            }                
        }
        mount.list(path, function (err, files) {
            if (err) {
                printer("fail to list directory: '" + path + "':" + err);
            }
            else {
                _.each(files, print);
            }
        });
    }

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





