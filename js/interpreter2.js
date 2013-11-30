bash2.yy.Node = function (kind, data) {
    this.kind = kind;
    this.data = data;
};

function empty_cb(error, result) {}   

define(['js/path', 'js/sprintf'], function(Path, s)  {

	var sprintf = s.sprintf;

    var w;
    function test(args, env, callback) {                
        if(typeof(Worker)!=="undefined") {
            if(typeof(w)=="undefined") {
                w = new Worker("js/test_worker.js");
            }
            w.onmessage = function (event) {
                env.terminal.echo(event.data);
            };
            //w.terminate();
        } else {
            env.terminal.echo('Sorry, your browser does not support Web Workers...');
        }
        
        callback(null, env);
    }
    
    function pwd(args, env, callback) {
        env.terminal.echo(env.pwd);
        callback(null, env);
    }
    
    function ls(args, env, callback) {
        function list_dir2(printer, path, callback) {
            function acl(file, callback) {
                env.fs.getACL(file.path, function(error, acl) {
                    var result = '';
                    if (error) {
                        alert('jash: getACLError: ' + error);
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
                        callback(null,env);
                    }
                );      
                
            }
            env.fs.list(path, function (err,files) {
                if (err) {
                    // 현재 file (not dir)인 경우 error로 뜨고 있는데, 고쳐져야 한다
                    // 있으면 files에 하나만 들어오도록 수정
                    //callback(null,env);
                }
                else { 
                    async.each(files, print_it, function(err) { 
                        callback(null,env); 
                    } );
                    //callback(null, env);
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
        list_dir2(env.terminal.echo, normalized_path, callback);
    }
    
    function geta(args, env, callback) {
        if (args.length !== 1) {
            env.terminal.echo('geta: number of args should be 1');
            callback(null, env);
        } else {
            var npath = Path.join(env.pwd, args[0]);
            
            env.fs.exists(npath, function(e, exists) {
                if (e) {
                    error(e); callback(null, env);
                } else if (exists) {
                    env.fs.getACL(npath, function(e, acl) {
                        if (e) alert('jash: getACLError: ' + e);
                        else {
                            for (var prop in acl) {
                                env.terminal.echo(prop + ':' + acl[prop]);
                            }
                            callback(null,env);
                        }
                    });
                } else { 
                    env.terminal.echo("jash: geta: " + npath + ': No such file or directory');
                    callback(null, env);
                }
            });
        }        
    }
        
    function seta(args, env, callback) {
        function npath (env, str) {
            if (str.charAt(0) == '/') {
                return Path.join(str);
            } else {
                return Path.join(env.pwd, str);
            }
        }        
        if (args.length !== 3) {
            env.terminal.echo('jash: Invalid arg number for seta');
            callback(null,env);
        } else { // input 에러처리필요 
            acl = {};
            acl[args[0]] = args[1]; // arg
            env.fs.setACL(npath(env,args[2]), acl, function(error) {
                env.terminal.echo(error);
                callback(null, env);
            });
        }        
    }
    
    function cd(args, env, callback) {
        var normalized_path;
        function set_pwd(path) {
            env.pwd = path;
            env.terminal.set_prompt(env.pwd + '> ');
        }
        function doIfExists(path) {
            env.fs.exists(path, function(e, exists) {
                if (e) error(e);
                // 성공 (해당 디렉토리 존재) 했을때만 pwd 설정하도록
                else if (exists) {
                    env.pwd = path;
                    set_pwd(env.pwd);
                    callback(null, env);
                } else { 
                    env.terminal.echo("jash: cd: " + path + ': No such file or directory');
                    callback(null, env);
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
     
    function js(args, env, callback) {
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
		env.terminal.push(js_interpreter);
        env.terminal.set_prompt('[[;#00ff00;]js>] ');     
        // callback 유실
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
    
    function help(args, env, callback) {
        env.terminal.echo(dir(shell_command));
        callback(null, env);
    }
    
    var shell_command = {
        pwd: pwd,
        ls: ls,
        cd: cd,
        js: js,
        seta: seta,
        geta: geta,
        help: help, 
        test: test,
        mv: todo,
        mkdir: todo,
        cp: todo,
        touch: todo,
        more: todo,
        http: todo,
        rest_api_test: todo,
        man: todo,        
        auto_completion: todo
    };
    
    function simple_command (env, words, callback) {
        var args = [];
        var normalized_path; 
        for (var i=1; i<words.length; i++) {
            args = args.concat(words[i]);  
        }
        if (shell_command[words[0]] !== undefined) {
            shell_command[words[0]](args, env, callback);
        } else {
            var str="";                
            for (i=0; i<words.length; i++) {                    
                str = str.concat(words[i]+' ');
            }    
            env.terminal.echo(str + ': command not found');
            callback(null, env);
        }
    }            

    function interp(input, terminal) {    
        var absyn = bash2.parse(input);
        function simple_command_list (n, acc) {
            switch (n.kind) {
                case 'SIMPLE_LIST':
                case 'COMMAND': 
                case 'PIPELINE_COMMAND':
                    acc = simple_command_list(n.data, acc);
                    break;
                case 'PIPELINE_COMMAND_LIST':                    
                    for (var i=0; i< n.data.length; i++) {
                        acc = simple_command_list(n.data[i], acc);                
                    }
                    break;
                case 'SIMPLE_COMMAND':
                    acc.push(n.data);
                    break;
            }                        
            return acc;
        }
        
        async.reduce(simple_command_list(absyn, []), terminal.env, simple_command, empty_cb);
    }
    
    
    return interp;

});