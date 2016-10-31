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

        // legs
        fragment.appendChild(sourceLegDomFragment);
        fragment.appendChild(targetLegDomFragment);

        // build middle point
        this._middle = fragment.appendChild( this._canvas.getSharedElement("Relation.MiddlePoint") );
        this._canvas.svg.appendChild(fragment);
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
