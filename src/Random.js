var DBSDM = DBSDM || {};

DBSDM.Random = {
    string: function(length) {
        var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        var str = "";
        for (var i=0; i<length; i++) {
            str += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return str;
    },

    id: function(length) {
        var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        var str = chars.charAt(Math.floor(Math.random() * chars.length));
        str += DBSDM.Random.string(length - 1);
        return str;
    }
};