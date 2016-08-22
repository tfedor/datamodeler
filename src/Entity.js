
var Entity = (function(){

    function Entity(x, y) {
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
            dominantBaseline: "hanging"
        });
        this._attributes = [];
        this._attributes[0] = new Attribute(0, 40);

        this._dom = null;
    }

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
        this._dom = canvas.Paper.svg(this._position.x, this._position.y, this._size.width, this._size.height);
        this._dom.attr({
            style: "overflow:visible"
        });

        // create background
        this._dom.append(
            canvas.Paper.use(canvas.getSharedElement("EntityBg"))
        );

        this._dom.append(this._name.draw(canvas));

        for (key in this._attributes) {
            this._dom.append(this._attributes[key].draw(canvas));
        }

        // set event callbacks
        var that = this;
        this._dom.mousedown(function(e) { canvas.Mouse.down(e, that, "drag"); });


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
                canvas.Mouse.down(e, that, e.target.className.baseVal)
            })
        );

        /*this._dom.append();
        this._dom.append();
        this._dom.append();
        this._dom.append();
        this._dom.append(){
            canvas.Mouse.down(e, that, "rsz-br");
        }));
*/
        return this._dom;
    };

    Entity.prototype.onMouseMove = function(e, mouse){
        if (mouse.action == "drag") {
            this._dom.attr({
                x: this._position.x + mouse.dx,
                y: this._position.y + mouse.dy
            });
        } else if (mouse.action == "rsz-tl") {
            this._dom.attr({
                x: this._position.x + mouse.dx,
                y: this._position.y + mouse.dy,
                width: this._size.width - mouse.dx,
                height: this._size.height - mouse.dy
            });
        } else if (mouse.action == "rsz-br") {
            this._dom.attr({
                width: this._size.width + mouse.dx,
                height: this._size.height + mouse.dy
            });
        } else if (mouse.action == "rsz-bl") {
            this._dom.attr({
                x: this._position.x + mouse.dx,
                width: this._size.width - mouse.dx,
                height: this._size.height + mouse.dy
            });
        } else if (mouse.action == "rsz-tr") {
            this._dom.attr({
                y: this._position.y + mouse.dy,
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
    };

    return Entity;
})();
