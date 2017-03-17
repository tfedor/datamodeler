var DBSDM = DBSDM || {};
DBSDM.Model = DBSDM.Model ||{};

DBSDM.Model.Note = (function(){
    var ns = DBSDM;
    var Consts = ns.Consts;

    var Super = ns.Model.CanvasObject;

    function Note() {
        Super.call(this);
        this.setSize(Consts.NoteDefaultWidth, Consts.NoteDefaultHeight);
        this._text = "Click to edit";
    }
    Note.prototype = Object.create(Super.prototype);
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
        Object.assign(data, Super.prototype.getExportData.call(this, properties));

        return data;
    };

    Note.prototype.import = function(data) {
        if (data.text) { this.setText(data.text); }
        Super.prototype.import.call(this, data);
    };

    return Note;
})();
