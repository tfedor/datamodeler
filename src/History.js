var DBSDM = DBSDM || {};

/**
 * Canvas controller
 * Creates and handles canvas which is used to manipulate other elements
 */
DBSDM.History = (function() {
    var ns = DBSDM;

    function History() {
        this.undolog = [];
        this.redolog = [];
        this._last = null;
        this._canRecord = true;
    }

    History.prototype.record = function(context, name, from, to, stackable) {
        if (!this._canRecord) { return; }
        stackable = (typeof stackable === "undefined" || stackable);

        if (stackable && this._last && this._last[0] === context && this._last[1] === name) {
            this._last[3] = to; // stack changes
        } else {
            this._last = [context, name, from, to];
            this.undolog.push(this._last);
            this.redolog = [];
        }

        console.log(this.undolog, this.redolog);
    };

    History.prototype.redo = function() {
        var entry = this.redolog.pop();
        if (!entry) { return; }

        this.undolog.push(entry);
        this._last = entry;

        this._canRecord = false;
        entry[0].playback(entry[1], entry[2], entry[3]);
        this._canRecord = true;
    };

    History.prototype.undo = function() {
        var entry = this.undolog.pop();
        if (!entry) { return; }
        this.redolog.push(entry);
        this._last = (this.undolog.length != 0 ? this.undolog[this.undolog.length - 1] : null);

        this._canRecord = false;
        entry[0].playback(entry[1], entry[3], entry[2]);
        this._canRecord = true;
    };

    return History;
})();