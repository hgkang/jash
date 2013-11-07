   


define(['underscore', 'js/URIjs/URI', 'js/path', 'webida/webida'], function(_, URI, Path, webida)  {
    
	
    var destFS;
    var mount;
    var userName;
           
    initAuth(webida,URI);
    
    webida.auth.myinfo (function(error, user_info) {
        if (error) {  alert('Terminal app can be used only when logged in' + error.reason);   }
        else {
            destFS = user_info.fsid;
            userName = user_info.username;            
            mount = webida.fs.mountByFsid(destFS);                        
            log('dstFS=',destFS);
            //main();
        }
    });
    
    function get_iter (terminal) {             
        var f = simple_command.bind(undefined, terminal);
        function iter (continuation, n) {
            console.log (n);
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
                        var hd = n.data.shift(); // side effect로 n.data를 tail(n.data)로 바뀐다. 
                        iter(iter.bind(undefined, continuation, n), hd);
                    }
                    break;
                case 'SIMPLE_COMMAND':
                    f(n.data, continuation);
            }            
        }
        return iter;
    }
    
    function pwd(args, env, terminal, continuation) {
        terminal.echo(env.pwd);
        continuation();
    }
    
    function ls(args, env, terminal, continuation) {
        function list_dir(printer, path, continuation) {
            function print(file) {
                if (file.isDirectory) {
                    printer('\x1b[1;31m'+file.filename);
                } else {
                    printer('[[u;;]'+file.filename+']');
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
        var normalized_path;
        if (args.length === 0) {
            normalized_path = env.pwd;
        } else if (args[0].charAt(0) == '/') {
            normalized_path = Path.join(args[0]);
        } else {
            normalized_path = Path.join(env.pwd, args[0]);
        }
        list_dir(terminal.echo, normalized_path, continuation);
    }
    
    function cd(args, env, terminal, continuation) {
        var normalized_path;
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
                    terminal.echo("jash: cd: " + path + ': No such file or directory');
                    continuation();
                }
            });                    
        }
        if (args.length === 0) { 
            normalized_path = env.home; 
        } else if (args[0].charAt(0) == '/') {
            normalized_path = Path.join(args[0]);
        } else { 
            normalized_path = Path.join(env.pwd, args[0]);
        }
        doIfExists(normalized_path);
    }
     
    function js(args, env, terminal, continuation) {
        function js_interpreter(input, terminal) {
            if (input !== '') {
                try {
                    var result = window.eval(input);
                    //if (result !== undefined) {
                        //terminal.echo(result);
                        terminal.echo(new String(result));
                    //} 
                } catch(e) {
                    terminal.error(new String(e));
                }
            } else if ( input === 'exit' ) {                
                terminal.pop();
                terminal.set_prompt(env.pwd + ' >'); 
            } else {
                terminal.echo('');
            }
        }
		terminal.push(js_interpreter);
        terminal.set_prompt('[[;#00ff00;]js>] ');
        
    }
        
    var shell_command = {
        pwd: pwd,
        ls: ls,
        cd: cd,
        js: js
    };
    
    function simple_command (terminal, words, continuation) {
        log("[simple command]");
        console.log(terminal.env);
        var env = terminal.env;
        var echo = terminal.echo;
        function serror(s) { echo("Webida Server Error: "+s); }        
        var args = [];
        var normalized_path; 
        for (var i=1; i<words.length; i++) {
            args = args.concat(words[i]);  
        }
        switch(words[0]) {
            case 'pwd':
            case 'ls':
            case 'cd':
            case 'js':                
                shell_command[words[0]](args, env, terminal, continuation);
                break;
            default:
                //echo(function(){ return '[[guib;#000;#00ee11]sddome text]'; });
                var str="";                
                for (i=0; i<words.length; i++) {                    
                    str = str.concat(words[i]+' ');
                }    
                echo(str + ': command not found');
                continuation();
                break;
        }
        
    }            
    
    bash2.yy.Node = function (kind, data) {
        this.kind = kind;
        this.data = data;
    };

    function interpreter (input, terminal) { 
        var absyn = bash2.parse(input);
        var iter = get_iter(terminal);
        iter(function() {}, absyn);
    }
    
    
    return {
        userName: function() { return userName;},
        interpreter: interpreter
    };
//    return {
//        get_iter: get_iter
//    };
});