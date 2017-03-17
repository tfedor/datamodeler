var DBSDM = DBSDM || {};

DBSDM.Consts = {
    DoubleClickInterval: 500, // interval in milliseconds during which double clicks are accepted

    SnappingLimit: 5,
    CanvasGridSize: 15,

    EntityDefaultWidth: 90,
    EntityDefaultHeight: 70,
    EntityAttributesOffset: 20,
    EntityStrokeWidth: 1,
    EntityPadding: 10,
    EntityEdgePadding: 10, // how close to the corner can the relation be placed
    EntityExtraHeight: 5,

    NoteDefaultWidth: 150,
    NoteDefaultHeight: 100,
    NoteStrokeWidth: 1,
    NotePadding: 5,

    DefaultAnchorOffset: 11, // how for from edge to start drawing relation leg
    MinAnchorAnchorDistance: 10, // should be half the anchor width

    ArcSize: 12,
    ArcEndPointOffset: 10, // how far from the start/end point draw arc
    ArcEdgeDistance: 17, // distance of the arc from the entity edge
    ArcArcDistance: 10, // distance from another arc of the same entity

    UIMessageTransition: 0.4,
    UIDefaultSuccessDuration: 2,
    UIDefaultErrorDuration: 2,

    LocalStoragePrefix: "DBSDM_"
};
