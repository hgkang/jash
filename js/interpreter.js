   
define(['underscore', 'js/URIjs/URI', 'js/path', 'webida/webida'], function(_, URI, Path, webida)  {
    
    
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
    
    return {
        get_iter: get_iter
    };
});