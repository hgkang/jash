
function timedCount() {   
    postMessage('I am the worker: finished');
}

//for(var i=0; i<1000; i++) { console.log(i);}
setTimeout(timedCount, 400);


