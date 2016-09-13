var Relation = (function(){

    function Relation(sourceEntity) {
        this._source = {
            entity: sourceEntity,
            identifying: true,
            optional: true,
            cardinality: 0,
            points: [],
            dom: {
                anchor: null,
                leg: null,
                control: null
            }
        };
        this._dest = {
            entity: null,
            identifying: false,
            optional: false,
            cardinality: 1,
            points: [],
            dom: {
                anchor: null,
                leg: null,
                control: null
            }
        };

        this._canvas = null;
    }

    Relation.prototype.setDestination = function(destEntity) {
        this._dest.entity = destEntity;

        this._drawLeg(this._dest);

        var cp = this._canvas.Paper.use(this._canvas.getSharedElement("ControlPoint"))
            .attr({x: 500.5, y: 100.5});
        var that = this;

        cp.mousedown(function(e){
            that._canvas.Mouse.down(e, that, {action: 'middle', dom: cp});
        });
    };

    Relation.prototype._flattenPoints = function(points) {
        return points
            .map(function(p) { return [p.x, p.y] })
            .reduce(function(a, b) { return a.concat(b) });
    };
    Relation.prototype._isBetween = function(a, x, b, offset) {
        if (a < b) {
            return a-offset < x && x < b+offset;
        } else {
            return b-offset <= x && x <= a+offset;
        }
    };

    Relation.prototype._drawLeg = function(params) {

        // create anchor
        // TODO where?
        var anchorX = params.entity._position.x + params.entity._size.width;
        var anchorY = params.entity._position.y + Math.floor(params.entity._size.height / 2);

        params.dom.anchor = this._canvas.getRelationAnchor(params.cardinality != 1, params.identifying);
        params.dom.anchor.attr({
            transform: "translate(" + anchorX + ","+ anchorY +")"
        });

        var box = params.dom.anchor.node.getBBox();

        // create relation leg
        params.points = [
            {
                x: Math.ceil(anchorX + box.width) + .5,
                y: anchorY + 0.5
            },
            {
                x: 500.5, // TODO half between this and final position
                y: 100 + 0.5 // TODO half between this and final position + 0.5
            }
        ];

        params.dom.leg = canvas.Paper.polyline(this._flattenPoints(params.points)).attr({
            fill: 'none',
            stroke:'black',
            strokeWidth: 1,
            shapeRendering: 'auto',
            pointerEvents: 'stroke'
        });

        if (params.optional) {
            params.dom.leg.attr({
                strokeDasharray: "7.5 7.5"
            });
        }

        params.dom.control = canvas.Paper.polyline(this._flattenPoints(params.points)).attr({
            fill: 'none',
            strokeWidth: 8,
            strokeOpacity: 0
        });

        // add events
        var that = this;
        params.dom.control.node.addEventListener("mouseenter", function(){
            params.dom.leg.attr({strokeWidth: 3});
        });
        params.dom.control.node.addEventListener("mouseleave", function(){
            params.dom.leg.attr({strokeWidth: 1});
        });
        params.dom.control.mousedown(function(e) {
            that._canvas.Mouse.down(e, that, {action: 'newCP', leg: params});
        });
    };

    Relation.prototype._addPoint = function(leg, newPoint) {
        var offset = 2; // TODO

        var points = leg.points;
        var count = points.length;

        var added = false;
        for (var i=1; i<count; i++) {
            var prev = points[i-1];
            var current = points[i];

            if (this._isBetween(prev.x, newPoint.x, current.x, offset)
             && this._isBetween(prev.y, newPoint.y, current.y, offset)) {
                leg.points.splice(i, 0, newPoint);
                added = true;
                break;
            }
        }
        if (!added) { return; }

        var that = this;
        var cp = this._canvas.Paper.use(this._canvas.getSharedElement("ControlPoint")).attr(newPoint);
        cp.mousedown(function(e){
            that._canvas.Mouse.down(e, that, {action: 'cp', leg: leg, point: newPoint, dom: cp})
        });
        cp.node.addEventListener("dblclick", function(){
            that.removePoint(leg, newPoint, cp.node)
        });
        return cp;
    };

    Relation.prototype.removePoint = function(leg, point, dom) {
        for(key in leg.points) {
            if (leg.points[key] == point) {
                leg.points.splice(key, 1);
                dom.remove();
                this._updateLeg(leg);
                return;
            }
        }
    };

    Relation.prototype._updateLeg = function(params) {
        var atr = {
            points: this._flattenPoints(params.points)
        };
        params.dom.leg.attr(atr);
        params.dom.control.attr(atr);
    };

    Relation.prototype.draw = function(canvas) {
        this._canvas = canvas;
        this._drawLeg(this._source);
        //this._drawLeg(this._dest);
    };

    Relation.prototype.onMouseMove = function(e, mouse) {
        var params = mouse.getParams();

        if (params.action == 'cp') {
            var leg = params.leg;
            var point = params.point;

            point.x = mouse.x;
            point.y = mouse.y;
            params.dom.attr(point);

            this._updateLeg(leg);
        } else if (params.action == 'middle') {
            var cnt = this._source.points.length;
            var srcPoint = this._source.points[cnt-1];
            srcPoint.x = mouse.x;
            srcPoint.y = mouse.y;

            cnt = this._dest.points.length;
            var destPoint = this._dest.points[cnt-1];
            destPoint.x = mouse.x;
            destPoint.y = mouse.y;

            params.dom.attr(srcPoint);
            this._updateLeg(this._source);
            this._updateLeg(this._dest);
        }
    };

    Relation.prototype.onMouseDown = function(e, mouse) {
        var params = mouse.getParams();
        var leg = params.leg;
        if (params.action == 'newCP') {
            this._addPoint(leg, {x: mouse.x, y: mouse.y}).mousedown();
            this._updateLeg(leg);
        }
    };

    return Relation;
})();