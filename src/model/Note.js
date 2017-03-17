var DBSDM = DBSDM || {};
DBSDM.Model = DBSDM.Model ||{};

DBSDM.Model.Note = (function(){
    var ns = DBSDM;
    var Enum = ns.Enums;
    var Consts = ns.Consts;

    function Note() {
        ns.Model.CanvasObject.call(this);
        this.setSize(Consts.NoteDefaultWidth, Consts.NoteDefaultHeight);
        this._text = "Click to edit";
    }
    Note.prototype = Object.create(ns.Model.CanvasObject.prototype);
    Note.prototype.constructor = Note;

    Note.prototype.getText = function(text) {
        return this._text;
    };
    Note.prototype.setText = function(text) {
        this._text = text;
    };

    // Data representation

    Note.prototype.toString = function() {
        return "Note: "+this._text + "\n\n";
    };

    Note.prototype.getExportData = function(properties) {
        var data = {
            text: this._text
        };

        Object.assign(data, Note.prototype.getExportData.call(this, properties));

        return data;
    };

    Note.prototype.import = function(data) {
        if (data.text) { this.setText(data.text); }
        Note.prototype.import.call(this, data);
    };

    return Note;
})();
