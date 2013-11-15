require.config({
    //baseUrl: getAppRootURL() + '/js',    
    baseUrl: '.',
    "paths": {
        webida: '//' + document.cookie.replace(/(?:(?:^|.*;\s*)webida\.host\s*\=\s*([^;]*).*$)|^.*$/, "$1"),
//        webida: '//webida.js',
        underscore: 'js/lodash.min'        
        //bash: 'bash_grammar'
    }
});

function initAuth(webida, URI) {
    //temp (from IDE)       
    var CLIENT_ID = 'Zu1j2lUb9yM6UM3r';
    var AUTH_HTML = './auth.html';
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


