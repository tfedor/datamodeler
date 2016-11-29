var DBSDM = DBSDM || {};

DBSDM.Fullscreen = (function() {
    var self = {};

    self.lastCanvas = null;

    self.inFullscreen = function() {
        return (self.fullscreenElement() != null);
    };

    self.enabled = function() {
        if ("fullscreenEnabled" in document) { return document.fullscreeEnabled; }
        if ("webkitFullscreenEnabled" in document) { return document.webkitFullscreenEnabled; }
        if ("mozFullScreenEnabled" in document) { return document.mozFullScreenEnabled; }
        if ("msFullscreenEnabled" in document) { return document.msFullscreenEnabled; }
        return false;
    };

    self.fullscreenElement = function() {
        if ("fullscreenElement" in document) { return document.fullscreenElement; }
        if ("webkitFullscreenElement" in document) { return document.webkitFullscreenElement; }
        if ("mozFullScreenElement" in document) { return document.mozFullScreenElement; }
        if ("msFullscreenElement" in document) { return document.msFullscreenElement; }
        return null;
    };

    self.request = function(element) {
        if ("requestFullscreen" in element) { element.requestFullscreen(); }
        if ("webkitRequestFullscreen" in element) { element.webkitRequestFullscreen(); }
        if ("mozRequestFullScreen" in element) { element.mozRequestFullScreen(); }
        if ("msRequestFullscreen" in element) { element.msRequestFullscreen(); }
    };

    self.exit = function() {
        if ("exitFullscreen" in document) { document.exitFullscreen(); }
        if ("webkitExitFullscreen" in document) { document.webkitExitFullscreen(); }
        if ("mozCancelFullScreen" in document) { document.mozCancelFullScreen(); }
        if ("msExitFullscreen" in document) { document.msExitFullscreen(); }
    };

    self.toggle = function(element, canvas) {
        self.lastCanvas = canvas;
        if (self.fullscreenElement() != element) {
            self.request(element);
        } else {
            self.exit();
        }
    };

    self.setEvents = function(onchange, onerror) {
        if ("onfullscreenchange" in document) {
            if (onchange) { document.onfullscreenchange = onchange; }
            if (onerror)  { document.onfullscreenerror  = onerror; }
        }
        if ("onwebkitfullscreenchange" in document) {
            if (onchange) { document.onwebkitfullscreenchange = onchange; }
            if (onerror)  { document.onwebkitfullscreenerror  = onerror; }
        }
        if ("onmozfullscreenchange" in document) {
            if (onchange) { document.onmozfullscreenchange = onchange; }
            if (onerror)  { document.onmozfullscreenerror  = onerror; }
        }
        if ("onmsfullscreenchange" in document) {
            if (onchange) { document.onmsfullscreenchange = onchange; }
            if (onerror)  { document.onmsfullscreenerror  = onerror; }
        }
    };

    return self;
}());
