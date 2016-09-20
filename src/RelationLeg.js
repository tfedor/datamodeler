var RelationLeg = (function(){

    function RelationLeg(canvas, entity) {
        this.entity = entity;
        this.identifying = false;
        this.optional = false;
        this.cardinality = 1;
        this.edge = null;
        this.points = [];
        this.anchorWidth = 0;
        this.dom = {
            relationContainer: null,
            anchor: null,
            leg: null,
            control: null
        };

        this._otherLeg = null;

        this._canvas = canvas;
    }

    // helper methods

    RelationLeg.prototype._flattenPoints = function(points) {
        return points
            .map(function(p) { return [p.x, p.y] })
            .reduce(function(a, b) { return a.concat(b) });
    };
    RelationLeg.prototype._isBetween = function(a, x, b, offset) {
        offset = offset || 0;
        if (a < b) {
            return a-offset < x && x < b+offset;
        } else {
            return b-offset <= x && x <= a+offset;
        }
    };

    // relation creation methods

    RelationLeg.prototype.getAnchorPosition = function() {
        return {edge: this.edge, x: this.points[0].x, y: this.points[0].y};
    };

    RelationLeg.prototype.getAnchorPoint = function(edge) {
        var point = {
            x: 0,
            y: 0
        };

        var box = this.entity.boundingBox();

        var edgePosition = this.entity.getEdgePosition(edge);

        if (edge == "top" || edge == "bottom") {
            point.x = edgePosition;
            point.y = box[edge];
        } else {
            point.x = box[edge];
            point.y = edgePosition;
        }
        return point;
    };

    RelationLeg.prototype.connectWith = function(otherLeg) {
        this._otherLeg = otherLeg;
        this._otherLeg._otherLeg = this;

        var a = this.entity.boundingBox();
        var b = this._otherLeg.entity.boundingBox();

        var srcEdge, destEdge;

        var distanceHorizontal;
        if (a.right < b.left) {
            distanceHorizontal = b.left - a.right;

            if (distanceHorizontal <= a.top - b.bottom) { // B is above
                srcEdge = "top";
                destEdge = "bottom";
            } else if (distanceHorizontal <= b.top - a.bottom) { // A is above
                srcEdge = "bottom";
                destEdge = "top";
            } else {
                srcEdge = "right";
                destEdge = "left";
            }
        } else if (b.right < a.left) {
            distanceHorizontal = a.left - b.right;

            if (distanceHorizontal <= a.top - b.bottom) { // B is above
                srcEdge = "top";
                destEdge = "bottom";
            } else if (distanceHorizontal <= b.top - a.bottom) { // A is above
                srcEdge = "bottom";
                destEdge = "top";
            } else {
                srcEdge = "left";
                destEdge = "right";
            }
        } else if (a.top > b.bottom) {
            srcEdge = "top";
            destEdge = "bottom";
        } else if (a.bottom < b.top) {
            srcEdge = "bottom";
            destEdge = "top";
        } else {
            console.log("something else");
        }

        var srcPoint = this.getAnchorPoint(srcEdge);
        var destPoint = this._otherLeg.getAnchorPoint(destEdge);
        var middlePoint = {
            x: (srcPoint.x + destPoint.x) / 2,
            y: (srcPoint.y + destPoint.y) / 2
        };

        // create relation leg
        this.points.push(srcPoint);
        this.points.push(middlePoint);

        this._otherLeg.points.push(destPoint);
        this._otherLeg.points.push(middlePoint);

        // add to entity
        this.entity.addRelation(this);
        this._otherLeg.entity.addRelation(this._otherLeg);
    };

    // draw

    RelationLeg.prototype.draw = function(group) {
        this._createLine();
        this._createAnchor();

        this._positionAnchor(this.points[0].x, this.points[0].y);

        group.add(this.dom.leg, this.dom.control, this.dom.anchor);
        this.dom.relationContainer = group;
    };

    RelationLeg.prototype.createMiddlePoint = function() {
         var cp = this._canvas.Paper.use(this._canvas.getSharedElement("CentralControlPoint"))
             .attr({
                 x: this.points[this.points.length - 1].x,
                 y: this.points[this.points.length - 1].y
             })
             .addClass("cp");
        this.dom.relationContainer.add(cp);

         var that = this;
         cp.mousedown(function(e){
             that._canvas.Mouse.down(e, that, {action: 'middle', dom: cp});
         });
    };

    RelationLeg.prototype._createLine = function() {
        this.dom.leg = canvas.Paper.polyline().attr({
            fill: 'none',
            stroke:'black',
            strokeWidth: 1,
            shapeRendering: 'auto',
            pointerEvents: 'stroke'
        });

        if (this.optional) {
            this.dom.leg.attr({
                strokeDasharray: "7.5 7.5"
            });
        }

        this.dom.control = canvas.Paper.polyline().attr({
            fill: "none",
            strokeWidth: 12,
            strokeOpacity: 0,
            strokeLinecap: "round",
            strokeLinejoin: "round"
        });

        // add events
        var that = this;
        this.dom.control.node.addEventListener("mouseenter", function(){
            that.dom.leg.attr({strokeWidth: 3});
            //that.dom.relationContainer.addClass("over");
        });
        this.dom.control.node.addEventListener("mouseleave", function(){
            that.dom.leg.attr({strokeWidth: 1});
            //that.dom.relationContainer.removeClass("over");
        });
        this.dom.control.mousedown(function(e) {
            that._canvas.Mouse.down(e, that, {action: 'newCP'});
        });
    };

    RelationLeg.prototype._createAnchor = function() {
        this.dom.anchor = this._canvas.getRelationAnchor(this.cardinality != 1, this.identifying);
        this.anchorWidth = this.dom.anchor.getBBox().width;

        // add event handlers
        var that = this;
        this.dom.anchor.mousedown(function(e) {
            that._canvas.Mouse.down(e, that, {action: 'anchor'});
        });

        /*
        this.dom.anchor.node.addEventListener("mouseenter", function(e) {
            that._canvas.menu.RelationLeg.attachTo(that.dom.relationContainer.node, 10, that);
        });
        this.dom.anchor.node.addEventListener("mouseleave", function(e) {
            that._canvas.menu.RelationLeg.detach();
        });
        */
    };

    //

    RelationLeg.prototype._updateLine = function() {
        var attr = { points: this._flattenPoints(this.points) };
        this.dom.leg.attr(attr);
        this.dom.control.attr(attr);
    };

    RelationLeg.prototype._positionAnchor = function(x, y) {
        var offset = 10; // TODO
        var rot = 0;

        var anchorX, anchorY;
        var offsetX, offsetY;

        var bbox = this.entity.boundingBox();
        if (bbox.left < x && x < bbox.right) {
            anchorX = Math.min(Math.max(x, bbox.left+offset), bbox.right-offset);
            offsetX = 0;

            // top
            if (y <= bbox.top) {
                anchorY = bbox.top;
                rot = 270;
                offsetY = -this.anchorWidth;
                this.edge = "top";
            // bottom
            } else {
                anchorY = bbox.bottom;
                rot = 90;
                offsetY = this.anchorWidth;
                this.edge = "bottom";
            }
        } else if (bbox.top < y && y < bbox.bottom) {

            anchorY = Math.min(Math.max(y, bbox.top+offset), bbox.bottom-offset);
            offsetY = 0;

            // left
            if (x <= bbox.left) {
                anchorX = bbox.left;
                rot = 180;
                offsetX = -this.anchorWidth;
                this.edge = "left";
            // right
            } else {
                anchorX = bbox.right;
                offsetX = this.anchorWidth;
                this.edge = "right";
            }
        } else {
            return;
        }

        this.dom.anchor.attr({
            transform: "translate("+ (Math.ceil(anchorX)) +", "+ (Math.ceil(anchorY)) +") rotate("+rot+")"
        });

        this.points[0].x = anchorX + offsetX;
        this.points[0].y = anchorY + offsetY;

        this._updateLine();
    };

    RelationLeg.prototype.updateAnchorAfterResize = function() {
        var box = this.entity.boundingBox();
        var offset = 10; // TODO

        var x,y;
        if (this.edge == "top" || this.edge == "bottom") {
            y = box[this.edge];
            x = Math.min(Math.max(this.points[0].x, box.left+offset), box.right-offset);
        } else {
            x = box[this.edge];
            y = Math.min(Math.max(this.points[0].y, box.top+offset), box.bottom-offset);
        }
        this._positionAnchor(x, y);
    };

    RelationLeg.prototype.translateAnchorBy = function(rx, ry) {
        this.points[0].x += rx + 0.5;
        this.points[0].y += ry + 0.5;
        this._positionAnchor(this.points[0].x, this.points[0].y);
    };

    //

    RelationLeg.prototype._addPoint = function(newPoint, mouse) {
        var offset = 2;

        var count = this.points.length;

        var added = false;
        for (var i=1; i<count; i++) {
            var prev = this.points[i-1];
            var current = this.points[i];

            if (this._isBetween(prev.x, newPoint.x, current.x, offset)
             && this._isBetween(prev.y, newPoint.y, current.y, offset)) {
                this.points.splice(i, 0, newPoint);
                added = true;
                break;
            }
        }
        if (!added) { return; }

        var that = this;
        var cp = this._canvas.Paper.use(this._canvas.getSharedElement("ControlPoint"))
            .attr(newPoint)
            .addClass("cp");
        this.dom.relationContainer.add(cp);

        cp.mousedown(function(e){
            that._canvas.Mouse.down(e, that, {action: 'cp', point: newPoint, dom: cp})
        });
        cp.node.addEventListener("dblclick", function(){
            that.removePoint(newPoint, cp.node)
        });

        mouse.detachObject();
        mouse.attachObject(this, {action: 'cp', point: newPoint, dom: cp});
        this._updateLine();

        return cp;
    };

    RelationLeg.prototype.removePoint = function(point, dom) {
        for(var key in this.points) {
            if (this.points[key] == point) {
                this.points.splice(key, 1);
                dom.remove();
                this._updateLine();
                return;
            }
        }
    };

    // handlers

    RelationLeg.prototype.onMouseMove = function(e, mouse) {
        var params = mouse.getParams();
        var point;

        if (params.action == 'anchor') {
            this._positionAnchor(mouse.x, mouse.y);
        } else if (params.action == 'cp') {
            point = params.point;

            point.x = mouse.x;
            point.y = mouse.y;
            params.dom.attr(point);
            this._updateLine();
        } else if (params.action == 'middle') {
            var cnt = this.points.length;
            var srcPoint = this.points[cnt-1];
            srcPoint.x = mouse.x;
            srcPoint.y = mouse.y;

            params.dom.attr(srcPoint);
            this._updateLine();
            this._otherLeg._updateLine();
        }
    };

    RelationLeg.prototype.onMouseDown = function(e, mouse) {
        var params = mouse.getParams();
        if (params.action == 'newCP') {
            this._addPoint({x: mouse.x, y: mouse.y}, mouse);
        }
    };

    return RelationLeg;
})();