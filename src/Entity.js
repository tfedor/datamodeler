
var Entity = (function(){

    function Entity(x, y) {
        this._position = {
            'x': x || 0,
            'y': y || 0
        };
        this._size = {
            width: 100,
            height: 100
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
            canvas.Paper.use(canvas._getSharedElement("EntityBg"))
        );

        this._dom.append(this._name.draw(canvas));

        for (key in this._attributes) {
            this._dom.append(this._attributes[key].draw(canvas));
        }

        // set event callbacks
        var that = this;
        this._dom.mouseup(function(e) {e.stopPropagation();});
        this._dom.mousedown(function(e) {e.stopPropagation();});
        this._dom.mousemove(function(e) {
            //e.stopPropagation();
        });

        this._dom.click(function(e) {
            e.stopPropagation();
            that.onClick(e);
        });

        return this._dom;
    };

    Entity.prototype.undraw = function() {
        this._dom.remove();
    };


    Entity.prototype.onClick = function(e){
        console.log("asd");
    };

    return Entity;
})();
