var DBSDM = DBSDM || {};
DBSDM.View = DBSDM.View ||{};

DBSDM.View.Relation = (function(){
    var ns = DBSDM;

    /**
     * Relation clue shown when relation is being created
     */
    function RelationClue(canvas, source) {
        this._canvas = canvas;
        this._source = source;

        this._dom = null;
    }

    RelationClue.prototype.draw = function(initX, initY) {
        this._dom = ns.Element.el("line", {
            x1: initX, y1: initY,
            x2: initX, y2: initY,
            stroke: "black",
            strokeWidth: 0.8,
            strokeDasharray: 2,
            pointerEvents: "none"
        });
        this._canvas.svg.appendChild(this._dom);
    };
    RelationClue.prototype.move = function(x, y) {
        if (!this._dom) { return; }
        console.log("move");
        ns.Element.attr(this._dom, { x2: x, y2: y });
    };

    RelationClue.prototype.clear = function() {
        if (!this._dom) { return; }
        this._dom.remove();
        this._dom = null;
    };

    return RelationClue;
})();
