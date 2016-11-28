var DBSDM = DBSDM || {};

DBSDM.File = (function() {
    var ns = DBSDM;

    var self = {};

    /**
     * http://stackoverflow.com/a/30832210/4705537
     */
    self.download = function(data, filename, type) {
        if (!ns.Diagram.allowFile) { return; }

        var a = document.createElement("a"),
            file = new Blob([data], {type: type});
        if (window.navigator.msSaveOrOpenBlob) // IE10+
            window.navigator.msSaveOrOpenBlob(file, filename);
        else { // Others
            var url = URL.createObjectURL(file);
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }
    };

    self.upload = function(e, canvas) {
        if (!ns.Diagram.allowFile) { return; }

        e.stopPropagation();
        e.preventDefault();

        // fetch FileList object
        var files = e.target.files || e.dataTransfer.files;

        // process all File objects
        if (files.length > 0) {
            var file = files[0];
            console.log(file);
            if (file.type != "application/json") {
                // TODO
                console.log("File is not a JSON file");
                return;
            }

            var reader = new FileReader();
            reader.onload = function(e) {
                var result = e.target.result;
                var data = JSON.parse(result);
                canvas.import(data);
            };
            reader.onerror = function(e) {
                // TODO error handling
            };
            reader.readAsText(file);
        }
    };

    return self;
}());
