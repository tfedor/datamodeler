
var Entity = (function(){

    function Entity(canvas, x, y, parent) {
        this.canvas = canvas;
        this.transform = new Transform(x, y, parent);
        this.size = {width: 100, height: 100};

        this._dom = {
            'group': null,
            'bg': null,
            'name': null
        };
    }

    Entity.prototype.translateTo = function(x, y) {
        this.transform.translateTo(x, y);
        if (x) {
            this._dom.bg.attr('x', x);
        }
        if (y) {
            this._dom.bg.attr('y', y);
        }
    };

    Entity.prototype.resize = function(width, height) {
        if (!this._dom.bg) { return; }
        this.size.width = Math.max(0, width);
        this.size.height = Math.max(0, height);
        this._dom.bg.attr('width', this.size.width);
        this._dom.bg.attr('height', this.size.height);
    };

    Entity.prototype.draw = function() {
        this._dom.group = this.canvas.paper.g();

        console.log(this.transform.localPosition);

        this._dom.bg = this.canvas.paper.rect(
            this.transform.localPosition.x, this.transform.localPosition.y,
            this.size.width, this.size.height,
            10, 10
        );
        this._dom.bg.attr({
            fill: "#A4E1FF",
            stroke: "#5271FF",
            strokeWidth: 2
        });
        this._dom.group.add(this._dom.bg);





        var text = new EditableText(this.canvas, 'My Entity', new Transform(0, 0, this.transform));
        text.draw(this._dom.group);


        /*var ref = this;
        element.click(function(e){ ref.onClick(e) });

        var text = this.canvas.paper.text(this.getPosition.x, this.getPosition.y, this.name);
        this._group.add(text);
        //alert(text.getBBox().width + " "+text.getBBox().height);

        this._group.drag();*/
    };

    Entity.prototype.undraw = function() {
        this._dom.group.remove();
    };




    Entity.prototype.onClick = function(e){
        e.stopPropagation();
    };

    return Entity;
})();
