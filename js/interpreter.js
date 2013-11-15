   

define(['underscore', 'js/URIjs/URI', 'js/path', 'webida/webida', 'js/sprintf'], function(_, URI, Path, webida, s)  {

	var sprintf = s.sprintf;
    
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
            //log('dstFS=',destFS);
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
        function list_dir2(printer, path, continuation) {
            function acl(file, callback) {
                mount.getAcl(file.path, function(error, acl) {
                    var result = '';
                    if (error) {
                        alert('getACLError: ' + error);
                    }
                    else {                        
                        for (var prop in acl) {                            
                            if (acl.hasOwnProperty(prop)) {
                                result += prop + ':' + acl[prop] + ', ';
                            }
                        }    
                    } 
                    callback(null, result); // callback: (error, result) -> result'
                });                
            }
            function print(file, callback) {
                var head = sprintf("%10s ", file.ctime);
                if (file.isDirectory) {
                    head = sprintf("%s %8s \t [[;#ff0000;]%s]", head, '<DIR>', file.filename);
                } else {
                    head = sprintf("%s %8s \t [[;;]%s]", head, file.size, file.filename);
                }
                callback(null, head);
            }            
            function print_it(file, callback) {
                async.series(
                    [
                        print.bind(null, file),
                        acl.bind(null, file)
                    ],
                    function(error, result) {
                        var str = '';
                        str = sprintf("%s \t [[i;;]%.20s]", result[0], result[1] === '' ? '' : '{'+result[1]+'}');
                        printer(str);
                    }
                );                 
                callback(null, null);
            }
            mount.list(path, function (err,files) {
                if (err) {
                    // 현재 file (not dir)인 경우 error로 뜨고 있는데, 고쳐져야 한다
                    // 있으면 files에 하나만 들어오도록 수정
                }
                else { 
                    async.each(files, print_it, continuation);
                }
                //continuation();
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
        list_dir2(terminal.echo, normalized_path, continuation);
    }
    
//    function geta(args, env, terminal, continuation) {
//        function acl(file, callback) {
//            mount.getAcl(file.path, function(error, acl) {
//                if (error) {
//                    alert('getACLError: ' + error);
//                }
//                else {                        
//                    var result = 'ACL: ';
//                    for (var prop in acl) {                            
//                        if (acl.hasOwnProperty(prop)) {
//                            result += prop + ' ';
//                        }
//                    }    
//                    printer(result);
//                } 
//                callback();
//            });                
//        }
//    }
    function seta(args, env, terminal, continuation) {
        function npath (env, str) {
            if (str.charAt(0) == '/') {
                return Path.join(str);
            } else {
                return Path.join(env.pwd, str);
            }
        }        
        if (args.length !== 3) {
            terminal.echo('Invalid arg number for seta');
        } else { // 에러처리필요
            mount.setAcl(npath(env,args[2]), {'hgkang':'rw'}, function(error) {
                terminal.echo(error);
                continuation();
            });
//            var path = npath(env, args[2]);
//            var ac = args[0]; 
//            var acl = {}[args[1]] = ac;
//            mount.setAcl(path, acl, function(error) {
//                terminal.echo(error);
//            });
        }        
        
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
                    terminal.echo(new String(result));
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
        
    
    function dir(obj) {
        var result = '';
        for (var property in obj) {
            if (obj.hasOwnProperty(property)) {
                result += property + ', ';
            }
        }
        return result;
    }
    
    function help(args, env, terminal, continuation) {
        terminal.echo(dir(shell_command));
        continuation();
    }
    
    var shell_command = {
        pwd: pwd,
        ls: ls,
        cd: cd,
        js: js,
        seta: seta,
        help: help, 
        mv: todo,
        mkdir: todo,
        cp: todo,
        touch: todo,
        auto_completion: todo
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
        if (shell_command[words[0]] !== undefined) {
            shell_command[words[0]](args, env, terminal, continuation);
        } else {
            var str="";                
            for (i=0; i<words.length; i++) {                    
                str = str.concat(words[i]+' ');
            }    
            echo(str + ': command not found');
            continuation();
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