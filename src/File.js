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
            if (file.type == "application/x-zip-compressed") {
                self._processZip(canvas, file);
            } else if (file.type == "application/json") {
                self._processJson(canvas, file);
            } else {
                // TODO
                console.log("Unsupported file");
            }
        }
    };

    self._processJson = function(canvas, jsonfile) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var result = e.target.result;
            var data = JSON.parse(result);
            canvas.import(data);
        };
        reader.onerror = function(e) {
            // TODO error handling
        };
        reader.readAsText(jsonfile);
    };

    self._processZip = function(canvas, zipfile) {

        function toArray(obj) {
            return Object.keys(obj).map(function (key) { return obj[key]; })
        }

        function parseAttributes(nodeList) {
            var attributeMap = {};
            if (nodeList) {
                for (var i=0; i<nodeList.length; i++) {
                    var node = nodeList[i];

                    if (node.querySelector("referedAttribute")) { continue; } // skip referred attributes in ISA hierarchy

                    var id = node.getAttribute("id");
                    var name = node.getAttribute("name");
                    if (!id || !name) { continue; }

                    var nullableNode = node.querySelector("nullsAllowed");
                    attributeMap[id] = {
                        name: name,
                        primary: false,
                        unique: false,
                        nullable: (nullableNode && nullableNode.innerHTML == "true") || false
                    };
                }
            }
            return attributeMap;
        }

        function parseKeys(nodeList, attributeMap) {
            if (!nodeList) { return; }
            for (var i=0; i<nodeList.length; i++) {
                var node = nodeList[i];

                // attribute ids
                var attributes = null;
                var atrIdsNode = node.querySelector("newElementsIDs");
                if (atrIdsNode) {
                    attributes = atrIdsNode.innerHTML.split(",");
                } else {
                    var refNodes = node.querySelectorAll("usedAttributes attributeRef");
                    if (refNodes) {
                        attributes = [];
                        for (var k=0; k<refNodes.length; k++) {
                            attributes.push(refNodes[k].innerHTML);
                        }
                    }
                }
                if (!attributes) { continue; }

                // key type
                var primary = false;
                var unique = false;
                var pkNode = node.querySelector("pk");
                if (pkNode && pkNode.innerHTML == "true") {
                    primary = true;
                } else {
                    unique = true;
                }

                for (var j=0; j<attributes.length; j++) {
                    var id = attributes[j];
                    attributeMap[id].primary = primary;
                    attributeMap[id].unique = unique;
                }
            }
        }

        function parseEntity(node, entityMap, parentMap) {
            var id = node.getAttribute("id");
            var name = node.getAttribute("name");
            if (!id || !name) { return; }

            entityMap[id] = {
                name: name,
                parent: null,
                attr: null
            };

            // isa
            var parentNode = node.querySelector("hierarchicalParent");
            if (parentNode) {
                parentMap.push([id, parentNode.innerHTML]);
            }

            // attributes
            var attributeMap = parseAttributes(node.querySelectorAll("attributes > Attribute"));
            parseKeys(node.querySelectorAll("identifiers > identifier"), attributeMap);

            entityMap[id].attr = toArray(attributeMap); // map to array
        }

        function parseRelation(node, relationsMap) {
            var sourceEntityIdNode = node.querySelector("sourceEntity");
            var identifyingNode = node.querySelector("identifying");
            var optionalSourceNode = node.querySelector("optionalSource");
            var sourceCardinalityNode = node.querySelector("sourceCardinality");

            var targetEntityIdNode = node.querySelector("targetEntity");
            var optionalTargetNode = node.querySelector("optionalTarget");
            var targetCardinalityNode = node.querySelector("targetCardinality");

            if (!sourceEntityIdNode || !targetEntityIdNode) { return; }

            relationsMap.push([
                {
                    entity: sourceEntityIdNode.innerHTML,
                    identifying: (identifyingNode ? identifyingNode.innerHTML == "true" : false),
                    optional: (optionalSourceNode ? optionalSourceNode.innerHTML == "true" : false),
                    cardinality: (sourceCardinalityNode && sourceCardinalityNode.innerHTML == "*" ? 0 : 1)
                }, {
                    entity: targetEntityIdNode.innerHTML,
                    identifying: false,
                    optional: (optionalTargetNode ? optionalTargetNode.innerHTML == "true" : false),
                    cardinality: (targetCardinalityNode && targetCardinalityNode.innerHTML == "*" ? 0 : 1)
                }
            ]);
        }

        var zip = new JSZip();
        zip.loadAsync(zipfile)
            .then(function(contents) {
                var toPromise = [];
                var files = zip.file(/\Wlogical\/(entity|relation)\/seg_0\/.*?\.xml$/);
                for (var i=0; i<files.length; i++) {
                    toPromise.push(files[i].async("string"));
                }

                Promise.all(toPromise).then(function(result){
                    var entityMap = {};
                    var parentMap = [];
                    var relationsMap = [];

                    var parser = new DOMParser();
                    for (var i=0; i<result.length; i++) {
                        var xml = parser.parseFromString(result[i], "application/xml");

                        switch (xml.documentElement.nodeName) {
                            case "Entity":
                                parseEntity(xml.documentElement, entityMap, parentMap);
                                break;
                            case "Relation":
                                parseRelation(xml.documentElement, relationsMap);
                                break;
                        }

                    }

                    // set parents
                    for(i=0; i<parentMap.length; i++) {
                        var entity = parentMap[i][0];
                        var parent = parentMap[i][1];

                        if (entityMap[entity] && entityMap[parent]) {
                            entityMap[entity].parent = entityMap[parent].name;
                        }
                    }

                    // convert relations' entity ids to names
                    for(i=0; i<relationsMap.length; i++) {
                        var source = relationsMap[i][0].entity;
                        var target = relationsMap[i][1].entity;

                        relationsMap[i][0].entity = entityMap[source].name;
                        relationsMap[i][1].entity = entityMap[target].name;
                    }

                    var data = {
                        entities: toArray(entityMap),
                        relations: relationsMap
                    };

                    canvas.import(data);
                });
            });
    };

    return self;
}());
