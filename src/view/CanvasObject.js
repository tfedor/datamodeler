var DBSDM = DBSDM || {};
DBSDM.View = DBSDM.View ||{};

DBSDM.View.CanvasObject = (function(){
    var ns = DBSDM;

    function CanvasObject(canvas, model, control) {
        this._canvas = canvas;
        this._model = model;
        this._control = control;

        this._dom = null;
        this._comment = null;
        this._controls = null;
    }

    CanvasObject.prototype.getDom = function() {
        return this._dom;
    };

    CanvasObject.prototype.redraw = function() {
        ns.Element.attr(this._dom, this._model.getTransform());
    };

    CanvasObject.prototype.remove = function() {
        this._dom.remove();
    };

    CanvasObject.prototype.showControls = function() {
        this._controls = ns.Element.g(
            ns.Diagram.getSharedElement("Entity.ControlRectangle"),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-nw", x:      0, y:      0 }),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-n",  x:  "50%", y:      0 }),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-ne", x: "100%", y:      0 }),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-e",  x: "100%", y:  "50%" }),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-se", x: "100%", y: "100%" }),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-s",  x:  "50%", y: "100%" }),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-sw", x:      0, y: "100%" }),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-w",  x:      0, y:  "50%" })
        );
        ns.Element.attr(this._controls, { class: "e-control" });
        this._dom.appendChild(this._controls);
    };

    CanvasObject.prototype.hideControls = function() {
        this._controls.remove();
    };

    // order

    CanvasObject.prototype.toBack = function() {
        var first = this._dom.parentNode.querySelector(":first-child");
        if (first == this._dom) { return; }
        this._dom.parentNode.insertBefore(this._dom, first);
    };
    CanvasObject.prototype.toFront = function() {
        this._dom.parentNode.insertBefore(this._dom, null);
    };

    // comment

    CanvasObject.prototype.updateComment = function() {
        if (!this._comment) { return; }

        let comment = this._model.getComment();
        this._comment.innerHTML = comment;

        if (comment) {
            this._dom.classList.add("hasComment");
        } else {
            this._dom.classList.remove("hasComment");
        }
    };

    return CanvasObject;
})();
