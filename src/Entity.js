
var Entity = (function(){

    function Entity(x, y) {
        this._id = Random.string(15);
        this._position = {
            'x': x || 0,
            'y': y || 0
        };

        this._size = {
            width: 0,
            height: 0
        };

        this._name = new EditableText("50%", 0, "Entity", {
            textAnchor: "middle",
            dominantBaseline: "text-before-edge"
        });
        this._attributes = [];
        this._relations = [];

        this._menuBlocked = false; // blocks menu attachment
        this._menuAttached = false;

        this._canvas = null;
        this._dom = null;
    }

    Entity.prototype.getId = function() {
        return this._id;
    };

    Entity.prototype.translateTo = function(x, y) {
        if (x) { this._position.x = x; }
        if (y) { this._position.y = y; }

        if (this._dom) {
            this._dom.attr(this._position);
        }
    };

    Entity.prototype.translateBy = function(dx, dy) {
        if (!dx) { dx = 0 }
        if (!dy) { dy = 0; }
        this.translateTo(this._position.x + dx, this._position.y + dy);
    };

    Entity.prototype.resize = function(width, height) {
        this._size.width = width;
        this._size.height = height;

        if (this._dom) {
            this._dom.attr(this._size);
        }
    };

    Entity.prototype.draw = function(canvas) {
        this._canvas = canvas;
        this._dom = canvas.Paper.svg(this._position.x, this._position.y, this._size.width, this._size.height);
        this._dom.attr({
            style: "overflow:visible"
        });

        // create background
        this._dom.append(
            canvas.Paper.use(canvas.getSharedElement("EntityBg"))
        );

        this._dom.append(this._name.draw(canvas));

        for (var key in this._attributes) {
            this._dom.append(this._attributes[key].draw(canvas));
        }

        // set event callbacks
        var that = this;

        // drag
        this._dom.mousedown(function(e) { canvas.Mouse.down(e, that, {action: "drag"}); });

        // menu
        this._dom.node.addEventListener("mouseenter", function() { that.attachMenu(); });
        this._dom.node.addEventListener("mouseleave", function() { that.detachMenu(); });

        // create resize control
        this._dom.append(
            canvas.Paper.g(
                canvas.Paper.use(canvas.getSharedElement('ControlRectangle')),
                canvas.Paper.use(canvas.getSharedElement('ControlPoint')).attr({class: "rsz-tl", x: 0, y: 0}),
                canvas.Paper.use(canvas.getSharedElement('ControlPoint')).attr({class: "rsz-bl", x: 0, y: "100%"}),
                canvas.Paper.use(canvas.getSharedElement('ControlPoint')).attr({class: "rsz-tr", x: "100%", y: 0}),
                canvas.Paper.use(canvas.getSharedElement('ControlPoint')).attr({class: "rsz-br", x: "100%", y: "100%"})
            )
            .attr({
                class: "rsz",
                pointerEvents: "none"
            })
            .mousedown(function(e){
                canvas.Mouse.down(e, that, {action: e.target.className.baseVal})
            })
        );

        return this._dom;
    };

    Entity.prototype.boundingBox = function() {
        return {
            top: this._position.y,
            right: this._position.x + this._size.width,
            bottom: this._position.y + this._size.height,
            left: this._position.x
        };
    };

    // relations
    Entity.prototype.addRelation = function(relation) {
        this._relations.push(relation);
    };

    // menu

    Entity.prototype.attachMenu = function() {
        if (this._menuBlocked) { return; }
        this._menuAttached = true;
        canvas.menu.Entity.attachTo(this._dom.node, this._size.width/2, this);
    };

    Entity.prototype.detachMenu = function() {
        if (this._menuBlocked) { return; }
        canvas.menu.Entity.detach();
        this._menuAttached = false;
    };

    Entity.prototype.handleMenu = function(action) {
        if (action == "newAttribute") {
            this.createAttribute();
        } else if (action == "newRelation") {
            this.createRelation();
        } else if (action == "delete") {
            this._canvas.removeEntity(this._id);

            if (this._menuAttached) {
                this._canvas.menu.Entity.detach();
            }

            if (this._dom) {
                this._dom.remove();
            }
        }
    };

    Entity.prototype.createAttribute = function() {
        var atr = new Attribute(this, this._attributes.length);
        this._attributes.push(atr);
        this._dom.append(atr.draw(this._canvas));
    };

    Entity.prototype.deleteAttribute = function(order) {
        this._attributes.splice(order, 1);
        for (var i=order; i<this._attributes.length; i++) {
            this._attributes[i].reorder(i);
        }
    };

    Entity.prototype.createRelation = function() {
        var control = new RelationControl(canvas, this);
        control.draw(this._position.x + this._size.width / 2, this._position.y + this._size.height / 2);
        this._canvas.Mouse.attachObject(control);
    };

    Entity.prototype.getEdgePosition = function(edge) {
        var offset = 10;
        var binWidth = 15;
        var edgeLength;
        var edgeStart;

        if (edge == "top" || edge == "bottom") {
            edgeLength = this._size.width;
            edgeStart = this._position.x + offset;
        } else {
            edgeLength = this._size.height;
            edgeStart = this._position.y + offset;
        }

        var binCount = Math.round((edgeLength - 2*offset) / binWidth);
        var bins = new Array(binCount);
        bins.fill(0);

        var anchorPos;
        var bin;
        for(var key in this._relations) {
            var relation = this._relations[key];

            var anchor = relation.getAnchorPosition();
            if (anchor.edge != edge) { continue }
            if (edge == "top" || edge == "bottom") {
                anchorPos = anchor.x;
            } else {
                anchorPos = anchor.y;
            }

            bin = Math.floor((anchorPos - edgeStart) / binWidth);
            bins[bin]++;
        }

        var centerBin = Math.round(binCount/2);
        var minBin = 0;
        for (var i=centerBin; i<centerBin + binCount; i++) {
            bin = i % binCount;
            if (bins[bin] == 0) {
                minBin = bin;
                break;
            }
            if (bins[bin] < bins[minBin]) {
                minBin = bin;
            }
        }

        return edgeStart + offset + minBin * binWidth;
    };

    // handlers

    Entity.prototype.onMouseDown = function(e, mouse) {
        var params = mouse.getParams();
        if (params.action == 'newRelation') {
            if (this._menuAttached) {
                this._canvas.menu.Entity.detach();
            }
            this._menuBlocked = true;
        }
    };

    Entity.prototype.onMouseMove = function(e, mouse){
        var action = mouse.getParams().action;
        if (action == "drag") {
            this.translateBy(mouse.rx, mouse.ry);

            for(var key in this._relations) {
                this._relations[key].translateAnchorBy(mouse.rx, mouse.ry);
            }
        } else if (action == "rsz-tl") {
            this.translateBy(mouse.rx, mouse.ry);
            this._dom.attr({
                width: this._size.width - mouse.dx,
                height: this._size.height - mouse.dy
            });
        } else if (action == "rsz-br") {
            this._dom.attr({
                width: this._size.width + mouse.dx,
                height: this._size.height + mouse.dy
            });
        } else if (action == "rsz-bl") {
            this.translateBy(mouse.rx);
            this._dom.attr({
                width: this._size.width - mouse.dx,
                height: this._size.height + mouse.dy
            });
        } else if (action == "rsz-tr") {
            this.translateBy(null, mouse.ry);
            this._dom.attr({
                width: this._size.width + mouse.dx,
                height: this._size.height - mouse.dy
            });
        }
    };

    Entity.prototype.onMouseUp = function(e, mouse){
         this.translateTo(
            parseInt(this._dom.attr('x')),
            parseInt(this._dom.attr('y'))
        );
        this.resize(
            parseInt(this._dom.attr('width')),
            parseInt(this._dom.attr('height'))
        );

        this._menuBlocked = false;
        if (this._menuAttached) {
            this.attachMenu();
        }
        return true;
    };

    return Entity;
})();
