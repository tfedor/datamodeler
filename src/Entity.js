
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
        this._dom = canvas.paper.svg(this._position.x, this._position.y, this._size.width, this._size.height);
        this._dom.attr({
            style: "overflow:visible"
        });

        // create background
        this._dom.append(
            canvas.paper.use(canvas._getSharedElement("EntityBg"))
        );

        this._dom.append(this._name.draw(canvas));

        return this._dom;

        /*var ref = this;
        element.click(function(e){ ref.onClick(e) });

        var text = this.canvas.paper.text(this.getPosition.x, this.getPosition.y, this.name);
        this._group.add(text);
        //alert(text.getBBox().width + " "+text.getBBox().height);

        this._group.drag();*/
    };

    Entity.prototype.undraw = function() {
        this._dom.remove();
    };


    Entity.prototype.onClick = function(e){
        e.stopPropagation();
    };

    return Entity;
})();
