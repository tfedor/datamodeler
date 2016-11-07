var DBSDM = DBSDM || {};
DBSDM.View = DBSDM.View ||{};

DBSDM.View.RelationLeg = (function(){
    var ns = DBSDM;
    var Enum = ns.Enums;

    function RelationLeg(canvas, model, control) {
        this._canvas = canvas;
        this._model = model;
        this._control = control;

        this._createSharedElements();

        // dom
        this._g = null;
        this._anchor = null;
        this._line = null;
        this._lineControl = null;

        this._cp = [];

        this._cardinality = null;
        this._identifying = null;
    }

    RelationLeg.prototype._createSharedElements = function() {
        if (this._canvas.hasSharedElement("Relation.AnchorBase")) { return; }

        this._canvas.createSharedElement("Relation.AnchorControl",
            ns.Element.rect(-9.5,-13.5, 18,15, {
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

        this._canvas.createSharedElement("Relation.CP",
            ns.Element.rect(0, 0, 6, 6, {
                fill: "none",
                strokeWidth: 1,
                stroke: "black",
                shapeRendering: "crispEdges",
                transform: "translate(-3,-3)"
            })
        );
    };

    RelationLeg.prototype.draw = function() {
        this._buildLine();
        this._buildAnchor();

        this._g = ns.Element.g(
            this._lineControl,
            this._line,
            this._anchor
        );
        ns.Element.attr(this._g, {class: "leg"});

        var that = this;
        this._g.addEventListener("mousedown", function(e) {
            var className = e.target.getAttribute("class");

            var params = null;
            if (className == "anchor" || className == "line") {
                params = {
                    action: className
                }
            }
            if (className == "cp") {
                params = { action: className, index: 1 + that.getCpIndex(e.target) };
            }

            if (params != null) {
                that._canvas.Mouse.down(e, that._control, params);
            }
        });

        this._g.addEventListener("contextmenu", function(e){
            var cls = e.target.getAttribute("class");
            if (cls == "cp") {
                ns.Menu.attach(that._control, "relationCP", {index: 1 + that.getCpIndex(e.target)});
            }
            ns.Menu.attach(that._control, "relationLeg");
        });
    };

    RelationLeg.prototype.getDom = function() {
        return this._g;
    };

    RelationLeg.prototype.onEntityAttached = function() {
        this._g.classList.add("attached");
    };

    // anchor

    RelationLeg.prototype._buildAnchor = function() {
        this._anchor = ns.Element.g(
            this._canvas.getSharedElement('Relation.AnchorControl', {class: "anchor"}),
            this._canvas.getSharedElement('Relation.AnchorBase')
        );
        this.updateAnchorType();

        this._model.setAnchorOffset(11);
    };

    RelationLeg.prototype.updateAnchorType = function() {
        if (this._model.getCardinality() == Enum.Cardinality.MANY) {
            if (this._cardinality == null) {
                this._cardinality = this._anchor.appendChild(this._canvas.getSharedElement('Relation.AnchorMany'));
            }
        } else {
            if (this._cardinality != null) {
                this._cardinality.remove();
                this._cardinality = null;
            }
        }

        if (this._model.isIdentifying()) {
            if (this._identifying == null) {
                this._identifying = this._anchor.appendChild(this._canvas.getSharedElement('Relation.AnchorIdentifying'));
            }
        } else {
            if (this._identifying != null) {
                this._identifying.remove();
                this._identifying = null;
            }
        }
    };

    RelationLeg.prototype.updateAnchorPosition = function() {
        var anchor = this._model.getAnchor();
        ns.Element.transform(this._anchor, [anchor.x, anchor.y], [anchor.edge*90, 0, 0]);
    };

    // line

    RelationLeg.prototype._buildLine = function() {
        this._line = ns.Element.el("polyline", {
            points: "0 0 0 0",
            fill: "none",
            stroke: "black",
            strokeWidth: 1,
            strokeLinejoin: "miter"
        });
        this._lineControl = ns.Element.el("polyline", {
            points: "0 0 0 0",
            fill: "none",
            stroke: "none",
            strokeWidth: 10,
            strokeLinecap: "butt",
            strokeLinejoin: "miter",
            class: "line"
        });

        this.updatePoints();
        this.updateType();
    };

    RelationLeg.prototype._getPointsString = function(points) {
        return points
            .map(function(p) { return [p.x, p.y] })
            .reduce(function(a, b) { return a.concat(b) })
            .join(" ");
    };

    RelationLeg.prototype.updatePoints = function() {
        var points = this._model.getPoints();
        var pointsString = this._getPointsString(points);
        ns.Element.attr(this._line, { points: pointsString });
        ns.Element.attr(this._lineControl, { points: pointsString });

        // update control points
        for (var i=1; i<points.length-1; i++) {
            ns.Element.attr(this._cp[i-1], points[i]);
        }
    };

    RelationLeg.prototype.updateType = function() {
        ns.Element.attr(this._line, {
            strokeDasharray: (this._model.isOptional() ? 5 : null)
        });
    };

    // control points
    RelationLeg.prototype.buildControlPoint = function(index, p) {
        var cp = this._g.appendChild(
            this._canvas.getSharedElement("Relation.CP", {
                x: p.x, y: p.y,
                class: "cp"
            })
        );

        this._cp.splice(index-1, 0, cp);
        this.updatePoints();
    };

    RelationLeg.prototype.getCpIndex = function(cp) {
        for (var index = 0; index < this._cp.length; index++) {
            if (this._cp[index] == cp) {
                return index
            }
        }
        return -1;
    };

    RelationLeg.prototype.removeControlPoint = function(index) {
        this._cp[index].remove();
        this._cp.splice(index, 1);
    };

    RelationLeg.prototype.clearControlPoints = function() {
        for (var i=0;i <this._cp.length; i++) {
            this._cp[i].remove();
        }
        this._cp = [];
    };

    // clear
    RelationLeg.prototype.clear = function() {
        this._g.remove();
    };

    return RelationLeg;
})();
