/* lexical grammar */
%lex
digit                       [0-9]
id                          [\/_a-zA-Z][\/_a-zA-Z0-9]*

%%
{digit}+				 	return 'NUMBER'
{id}                        return 'WORD';
"!"							return '!';
"{"							return '{';
"}"							return '}';
"("							return '(';
")"							return ')';
"time"                      return 'time';
"&"                         return '&';
"|"                         return '|';
">"	                        return '>';
"="	                        return '=';
";"                         return ';';
\s+                         /* skip whitespace */
"."                         throw 'Illegal character';
<<EOF>>                     return 'EOF';

/lex


%{

function log (x) { console.log(x); }

%}


/* operator associations and precedence */

%right '!'
%start program 

%% /* language grammar */


program 
	: simple_list '\n' { log($1); return 'list:' + $1; }    
    | simple_list 'EOF' { return $1; }
    | '\n'  { return 'list: newline'; }
    | error '\n' { log('error'); return 'simple_list: error'; }
    | 'EOF' { return 'EOF'; } 
    ;
simple_list
	: pipeline_command_list { $$ = new yy.Node('SIMPLE_LIST',$1); } 
    ;
pipeline_command_list	
    : pipeline_command 
    	{ 
        	$$ = new yy.Node('PIPELINE_COMMAND_LIST',[$1]); 
        } 
    | pipeline_command_list ';' pipeline_command 
    	{	
        	$$ = new yy.Node('PIPELINE_COMMAND_LIST', $1.data.concat($3)); 
        }
    ;
pipeline_command 
	: command { $$ = new yy.Node('PIPELINE_COMMAND',$1); } 
    ;
command 
	: simple_command 
    	{ 
    		$$ = new yy.Node('COMMAND',$1); 
        }  
	;
simple_command
	:	simple_command_element 
    	{ 
        	$$ = new yy.Node('SIMPLE_COMMAND', [$1]); 
        }
	|	simple_command simple_command_element 
    	{         	
            $$ = new yy.Node('SIMPLE_COMMAND', $1.data.concat($2));
        }    
	;
simple_command_element
	: WORD  
    	{         	
    		$$ = new yy.Node('WORD', yytext);
        }
    /*
	| ASSIGNMENT_WORD { $$ = []; }
	| redirection
    */
	;

