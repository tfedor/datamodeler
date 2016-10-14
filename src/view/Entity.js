var DBSDM = DBSDM || {};
DBSDM.View = DBSDM.View ||{};

DBSDM.View.Entity = (function(){

    var bgStrokeWidth = 3;

    function Entity(model, canvas) {
        this._model = model;
        this._canvas = canvas;

        this._dom = null;
        this._createSharedElements();

        this._controls = null;

/*
        this._attributes = [];
        this._relations = [];
        */
    }

    Entity.prototype._createSharedElements = function() {
        if (this._canvas.hasSharedElement('Entity.Bg')) { return; }

        this._canvas.createSharedElement("Entity.Bg",
            this._canvas.Paper
                .rect(0, 0, "100%", "100%")
                .attr({
                    x: 0, y: 0, width: "100%", height: "100%",
                    rx: 10, ry: 10,
                    fill: "#A4E1FF",
                    stroke: "#5271FF",
                    strokeWidth: bgStrokeWidth
                })
        );

        this._canvas.createSharedElement("Entity.ControlRectangle",
            this._canvas.Paper
                .rect(0, 0, "100%", "100%")
                .attr({
                    fill: "none",
                    strokeWidth: 1,
                    shapeRendering: "crispEdges",
                    pointerEvents: "none",
                    stroke: "black"
                })
        );

        this._canvas.createSharedElement("Entity.ControlPoint",
            this._canvas.Paper
                .rect(0, 0, 8, 8)
                .attr({
                    x: 0, y: 0, width: 8, height: 8,
                    fill: "none",
                    strokeWidth: 1,
                    stroke: "black",
                    shapeRendering: "crispEdges",
                    transform: "translate(-4,-4)",
                    pointerEvents: "all"
                })
        );
    };

    /**
     * Create empty entity (background only), when creating new Entity from canvas
     */
    Entity.prototype.createEmpty = function() {
        var transform = this._model.getTransform();
        this._dom = this._canvas.Paper.svg(transform.x, transform.y, transform.w, transform.h)
            .append(
                this._canvas.getSharedElement("Entity.Bg")
            );

        this._dom.node.style.overflow = "visible";

        this._dom.node.getElementsByTagName("desc")[0].remove();
        this._dom.node.getElementsByTagName("defs")[0].remove();
    };

    /**
     * Finish creation of entity, create other elements and attach control
     * */
    Entity.prototype.create = function(control) {
        var mouse = this._canvas.Mouse;

        var that = this;
        var nameInput = new DBSDM.View.EditableText(this._canvas,
            "50%", bgStrokeWidth,
            {
                textAnchor: "middle",
                dominantBaseline: "text-before-edge"
            },
            function() { return that._model.getName(); },
            function(value) { that._model.setName(value); } // TODO set name in control?
        );
        this._dom.append(nameInput.getTextDom());

        this._dom.node.addEventListener("mousedown", function(e) { mouse.down(e, control); });

        this._dom.node.addEventListener("contextmenu", function(e) { e.preventDefault(); e.stopPropagation(); });
    };

    Entity.prototype.redraw = function() {
        var transform = this._model.getTransform();
        this._dom.attr({
            x: transform.x,
            y: transform.y,
            width: transform.w,
            height: transform.h
        });
    };

    Entity.prototype.remove = function() {
        this._dom.remove();
    };

    Entity.prototype.showControls = function() {

        this._controls = this._dom.g(
            this._canvas.getSharedElement("Entity.ControlRectangle"),
            this._canvas.getSharedElement("Entity.ControlPoint").attr({ class: "e-cp-nw", x:      0, y:      0 }),
            this._canvas.getSharedElement("Entity.ControlPoint").attr({ class: "e-cp-n",  x:  "50%", y:      0 }),
            this._canvas.getSharedElement("Entity.ControlPoint").attr({ class: "e-cp-ne", x: "100%", y:      0 }),
            this._canvas.getSharedElement("Entity.ControlPoint").attr({ class: "e-cp-e",  x: "100%", y:  "50%" }),
            this._canvas.getSharedElement("Entity.ControlPoint").attr({ class: "e-cp-se", x: "100%", y: "100%" }),
            this._canvas.getSharedElement("Entity.ControlPoint").attr({ class: "e-cp-s",  x:  "50%", y: "100%" }),
            this._canvas.getSharedElement("Entity.ControlPoint").attr({ class: "e-cp-sw", x:      0, y: "100%" }),
            this._canvas.getSharedElement("Entity.ControlPoint").attr({ class: "e-cp-w",  x:      0, y:  "50%" })
        ).attr({
            class: "e-control"
        });

        this._dom.append(this._controls);
    };

    Entity.prototype.hideControls = function() {
        console.log("hide controls");
        this._controls.remove();
    };









    Entity.prototype.createListeners = function() {

        /*
        // set event callbacks
        var that = this;

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
*/

        return this._dom;
    };

    /*

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
    */

    return Entity;
})();
