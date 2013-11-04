/** @see //webida.js */

bash2.yy.Node = function (kind, data) {
    this.kind = kind;
    this.data = data;
};

require(['webida/webida', 'underscore', 'js/URIjs/URI', 'js/path'],
        function(webida, _, URI, Path) {
    var destFS;
    var mount;
           
    initAuth(webida,URI);
            
    webida.auth.myinfo (function(error, user_info) {
        if (error) {  alert('Terminal app can be used only when logged in' + error.reason);   }
        else {
            destFS = user_info.fsid;
            mount = webida.fs.mountByFsid(destFS);                        
            log('dstFS=',destFS);
        }
    });
    
    (function($) {
        $.fn.wash = function(interp, options) {
            // 이미 wash 엘리먼트에 터미널 만들어져 있으면 그놈 사용
            if ($('body').data('wash')) { return $('body').data('wash').terminal; }
            
            // 없으면 wash라는 터미널 클래스 만들기
            this.addClass('wash');
            options = options || {};
            interp = interp || function(command, term) { term.echo("you don't set interp for wash"); };
            
            var settings = { name: 'wash', height: 250, enabled: true, greetings: 'Welcome to "wash" world' };
            if (options) { $.extend(settings, options); }
            this.append('<div class="td"></div>');
            var self = this;
            // 임의의 element에서 termianl이라는 놈 부르면 terminal object가 create됨 (jquery plug-in) 
            self.terminal = this.find('.td').terminal(interp, settings);
            self.terminal.env = { pwd:'/', home:'/'};
            $('body').data('wash', this);
            return self;
        };
    })(jQuery);  

    jQuery(document).ready(function($) {
//        var env = { pwd:'/', home:'/' } ;     
//        $('#wash').wash(gen_intep(env), { prompt: '/' + '> '});
        $('#wash').wash(interpreter, { prompt: '/' + '> '});
    });

    function interpreter (input, terminal) { 
        var absyn = bash2.parse(input);
        var iter = get_iter(terminal);
        iter(function() {}, absyn);
    }
//    function gen_intep (env) {        
//        return function (input,terminal) {
//            var absyn = bash2.parse(input);
//            var iter = get_iter(terminal);
//            iter(function() {}, absyn);
//        };  
//    }            
            
            
    //--------------------------------------------------------------------------    
   
    function list_dir(printer, path, continuation) {
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
                continuation();
            }
        });
    }

            
    function get_iter (terminal) {             
        var f = simple_command.bind(undefined, terminal);
        function iter (continuation, n) {
            switch (n.kind) {
                case 'SIMPLE_LIST':
                case 'COMMAND': 
                case 'PIPELINE_COMMAND':
                    iter (continuation, n.data);
                    break;
                case 'PIPELINE_COMMAND_LIST':
                    if (n.data.length ===0) {
                        continuation();
                    } else {
                        var hd = n.data.shift(); // side effect로 n.data tail(n.data)로 바뀐다. 
                        iter(iter.bind(undefined, continuation, n), hd);
                    }
                    break;
                case 'SIMPLE_COMMAND':
                    f(n.data, continuation);
            }            
        }
        return iter;
    }

    function simple_command (terminal, words, continuation) {
        log("[simple command]");
        console.log(terminal.env);
        env = terminal.env;
        echo = terminal.echo;
        function serror(s) { echo("Webida Server Error: "+s); }
        var command = words[0];
        var args = [];
        var normalized_path; 
        for (var i=1; i<words.length; i++) {
            args = args.concat(words[i]);  
        }
        switch(words[0]) {
            case 'pwd':
                echo(env.pwd);
                break;
            case 'ls': // 
                if (args.length === 0) {
                    normalized_path = env.pwd;
                } else if (args[0].charAt(0) == '/') {
                    normalized_path = Path.join(args[0]);
                } else {
                    normalized_path = Path.join(env.pwd, args[0]);
                }
                list_dir(echo, normalized_path, continuation);
                break;
            case 'cd':                     
                function set_pwd(path) {
                    env.pwd = path;
                    terminal.set_prompt(env.pwd + '> ');
                }
                function doIfExists(path) {
                    mount.exists(path, function(error, exists) {
                        if (error) serror(error);
                        // 성공 (해당 디렉토리 존재) 했을때만 pwd 설정하도록
                        else if (exists) {
                            env.pwd = path;
                            set_pwd(env.pwd);
                            console.log(env);
                            continuation();
                        } else { 
                            echo(path + ': No such file or directory');
                            continuation();
                        }
                    });                    
                }
                if (args.length === 0) { 
                    normalized_path = env.home;
                    //set_pwd(env.home);
                } else if (args[0].charAt(0) == '/') {
                    normalized_path = Path.join(args[0]);
                } else { 
                    normalized_path = Path.join(env.pwd, args[0]);
                }
                doIfExists(normalized_path);
                break;
            default:
                for (i=0; i<words.length; i++) {
                    echo (words[i] + ' ');
                }    
                break;
        }
    }            
   

});





