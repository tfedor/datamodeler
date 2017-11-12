var DBSDM = DBSDM || {};
DBSDM.View = DBSDM.View ||{};

DBSDM.View.RelationLeg = (function(){
    var ns = DBSDM;
    var Enum = ns.Enums;

    function RelationLeg(canvas, model, control) {
        this._canvas = canvas;
        this._model = model;
        this._control = control;

        // dom
        this._g = null;
        this._anchor = null;
        this._line = null;
        this._lineControl = null;
        this._name = null;
        this._comment = null;

        this._cp = [];

        this._cardinality = null;
        this._identifying = null;
    }

    RelationLeg.prototype.draw = function() {
        this._g = ns.Element.g();

        this._comment = ns.Element.title();

        this._buildLine();
        this._buildAnchor();

        this._g = ns.Element.g(
            this._comment,
            this._lineControl,
            this._line,
            this._anchor
        );

        this.updatePoints();
        this.updateType();

        ns.Element.attr(this._g, {class: "leg"});

        this.updateComment();

        if (this._model.incorrect) {
            this.markIncorrect();
        }

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
            ns.Diagram.getSharedElement('Relation.AnchorControl', {class: "anchor"})
        );
        this.updateAnchorType();

        this._model.setAnchorOffset(ns.Consts.DefaultAnchorOffset);
    };

    RelationLeg.prototype.updateAnchorType = function() {
        if (this._model.getCardinality() == Enum.Cardinality.MANY) {
            if (this._cardinality == null) {
                this._cardinality = this._anchor.appendChild(ns.Diagram.getSharedElement('Relation.AnchorMany'));
            }
        } else {
            if (this._cardinality != null) {
                this._cardinality.remove();
                this._cardinality = null;
            }
        }

        if (this._model.isIdentifying()) {
            if (this._identifying == null) {
                this._identifying = this._anchor.appendChild(ns.Diagram.getSharedElement('Relation.AnchorIdentifying'));
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
            strokeLinejoin: "round"
        });
        this._lineControl = ns.Element.el("polyline", {
            points: "0 0 0 0",
            fill: "none",
            stroke: "none",
            strokeWidth: 10,
            strokeLinecap: "butt",
            strokeLinejoin: "round",
            class: "line"
        });
    };

    RelationLeg.prototype._getPointsString = function(points) {
        var a = this._model.getAnchor();
        return a.x+" "+a.y+" "+ points
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
        var i;
        if (this._cp.length != points.length-2) {
            this._clearControlPoints();
            for (i=1; i<points.length-1; i++) {
                this.buildControlPoint(i, points[i])
            }
        } else {
            for (i=1; i<points.length-1; i++) {
                ns.Element.attr(this._cp[i-1], points[i]);
            }
        }

        this.updateNamePosition();
    };

    RelationLeg.prototype.updateType = function() {
        ns.Element.attr(this._line, {
            strokeDasharray: (this._model.isOptional() ? 5 : null)
        });
    };

    // select
    RelationLeg.prototype.select = function() {
        this._g.classList.add("selected");
    };
    RelationLeg.prototype.allow = function() {
        this._g.classList.add("allowed");
    };
    RelationLeg.prototype.mark = function() {
        this._g.classList.add("marked");
    };
    RelationLeg.prototype.clearSelectionClasses = function() {
        this._g.classList.remove("selected");
        this._g.classList.remove("allowed");
        this._g.classList.remove("marked");
    };

    RelationLeg.prototype.markIncorrect = function() {
        this._g.classList.add("incorrect");
    };
    RelationLeg.prototype.markCorrect = function() {
        this._g.classList.remove("incorrect");
    };

    // control points

    RelationLeg.prototype.buildControlPoint = function(index, p) {
        var cp = this._g.appendChild(
            ns.Diagram.getSharedElement("Relation.CP", {
                x: p.x, y: p.y,
                class: "cp"
            })
        );

        this._cp.splice(index-1, 0, cp);
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

    RelationLeg.prototype._clearControlPoints = function() {
        for (var i=0;i <this._cp.length; i++) {
            this._cp[i].remove();
        }
        this._cp = [];
    };

    // name
    RelationLeg.prototype.showName = function() {
        if (this._name) { return; }

        var that = this;
        var model = this._model;
        var name = new ns.View.EditableText(this._canvas, 0, 0, {},
            function()     { return model.getName() || "relation"; },
            function(name) { model.setName(name); }
        );
        name.setEmptyHandler(function(){
            model.setName(null);
            that.hideName();
        });

        this._name = name.getTextDom();
        this.updateNamePosition();
        this._g.appendChild(this._name);
    };

    RelationLeg.prototype.hideName = function() {
        if (!this._name) { return; }
        this._name.remove();
        this._name = null;
    };

    RelationLeg.prototype.toggleName = function() {
        if (this._name) {
            this.hideName();
        } else {
            this.showName();
        }
    };

    RelationLeg.prototype.updateNamePosition = function() {
        if (!this._name) { return; }
        var nameOffset = 10; // TODO

        var A = this._model.getAnchor();
        var P = this._model.getPoint(0);

        var textAnchor = "start";
        var baseline = "text-after-edge";
        var dx = 0;
        var dy = 0;
        switch(A.edge) {
            case Enum.Edge.TOP:    dy = -nameOffset; break;
            case Enum.Edge.RIGHT:  dx =  nameOffset; break;
            case Enum.Edge.BOTTOM: dy =  nameOffset; baseline = "text-before-edge"; break;
            case Enum.Edge.LEFT:   dx = -nameOffset; textAnchor = "end"; break;
        }

        ns.Element.attr(this._name, {
            x: P.x + dx,
            y: P.y + dy,
            dominantBaseline: baseline,
            textAnchor: textAnchor
        });
    };

    // comment

    RelationLeg.prototype.updateComment = function() {
        if (!this._comment) { return; }

        let comment = this._model.getComment();
        this._comment.innerHTML = comment;

        if (comment) {
            this._g.classList.add("hasComment");
        } else {
            this._g.classList.remove("hasComment");
        }
    };

    return RelationLeg;
})();
