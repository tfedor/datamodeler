var DBSDM = DBSDM || {};
DBSDM.View = DBSDM.View ||{};

DBSDM.View.Note = (function(){
    var ns = DBSDM;

    var Super = ns.View.CanvasObject;

    function Note(canvas, model, control) {
        Super.call(this, canvas, model, control);
        this._bg = null;
        this._text = null;
    }
    Note.prototype = Object.create(Super.prototype);
    Note.prototype.constructor = Note;

    Note.prototype.getMinimalSize = function() {
        var div = document.createElement("div");
        div.classList.add("note-content-helper");
        div.style.whiteSpace = "pre";

        var fontSize = this._text.getFontSize(false);
        if (fontSize) {
            div.style.fontSize = fontSize;
        }
        div.textContent = this._model.getText();

        document.body.appendChild(div);
        var rect = div.getBoundingClientRect();

        document.body.removeChild(div);

        return {
            width: rect.width + ns.Consts.NotePadding*2,
            height: rect.height + ns.Consts.NotePadding*2
        };
    };

    /**
     * Create Note
     */
    Note.prototype.create = function() {
        var transform = this._model.getTransform();
        this._dom = ns.Element.el("svg", transform);
        this._dom.style.overflow = "visible";

        this._bg = this._dom.appendChild(ns.Diagram.getSharedElement("Note.Bg"));
        this._canvas.svg.appendChild(this._dom);

        var that = this;

        this._text = new ns.View.EditableLongText(this._canvas,
            ns.Consts.NotePadding, ns.Consts.NotePadding - 2, // -2 due to weird positioning in svg text
            { class: "note-content" },
            function() { return that._model.getText(); },
            function(value) { that._control.setText(value); }
        );
        this._text.setSizeHandler(function(){
            var rect = that._bg.getBoundingClientRect();
            return {
                width: rect.width - 2*ns.Consts.NotePadding,
                height: rect.height - 2*ns.Consts.NotePadding
            };
        });
        this._dom.appendChild(this._text.getTextDom());

        this.defaultMark();

        this._comment = this._dom.appendChild(ns.Element.title());
        this.updateComment();

        this._dom.addEventListener("mousedown", function(e) { that._canvas.Mouse.down(e, that._control); });
        this._dom.addEventListener("contextmenu", function() { ns.Menu.attach(that._control, "note"); });
    };

    Note.prototype.edit = function() {
        this._text.showInput();
    };

    Note.prototype.show = function() {
        this._dom.style.display='block';
    };
    Note.prototype.hide = function() {
        this._dom.style.display='none';
    };

    Note.prototype.defaultMark = function() {
        if (this._model.incorrect) {
            ns.Element.attr(this._bg, {href: "#Note.Bg.Incorrect"});
        } else {
            ns.Element.attr(this._bg, {href: "#Note.Bg"});
        }
    };

    return Note;
})();
