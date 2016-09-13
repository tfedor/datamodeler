
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
        var relation = new Relation(this);
        relation.draw(this._canvas);

        this._canvas.Mouse.attachObject(relation, {action: "relation", data: relation});
    };

    // handlers

    Entity.prototype.onMouseDown = function(e, mouse) {
        if (this._menuAttached) {
            this._canvas.menu.Entity.detach();
        }
        this._menuBlocked = true;
    };

    Entity.prototype.onMouseMove = function(e, mouse){
        var action = mouse.getParams().action;
        if (action == "drag") {
            this._dom.attr({
                x: this._position.x + mouse.dx,
                y: this._position.y + mouse.dy
            });
        } else if (action == "rsz-tl") {
            this._dom.attr({
                x: this._position.x + mouse.dx,
                y: this._position.y + mouse.dy,
                width: this._size.width - mouse.dx,
                height: this._size.height - mouse.dy
            });
        } else if (action == "rsz-br") {
            this._dom.attr({
                width: this._size.width + mouse.dx,
                height: this._size.height + mouse.dy
            });
        } else if (action == "rsz-bl") {
            this._dom.attr({
                x: this._position.x + mouse.dx,
                width: this._size.width - mouse.dx,
                height: this._size.height + mouse.dy
            });
        } else if (action == "rsz-tr") {
            this._dom.attr({
                y: this._position.y + mouse.dy,
                width: this._size.width + mouse.dx,
                height: this._size.height - mouse.dy
            });
        }
    };

    Entity.prototype.onMouseUp = function(e, mouse){

console.log("mouse up");

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
    };

    return Entity;
})();
