var DBSDM = DBSDM || {};
DBSDM.View = DBSDM.View ||{};

DBSDM.View.Relation = (function(){
    var ns = DBSDM;

    function Relation(canvas, model) {
        this._canvas = canvas;
        this._model = model;

        this._createSharedElements();

        // DOM
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
        var fragment = document.createDocumentFragment();

        var g = fragment.appendChild(ns.Element.g(
            sourceLegDomFragment,
            targetLegDomFragment
        ));
        ns.Element.attr(g, {class: "relg"});

        g.addEventListener("mouseenter", function() {
            console.log("over");
        });

        // build middle point
        this._middle = g.appendChild( this._canvas.getSharedElement("Relation.MiddlePoint") );
        this._canvas.svg.appendChild(fragment);

        this._middle.addEventListener("contextmenu", function(e) { ns.Menu.attach(null, "relationMiddle"); }); // TODO
        g.addEventListener("contextmenu", function(e) { ns.Menu.attach(null, "relation"); }); // TODO
    };

    Relation.prototype.redraw = function() {
        ns.Element.attr(this._middle, this._model.getMiddlePoint());
    };

    Relation.prototype.clear = function() {
        this._middle.remove();
        this._middle = null;
    };

    return Relation;
})();
