
bash2.yy.Node = function (kind, data) {
    this.kind = kind;
    this.data = data;
};

require(['js/interpreter'], function(Interp) {     
    function interpreter (input, terminal) { 
        var absyn = bash2.parse(input);
        var iter = Interp.get_iter(terminal);
        iter(function() {}, absyn);
    }
    
    (function($) {
        $.fn.wash = function(interp, options) {
            // 이미 wash 엘리먼트에 터미널 만들어져 있으면 그놈 사용
            if ($('body').data('wash')) { return $('body').data('wash').terminal; }
            
            // 없으면 wash라는 터미널 클래스 만들기
            this.addClass('wash');
            options = options || {};
            interp = interp || function(command, term) { term.echo("you don't set interp for wash"); };
            
            var settings = { name: 'wash', height: 450, enabled: true, greetings: 'Welcome to "wash" world' };
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
        $('#wash').wash(interpreter, { prompt: '/' + '> '});
    });
});





