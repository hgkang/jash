var webidaHost = decodeURIComponent(
    document.cookie.replace(/(?:(?:^|.*;\s*)webida\.host\s*\=\s*([^;]*).*$)|^.*$/, '$1')
);

require.config({
    //baseUrl: getAppRootURL() + '/js',    
    baseUrl: '.',
    "paths": {
        'webida-lib' : '//library.' + webidaHost + '/webida/src',
        'appConfig' : '//' + webidaHost,
        'underscore' : 'js/lodash.min'
        //bash: 'bash_grammar'
    }
});

function initAuth(webida, URI, appConfig) {
    //temp (from IDE)       
    var CLIENT_ID = appConfig.clientID;
    var AUTH_HTML = 'auth.html';
    function getRedirectUrl() {
        var cur = new URI(location.href);
        var authRel = new URI(AUTH_HTML);
        var redirectUrl = authRel.absoluteTo(cur);
        redirectUrl.query('');
        return redirectUrl.toString();
    }    
    webida.auth.initAuth(CLIENT_ID, getRedirectUrl());    
    //webida.auth.initAuth(CLIENT_ID);    
}


