var DBSDM = DBSDM || {};
DBSDM.View = DBSDM.View ||{};

DBSDM.View.RelationLeg = (function(){
    var ns = DBSDM;
    var Enum = ns.Enums;

    function RelationLeg(canvas, model) {
        this._canvas = canvas;
        this._model = model;

        this._createSharedElements();

        // dom
        this._anchor = null;
        this._line = null;
    }

    RelationLeg.prototype._createSharedElements = function() {
        if (this._canvas.hasSharedElement("Relation.AnchorBase")) { return; }

        this._canvas.createSharedElement("Relation.AnchorControl",
            ns.Element.rect(-0.5,-7.5, 10.5,16.5, {
                fill: "none",
                stroke: "none"
            })
        );

        this._canvas.createSharedElement("Relation.AnchorBase",
            ns.Element.el("polyline", {
                points: "0.5,0.5, 0.5,-10.5",
                fill: 'none',
                stroke:'black',
                strokeWidth: 1
            })
        );

        this._canvas.createSharedElement("Relation.AnchorMany",
            ns.Element.el("polyline", {
                points: "-7.5,0.5, 0.5,-10.5, 7.5,0.5",
                fill: 'none',
                stroke:'black',
                strokeWidth: 1
            })
        );

        this._canvas.createSharedElement("Relation.AnchorIdentifying",
            ns.Element.el("polyline", {
                points: "-7.5,-10.5, 7.5,-10.5",
                fill: 'none',
                stroke:'black',
                strokeWidth: 1
            })
        );
    };

    RelationLeg.prototype.draw = function() {
        this._anchor = this._buildAnchor();
        this._line = ns.Element.el("polyline", {
            points: "0 0 0 0",
            fill: "none",
            stroke: "black",
            strokeWidth: 1
        });
        this.updatePoints();
        this.updateType();
    };

    RelationLeg.prototype.getDomFragment = function() {
        var fragment = document.createDocumentFragment();
        fragment.appendChild(this._anchor);
        fragment.appendChild(this._line);
        return fragment;
    };

    // anchor

    RelationLeg.prototype._buildAnchor = function() {
        var g = ns.Element.g(
            this._canvas.getSharedElement('Relation.AnchorControl'),
            this._canvas.getSharedElement('Relation.AnchorBase')
        );
        if (this._model.getCardinality() == Enum.Cardinality.MANY) {
            g.appendChild(this._canvas.getSharedElement('Relation.AnchorMany'));
        }
        if (this._model.isIdentifying()) {
            g.appendChild(this._canvas.getSharedElement('Relation.AnchorIdentifying'));
        }

        ns.Element.attr(g, {
            pointerEvents: "none"
        });

        this._model.setAnchorOffset(11);

        return g;
    };

    RelationLeg.prototype.updateAnchorPosition = function() {
        var anchor = this._model.getAnchor();
        ns.Element.transform(this._anchor, [anchor.x, anchor.y], [anchor.edge*90, 0, 0]);
    };

    // line

    RelationLeg.prototype._getPointsString = function() {
        return this._model.getPoints()
            .map(function(p) { return [p.x, p.y] })
            .reduce(function(a, b) { return a.concat(b) })
            .join(" ");
    };

    RelationLeg.prototype.updatePoints = function() {
        ns.Element.attr(this._line, {
            points: this._getPointsString()
        });
    };

    RelationLeg.prototype.updateType = function() {
        ns.Element.attr(this._line, {
            strokeDasharray: (this._model.isOptional() ? 5 : null)
        });
    };

    // clear
    RelationLeg.prototype.clear = function() {
        this._anchor.remove();
        this._line.remove();
    };

    return RelationLeg;
})();
