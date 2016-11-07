var DBSDM = DBSDM || {};
DBSDM.View = DBSDM.View ||{};

DBSDM.View.Relation = (function(){
    var ns = DBSDM;

    function Relation(canvas, model, control) {
        this._canvas = canvas;
        this._model = model;
        this._control = control;

        this._createSharedElements();

        // DOM
        this._g = null;
        this._middle = null;
    }

    Relation.prototype._createSharedElements = function() {
        if (this._canvas.hasSharedElement("Relation.MiddlePoint")) { return; }

        this._canvas.createSharedElement("Relation.MiddlePoint",
            ns.Element.rect(0, 0, 6, 6, {
                fill: "black",
                strokeWidth: 1,
                stroke: "black",
                shapeRendering: "crispEdges",
                transform: "translate(-3,-3)",
                pointerEvents: "visible"
            })
        );
    };

    Relation.prototype.draw = function(sourceLegDomFragment, targetLegDomFragment) {
        this._middle = this._canvas.getSharedElement("Relation.MiddlePoint", { class: "cp middle" });

        this._g = ns.Element.g(
            sourceLegDomFragment,
            targetLegDomFragment,
            this._middle
        );
        this._g.classList.add("rel");

        this._canvas.svg.appendChild(this._g);

        var that = this;
        this._middle.addEventListener("mousedown", function(e) { that._canvas.Mouse.down(e, that._control); });

        this._g.addEventListener("contextmenu", function(e) {
            if (e.target.classList.contains("middle")) {
                ns.Menu.attach(that._control, "relationMiddle");
            }

            ns.Menu.attach(that._control, "relation");
        });
    };

    Relation.prototype.redraw = function() {
        ns.Element.attr(this._middle, this._model.getMiddlePoint());
    };

    Relation.prototype.toBack = function() {
        console.log(this._g.parentNode);
        var first = this._g.parentNode.querySelector("g.rel");
        if (first == this._g) { return; }
        this._canvas.svg.insertBefore(this._g, first);
    };
    Relation.prototype.toFront = function() {
        this._canvas.svg.appendChild(this._g);
    };

    Relation.prototype.clear = function() {
        this._g.remove();
        this._g = null;
        this._middle = null;
    };

    return Relation;
})();
