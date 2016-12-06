var DBSDM = DBSDM || {};

/**
 * Algorithm source http://stackoverflow.com/a/7616484/4705537
 */
DBSDM.Hash = (function(){
    var self = {};

    self.string = function(str) {
        var hash = 0, i, chr, len;
        if (str.length === 0) return hash;
        for (i = 0, len = str.length; i < len; i++) {
            chr   = str.charCodeAt(i);
            hash  = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash >>> 0; // unsigned
    };

    self.object = function(obj) {
        return self.string(JSON.stringify(obj));
    };

    return self;
})();