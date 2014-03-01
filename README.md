x265js
======

GazeJS project utilizes [x265js](http://x265js.googlecode.com) to implement JavaScript bindings for open source x265js
###Installation
``` bash
npm install gazejs
```
###How to use
``` bash
var gazejs = require("gazejs")
var eyeTracker = gazejs.createEyeTracker(gazejs.TOBII_REX);
var listener = {
    onStart:function(){
        console.log("OnStart");
    },
    onStop:function(){
        console.log("OnStop");
    },
    onError:function(error){
        console.log(error);
    },
    onGazeData:function(gazeData){
        console.log(gazeData);
    }
};

eyeTracker.init();
eyeTracker.setListener(listener);

log.info("Library version: "+eyeTracker.getLibraryVersion());
log.info("Model name: "+eyeTracker.getModelName());

eyeTracker.start();

/*Stop eye tracking after 20 seconds*/
setTimeout(function(){
    eyeTracker.release();
},20000);

```
