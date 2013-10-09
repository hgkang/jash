
/* description: Parses end executes mathematical expressions. */
digit                       [0-9]
id                          [a-zA-Z][a-zA-Z0-9]*

/* lexical grammar */
%lex
%%
[0-9]+("."[0-9]+)?\b  		return 'NUMBER'
{id}                        return 'WORD';
'!'							return '!';
'{'							return '{';
'}'							return '}';
'('							return '(';
')'							return ')';
"time"                      return 'time';
"&"                         return '&';
"|"                         return '|';
">"                        return '>';
";"                         return ';';
\s+                         /* skip whitespace */
"."                         throw 'Illegal character';
<<EOF>>                     return 'EOF';

/lex

/* operator associations and precedence */

%left '+' '-'
%left '*' '/'
%left '^'
%right '!'
%right '%'
%left UMINUS

%start program 

%% /* language grammar */

program 
	: list '\n' { return 'list:' + $1; }    
    | '\n'  { return 'list: newline'; }
    | error '\n' { return 'simple_list: error'; }
    | 'EOF' { return 'EOF'; } 
    | expressions { return $1; }
    ;
list
	: list1 { $$ = $1; }
    | list1 '&' { $$ = $1; }
    | list1 ';' { $$ = $1; }
    ;
list1
	: list1 '&&' newline_list list1 { $$ = andand ($1, $4); }
    | list1 '||' newline_list list1 { $$ = oror ($1, $4); }
    | list1 '&' list1 { $$ = and ($1, $4); }
    | list1 ';' list1 { $$ = seq_list ($1, $4); }
    | pipeline_command { $$ = $1; } 
    ;
pipeline_command 
	: pipeline { $$ = $1; } 
    | '!' pipeline { //$2.flags = 'CMD_INVERT_RETURN' :: $2.flags; 
    					$$ = $2; } 
    | time pipeline { warning('ignore time'); $$ = $2; } 
    | time '!' pipeline { warning('ignore time'); $$ = $3; } 
    | '!' time pipeline { warning('ignore time'); $$ = $3; } 
	;
pipeline
	: pipeline '|' newline_list pipeline { $$ = seq_cmd($1, $4, '|'); }
    | command { $$ = $1; }
    ;
time
	: 'time' { $$ = 'CMD_TIME_PIPELINE'; }
    | 'time' 'timeopt' { $$ = 'CMD_TIME_PIPELINE'; }
    ;
command
	: simple_command { $$ = simple_command($1); }
    /*
	| shell_command { $$ = $1; }
    | shell_command redirection_list {}
    | function_def {} 
    */
	;

simple_command
	:	simple_command_element { $$ = make_simple_command ($1); }
	|	simple_command simple_command_element
			{ $$ = make_simple_command ($2, $1); }
	;
simple_command_element
	: WORD  { $$.word = $1; $$.redirect = 0; }
	|	variable_assignment
			{ $$.word = $1; $$.redirect = 0; }
	|	redirection
			{ $$.redirect = $1; $$.word = 0; }
variable_assignment
	: WORD '=' WORD { $$ = assign($1,$2); }
    ;
redirection
	:	'>' WORD
			{
			  redir.filename = $2;
			  $$ = make_redirection (1, r_output_direction, redir);
			}
	|	'<' WORD
			{
			  redir.filename = $2;
			  $$ = make_redirection (0, r_input_direction, redir);
			}
	|	NUMBER '>' WORD
			{
			  redir.filename = $3;
			  $$ = make_redirection ($1, r_output_direction, redir);
			}
	|	NUMBER '<' WORD
			{
			  redir.filename = $3;
			  $$ = make_redirection ($1, r_input_direction, redir);
			}
	|	GREATER_GREATER WORD
			{
			  redir.filename = $2;
			  $$ = make_redirection (1, r_appending_to, redir);
			}
	|	NUMBER GREATER_GREATER WORD
			{
			  redir.filename = $3;
			  $$ = make_redirection ($1, r_appending_to, redir);
			}
	|	LESS_LESS WORD
			{
			  redir.filename = $2;
			  $$ = make_redirection (0, r_reading_until, redir);
			  redir_stack[need_here_doc++] = $$;
			}
	|	NUMBER LESS_LESS WORD
			{
			  redir.filename = $3;
			  $$ = make_redirection ($1, r_reading_until, redir);
			  redir_stack[need_here_doc++] = $$;
			}
	|	LESS_AND NUMBER
			{
			  redir.dest = $2;
			  $$ = make_redirection (0, r_duplicating_input, redir);
			}
	|	NUMBER LESS_AND NUMBER
			{
			  redir.dest = $3;
			  $$ = make_redirection ($1, r_duplicating_input, redir);
			}
	|	GREATER_AND NUMBER
			{
			  redir.dest = $2;
			  $$ = make_redirection (1, r_duplicating_output, redir);
			}
	|	NUMBER GREATER_AND NUMBER
			{
			  redir.dest = $3;
			  $$ = make_redirection ($1, r_duplicating_output, redir);
			}
	|	LESS_AND WORD
			{
			  redir.filename = $2;
			  $$ = make_redirection (0, r_duplicating_input_word, redir);
			}
	|	NUMBER LESS_AND WORD
			{
			  redir.filename = $3;
			  $$ = make_redirection ($1, r_duplicating_input_word, redir);
			}
	|	GREATER_AND WORD
			{
			  redir.filename = $2;
			  $$ = make_redirection (1, r_duplicating_output_word, redir);
			}
	|	NUMBER GREATER_AND WORD
			{
			  redir.filename = $3;
			  $$ = make_redirection ($1, r_duplicating_output_word, redir);
			}
	|	LESS_LESS_MINUS WORD
			{
			  redir.filename = $2;
			  $$ = make_redirection
			    (0, r_deblank_reading_until, redir);
			  redir_stack[need_here_doc++] = $$;
			}
	|	NUMBER LESS_LESS_MINUS WORD
			{
			  redir.filename = $3;
			  $$ = make_redirection
			    ($1, r_deblank_reading_until, redir);
			  redir_stack[need_here_doc++] = $$;
			}
	|	GREATER_AND '-'
			{
			  redir.dest = 0;
			  $$ = make_redirection (1, r_close_this, redir);
			}
	|	NUMBER GREATER_AND '-'
			{
			  redir.dest = 0;
			  $$ = make_redirection ($1, r_close_this, redir);
			}
	|	LESS_AND '-'
			{
			  redir.dest = 0;
			  $$ = make_redirection (0, r_close_this, redir);
			}
	|	NUMBER LESS_AND '-'
			{
			  redir.dest = 0;
			  $$ = make_redirection ($1, r_close_this, redir);
			}
	|	AND_GREATER WORD
			{
			  redir.filename = $2;
			  $$ = make_redirection (1, r_err_and_out, redir);
			}
	|	NUMBER LESS_GREATER WORD
			{
			  redir.filename = $3;
			  $$ = make_redirection ($1, r_input_output, redir);
			}
	|	LESS_GREATER WORD
			{
			  redir.filename = $2;
			  $$ = make_redirection (0, r_input_output, redir);
			}
	|	GREATER_BAR WORD
			{
			  redir.filename = $2;
			  $$ = make_redirection (1, r_output_force, redir);
			}
	|	NUMBER GREATER_BAR WORD
			{
			  redir.filename = $3;
			  $$ = make_redirection ($1, r_output_force, redir);
			}
	;
	


expressions    
    : e EOF
        { typeof console !== 'undefined' ? console.log($1) : print($1);
          return $1; }
    ;

e
    : e '+' e
        {$$ = $1+$3;}
    | e '-' e
        {$$ = $1-$3;}
    | e '*' e
        {$$ = $1*$3;}
    | e '/' e
        {$$ = $1/$3;}
    | e '^' e
        {$$ = Math.pow($1, $3);}
    | e '!'
        {{
          $$ = (function fact (n) { return n==0 ? 1 : fact(n-1) * n })($1);
        }}
    | e '%'
        {$$ = $1/100;}
    | '-' e %prec UMINUS
        {$$ = -$2;}
    | '(' e ')'
        {$$ = $2;}
    | NUMBER
        {$$ = Number(yytext);}
    | E
        {$$ = Math.E;}
    | PI
        {$$ = Math.PI;}
    ;

