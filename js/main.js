
function getAppRootURL() {
    var temp = document.URL.substr(0,  document.URL.lastIndexOf('?'));
    return temp.substr(0, temp.lastIndexOf('/'));
}

require.config({
    //baseUrl: getAppRootURL() + '/js',    
    "paths": {
        webida: '//' + document.cookie.replace(/(?:(?:^|.*;\s*)webida\.host\s*\=\s*([^;]*).*$)|^.*$/, "$1"),
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
bash2.yy.ppNode = function (n, pp) { 
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
            case 'WORD':
                return n.data;
            default:
                break;
        }
    }
    if (pp === undefined) {
        console.log ('<pp result>\n'+ ps(n));
    } else {
        pp(ps(n));
    }
};
bash2.yy.Node = function (kind, data) {
    this.kind = kind;
    this.data = data;
};

function walker (doit,n,acc) {
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

require(['webida/webida', 'underscore'],function(webida, _) {
    var destFS;
    var mount;
    var pwd = '/';    
        
    webida.auth.myinfo (function(error, user_info) {
        if (error) {  alert('Terminal app can be used only when logged in' + error.reason);   }
        else {
            destFS = user_info.fsid;
            mount = webida.fs.mountByFsid(destFS);                        
            log('dstFS=',destFS);
        }
    });                
    
    (function($) {
        $.fn.tilda = function(interp, options) {
            if ($('body').data('tilda')) {
                return $('body').data('tilda').terminal;
            }
            this.addClass('tilda');
            options = options || {};
            interp = interp || function(command, term) {
                term.echo("you don't set interp for tilda");
            };
            var settings = {
                prompt: pwd + '> ',
                name: 'tilda',
                height: 200,
                enabled: true,
                greetings: 'Welcome to "wash" world',
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
            self.terminal = this.find('.td').terminal(interp, settings);
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
            $('body').data('tilda', this);
            //this.hide();
            return self;
        };
    })(jQuery);
    

    jQuery(document).ready(function($) {
        $('#tilda').tilda(interp_); 
    });
    

    //--------------------------------------------------------------------------    
    function Interpreter(terminal) {
        this.echo = terminal.echo;
        this.simple_command = function (words, env) {            
            echo = this.echo;
            var command = words[0].data;
            var args = [];
            for (var i=1; i<words.length; i++) {
                args = args.concat(words[i].data);  
            }
            switch(words[0].data) {
                case 'ls':
                    var lsPath;
                    if (args.length === 0) {
                        lsPath = pwd;
                    }
                    else if (args[0].charAt(0) == '/') {
                        lsPath = args[0];
                    }
                    else {
                        lsPath = pwd + args[0];
                    }
                    list_dir(echo, lsPath);
                    break;
                case 'cd':
                default:
                    for (i=0; i<words.length; i++) {
                        echo (words[i].data + ' ');
                    }    
                    break;
            }
            return env; // no update yet,
        };    
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
        
    function interp_ (input, terminal) {
        var interpreter = new Interpreter(terminal);
        var absyn = bash2.parse(input);        
        var env = 'not used yet'; 
        bash2.yy.walker(interpreter,absyn,env);
    }

});


