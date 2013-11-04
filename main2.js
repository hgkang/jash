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
            $('body').data('wash', this);
            return self;
        };
    })(jQuery);  

    jQuery(document).ready(function($) {
        var env = { pwd:'/', home:'/' } ;     
        $('#wash').wash(gen_intep(env), { prompt: '/' + '> '});
    });

    //--------------------------------------------------------------------------    
    function Interpreter(terminal) {
        // temp
        //test([],terminal.echo); return; 
       
        this.echo = terminal.echo;
            
        this.simple_command = function (words, env) {
            echo = this.echo;
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
                    list_dir(echo, normalized_path);
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
                            }
                            else { 
                                echo(path + ': No such file or directory');                                
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
                    //console.log('target path = ' + normalized_path);                     
                    break;
                default:
                    for (i=0; i<words.length; i++) {
                        echo (words[i] + ' ');
                    }    
                    break;
            }
            console.log(env);  // 위에서 doIfExists가 env에 대한 aync update이기 때문에 제대로 반영 안됨
            return env;            
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

    function walker (doit,n,acc) {
        var recur = walker.bind(undefined, doit);
        
        switch (n.kind) { 
            case 'SIMPLE_LIST':
                acc = recur(n.data,acc);
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

    function gen_intep (env) {
        return function (input,terminal) {
            var interpreter = new Interpreter(terminal);
            var absyn = bash2.parse(input);
            walker(interpreter,absyn,env);
        };  
    }
});





