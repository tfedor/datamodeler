var DBSDM = DBSDM || {};

DBSDM.File = (function() {
    var ns = DBSDM;

    var self = {};

    /**
     * See http://stackoverflow.com/a/30832210/4705537
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
        e.stopPropagation();
        e.preventDefault();

        if (!ns.Diagram.allowFile) {
            canvas.ui.error("File upload is turned off");
            return;
        }

        // fetch FileList object
        var files = e.target.files || e.dataTransfer.files;

        // process all File objects
        if (files.length > 0) {
            var file = files[0];
            if (file.type == "application/x-zip-compressed" || file.type == "application/zip") {
                self._processZip(canvas, file);
            } else if (file.type == "application/json" || /\.json$/.test(file.name)) {
                self._processJson(canvas, file);
            } else {
                canvas.ui.error("File couldn't be imported: unsupported file type. Import either json with exported data or SQLDeveloper zip");
                console.log(e);
            }
        }
    };

    self._processJson = function(canvas, jsonfile) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var result = e.target.result;
            try {
                var data = JSON.parse(result);
                canvas.import(data);
                canvas.ui.success("File was imported", ns.Consts.UIDefaultSuccessDuration);
            } catch(e) {
                canvas.ui.error("File couldn't be parsed properly - make sure it is valid JSON file");
                console.log(e);
            }
        };
        reader.onerror = function(e) {
            canvas.ui.error("File couldn't be uploaded, please try again");
            console.log(e);
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
                    if (!attributeMap[id]) { continue; } // ignore keys that came from different entity
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

        function parseRelation(node, relationsMap, relationsRef) {
            var sourceEntityIdNode = node.querySelector("sourceEntity");
            var identifyingNode = node.querySelector("identifying");
            var optionalSourceNode = node.querySelector("optionalSource");
            var sourceCardinalityNode = node.querySelector("sourceCardinality");
            var nameOnSource = node.querySelector("nameOnSource");

            var targetEntityIdNode = node.querySelector("targetEntity");
            var optionalTargetNode = node.querySelector("optionalTarget");
            var targetCardinalityNode = node.querySelector("targetCardinalityString");
            var nameOnTarget = node.querySelector("nameOnTarget");

            if (!sourceEntityIdNode || !targetEntityIdNode) { return; }

            relationsMap.push([
                {
                    entity: sourceEntityIdNode.innerHTML,
                    identifying: false,
                    optional: (optionalSourceNode ? optionalSourceNode.innerHTML == "true" : false),
                    cardinality: (sourceCardinalityNode && sourceCardinalityNode.innerHTML == "*" ? 0 : 1),
                    xor: null,
                    name: nameOnSource && nameOnSource.innerHTML != "" ? nameOnSource.innerHTML : null
                }, {
                    entity: targetEntityIdNode.innerHTML,
                    identifying: (identifyingNode ? identifyingNode.innerHTML == "true" : false),
                    optional: (optionalTargetNode ? optionalTargetNode.innerHTML == "true" : false),
                    cardinality: (targetCardinalityNode && targetCardinalityNode.innerHTML == "*" ? 0 : 1),
                    xor: null,
                    name: nameOnTarget && nameOnTarget.innerHTML != "" ? nameOnTarget.innerHTML : null
                }
            ]);
            relationsRef[node.getAttribute("id")] = relationsMap.length-1;
        }

        function parseArc(node, arcMap) {
            var arcID = node.getAttribute("id");
            var entityID = node.querySelector("entity").innerHTML;
            var relations = node.querySelectorAll("relationID");

            arcMap[arcID] = [];
            for (var i=0; i<relations.length; i++) {
                var relationID = relations[i].innerHTML;
                arcMap[arcID].push([entityID, relationID]);
            }
        }

        var zip = new JSZip();
        zip.loadAsync(zipfile)
            .then(function(contents) {
                var toPromise = [];
                var files = zip.file(/(\W|^)logical\/(entity|relation|arc)\/seg_0\/.*?\.xml$/);
                for (var i=0; i<files.length; i++) {
                    toPromise.push(files[i].async("string"));
                }

                Promise.all(toPromise).then(function(result){
                    var entityMap = {};
                    var parentMap = [];
                    var relationsMap = [];
                    var relationsRef = {}; // map of {relation ID} => {relationsMap index}
                    var arcMap = {};

                    var parser = new DOMParser();
                    for (var i=0; i<result.length; i++) {
                        var xml = parser.parseFromString(result[i], "application/xml");

                        switch (xml.documentElement.nodeName) {
                            case "Entity":
                                parseEntity(xml.documentElement, entityMap, parentMap);
                                break;
                            case "Relation":
                                parseRelation(xml.documentElement, relationsMap, relationsRef);
                                break;
                            case "Arc":
                                parseArc(xml.documentElement, arcMap);
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

                    // add arc data
                    for (var arcID in arcMap) {
                        if (!arcMap.hasOwnProperty(arcID)) { continue; }
                        for (i=0; i<arcMap[arcID].length; i++) {
                            var entityID = arcMap[arcID][i][0];
                            var relationID = arcMap[arcID][i][1];
                            var relIndex = relationsRef[relationID];
                            var rel = relationsMap[relIndex];
                            if (rel[0].entity == entityID) {
                                rel[0].xor = arcID;
                            } else if (rel[1].entity == entityID) {
                                rel[1].xor = arcID;
                            }
                        }
                    }

                    // convert relations' entity ids to names
                    for(i=0; i<relationsMap.length; i++) {
                        var source = relationsMap[i][0].entity;
                        var target = relationsMap[i][1].entity;

                        relationsMap[i][0].entity = entityMap[source].name;
                        relationsMap[i][1].entity = entityMap[target].name;
                    }

                    //

                    var data = {
                        entities: toArray(entityMap),
                        relations: relationsMap
                    };

                    try {
                        canvas.import(data);
                        canvas.ui.success("File was imported", ns.Consts.UIDefaultSuccessDuration);
                    } catch(e) {
                        canvas.ui.error("File couldn't be imported: check you are importing zip with exported SQL Developer model");
                        console.log(e);
                    }
                });
            });
    };

    return self;
}());
