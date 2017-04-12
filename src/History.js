var DBSDM = DBSDM || {};

/**
 * Canvas controller
 * Creates and handles canvas which is used to manipulate other elements
 */
DBSDM.History = (function() {
    var ns = DBSDM;

    function History() {
        this._undolog = [];
        this._redolog = [];
        this._last = null;
        this._transaction = [];
        this._level = 0;

        this._canRecord = true;
        this._paused = false;
    }

    History.prototype.clear = function () {
        this._undolog = [];
        this._redolog = [];
        this._last = null;
        this._transaction = [];
        this._level = 0;
    };

    // recording control

    History.prototype.pause = function() {
        this._paused = true;
    };

    History.prototype.resume = function() {
        this._paused = false;
    };

    // transaction control

    History.prototype.begin = function() {
        if (!this._canRecord || this._paused) { return; }

        if (this._level++ == 0) {
            this._transaction = [];
        }
    };
    History.prototype.commit = function() {
        if (!this._canRecord || this._paused) { return; }
        if (--this._level == 0) {
            this._undolog.push([null, this._transaction]);
            this._redolog = [];
            this._transaction = [];
        }
    };

    // recording

    History.prototype.record = function(context, name, from, to, stackable) {
        if (!this._canRecord || this._paused) { return; }
        stackable = (typeof stackable === "undefined" || stackable);

        if (stackable && this._last && this._last[0] === context && this._last[1] === name) {
            this._last[3] = to; // stack changes
        } else {
            this._last = [context, name, from, to];
            if (this._level > 0) {
                this._transaction.push(this._last);
            } else {
                this._undolog.push(this._last);
                this._redolog = [];
            }
        }
    };

    History.prototype.redo = function() {
        var entry = this._redolog.pop();
        if (!entry) { return; }

        this._undolog.push(entry);
        this._last = entry;

        this._canRecord = false;
        if (!entry[0]) {
            entry[1].forEach(function(part) {
                part[0].playback(part[1], part[2], part[3]);
            });
        } else {
            entry[0].playback(entry[1], entry[2], entry[3]);
        }
        this._canRecord = true;
    };

    History.prototype.undo = function() {
        var entry = this._undolog.pop();
        if (!entry) { return; }
        this._redolog.push(entry);
        this._last = (this._undolog.length != 0 ? this._undolog[this._undolog.length - 1] : null);

        this._canRecord = false;
        if (!entry[0]) {
            for (var i=entry[1].length-1; i>=0; i--) {
                var part = entry[1][i];
                part[0].playback(part[1], part[3], part[2]);
            }
        } else {
            entry[0].playback(entry[1], entry[3], entry[2]);
        }
        this._canRecord = true;
    };

    // state

    History.prototype.hasUndo = function () {
        return this._undolog.length !== 0;
    };

    History.prototype.hasRedo = function () {
        return this._redolog.length !== 0;
    };

    return History;
})();