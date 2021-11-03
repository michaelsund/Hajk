import { Draw } from "ol/interaction";
import { Circle as CircleGeometry } from "ol/geom.js";
import { createBox } from "ol/interaction/Draw";
import { Vector as VectorLayer } from "ol/layer";
import VectorSource from "ol/source/Vector";
import { Stroke, Style, Circle, Fill, Text } from "ol/style";
import Overlay from "ol/Overlay.js";
import { handleClick } from "../../../models/Click";

class MapViewModel {
  #map;
  #localObserver;
  #drawStyleSettings;
  #draw;
  #drawSource;
  #drawLayer;
  #drawTooltipElement;
  #drawTooltipElementStyle;
  #drawTooltip;
  #currentPointerCoordinate;

  constructor(settings) {
    this.#map = settings.map;
    this.#localObserver = settings.localObserver;
    this.#draw = null;
    this.#drawTooltipElement = null;
    this.#drawTooltip = null;
    this.#currentPointerCoordinate = null;
    this.#drawTooltipElementStyle =
      "position: relative; background: rgba(0, 0, 0, 0.5); border-radius: 4px; color: white; padding: 4px 8px; opacity: 0.7; white-space: nowrap;";

    this.#drawStyleSettings = this.#getDrawStyleSettings();
    this.#initDrawLayer();
    this.#bindSubscriptions();
    this.#createDrawTooltip();
  }

  // Initializes the layer in which the user will be adding their
  // drawn geometries.
  #initDrawLayer = () => {
    // Let's grab a vector-source.
    this.#drawSource = this.#getNewVectorSource();
    // Let's create a layer
    this.#drawLayer = this.#getNewVectorLayer(
      this.#drawSource,
      this.#getDrawStyle()
    );
    // Make sure to set the layer type to something understandable.
    this.#drawLayer.set("type", "fmeServerDrawLayer");
    // Then we can add the layer to the map.
    this.#map.addLayer(this.#drawLayer);
  };

  // We must make sure that we are listening to the appropriate events from
  // the local observer.
  #bindSubscriptions = () => {
    // Will fire when the user changes tool
    this.#localObserver.subscribe(
      "map.toggleDrawMethod",
      this.#toggleDrawMethod
    );
    // Will fire when the user wants to reset the drawing.
    this.#localObserver.subscribe("map.resetDrawing", this.#resetDrawing);
    // Will fire when we want to collect all drawn features
    this.#localObserver.subscribe(
      "map.getDrawnFeatures",
      this.#getDrawnFeatures
    );
  };

  // Creates the element and overlay used to display the area of the feature
  // currently being drawn.
  #createDrawTooltip = () => {
    // If the element already exists in the dom (which it will if #drawTooltipElement
    //  isn't nullish), we must make sure to remove it.
    this.#removeEventualDrawTooltipElement();
    // Let's crete a element that we can use in the overlay.
    this.#drawTooltipElement = document.createElement("div");
    // Let's style the element a bit so it looks prettier...
    this.#drawTooltipElement.setAttribute(
      "style",
      this.#drawTooltipElementStyle
    );
    // Then let's create the overlay...
    this.#drawTooltip = new Overlay({
      element: this.#drawTooltipElement,
      offset: [30, -5],
      positioning: "bottom-center",
    });
    // And add it to the map!
    this.#map.addOverlay(this.#drawTooltip);
  };

  #removeEventualDrawTooltipElement = () => {
    if (this.#drawTooltipElement) {
      this.#drawTooltipElement.parentNode.removeElement(
        this.#drawTooltipElement
      );
      this.#drawTooltip = null;
    }
  };

  #removeEventualDrawTooltipOverlay = () => {
    if (this.#drawTooltip) {
      this.#map.removeOverlay(this.#drawTooltip);
      this.#drawTooltip = null;
    }
  };

  #cleanupMapOverlays = () => {
    this.#removeEventualDrawTooltipElement();
    this.#removeEventualDrawTooltipOverlay();
  };

  // Returns the style settings used in the OL-style.
  #getDrawStyleSettings = () => {
    const strokeColor = "rgba(74,74,74,0.5)";
    const fillColor = "rgba(255,255,255,0.07)";
    return { strokeColor: strokeColor, fillColor: fillColor };
  };

  // Returns an OL style to be used in the draw-layer.
  #getDrawStyle = () => {
    return new Style({
      stroke: new Stroke({
        color: this.#drawStyleSettings.strokeColor,
        width: 4,
      }),
      fill: new Fill({
        color: this.#drawStyleSettings.fillColor,
      }),
      image: new Circle({
        radius: 6,
        stroke: new Stroke({
          color: this.#drawStyleSettings.strokeColor,
          width: 2,
        }),
      }),
    });
  };

  // Returns the style that should be used on the drawn features
  #getFeatureStyle = (feature) => {
    // Let's start by grabbing the standard draw style as a baseline
    const baseLineStyle = this.#getDrawStyle();
    // Then we'll create a new text-style which will allow us to show
    // the area of the drawn feature.
    const textStyle = this.#getFeatureTextStyle(feature);
    // Apply the text-style to the baseline style...
    baseLineStyle.setText(textStyle);
    // And return the finished style.
    return baseLineStyle;
  };

  // Returns a text-style that shows the tooltip-label
  // (i.e. the area of the feature in a readable format).
  #getFeatureTextStyle = (feature) => {
    return new Text({
      textAlign: "center",
      textBaseline: "middle",
      font: "12pt sans-serif",
      fill: new Fill({ color: "#FFF" }),
      text: this.#getTooltipText(feature),
      overflow: true,
      stroke: new Stroke({
        color: "rgba(0, 0, 0, 0.5)",
        width: 3,
      }),
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      scale: 1,
    });
  };

  // Returns a new vector source.
  #getNewVectorSource = () => {
    return new VectorSource({ wrapX: false });
  };

  // Returns a new vector layer.
  #getNewVectorLayer = (source, style) => {
    return new VectorLayer({
      source: source,
      style: style,
    });
  };

  // Removes the draw interaction if there is one active
  #removeDrawInteraction = () => {
    if (this.#draw) {
      this.#map.removeInteraction(this.#draw);
      this.#map.clickLock.delete("fmeServer");
    }
  };

  // We have to make sure to remove all event listeners to avoid clogging.
  #removeEventListeners = () => {
    // But they will only exist if draw is/has ever been active...
    if (this.#draw) {
      this.#map.un("singleclick", this.#handleSelectFeatureClick);
      this.#drawSource.un("addfeature", this.#handleDrawFeatureAdded);
      this.#draw.un("drawstart", this.#handleDrawStart);
      this.#draw.un("drawend", this.#handleDrawEnd);
      this.#map.un("pointermove", this.#handlePointerMove);
    }
  };

  // Toggles the draw method
  #toggleDrawMethod = (drawMethod, freehand = false) => {
    // We begin with removing potential existing draw
    this.#removeDrawInteraction();
    // And also remove potential event listeners
    this.#removeEventListeners();
    // If the interaction is "Select" we don't want a draw method
    if (drawMethod === "Select") {
      return this.#enableSelectFeaturesSearch();
    }
    // If the drawMethod is missing or equals an empty string, the user
    // is toggling draw off.
    if (drawMethod && drawMethod !== "") {
      // If the drawMethod contains something, they want to toggle on!
      this.#draw = new Draw({
        source: this.#drawSource,
        // Rectangles should be created with the "Circle" method
        // apparently.
        type: drawMethod === "Rectangle" ? "Circle" : drawMethod,
        // We want freehand drawing for rectangles and circles
        freehand: ["Circle", "Rectangle"].includes(drawMethod)
          ? true
          : freehand,
        stopClick: true,
        geometryFunction: drawMethod === "Rectangle" ? createBox() : null,
        style: this.#getDrawStyle(),
      });
      // Let's add the clickLock to avoid the featureInfo
      this.#map.clickLock.add("fmeServer");
      // Then we'll add a listener for when the drawing starts
      this.#draw.on("drawstart", this.#handleDrawStart);
      // And a listener for when the drawing is complete
      this.#draw.on("drawend", this.#handleDrawEnd);
      // We'll also want a handler for the pointer event to keep
      // track of where the users pointer is located.
      this.#map.on("pointermove", this.#handlePointerMove);
      // Then we'll add the interaction to the map!
      this.#map.addInteraction(this.#draw);
      // We need a listener for when a feature is added to the source.
      this.#drawSource.on("addfeature", this.#handleDrawFeatureAdded);
    }
  };

  #enableSelectFeaturesSearch = () => {
    this.#map.clickLock.add("search");
    this.#map.on("singleclick", this.#handleSelectFeatureClick);
    this.#drawSource.on("addfeature", this.#handleDrawFeatureAdded);
  };

  #handleSelectFeatureClick = (event) => {
    handleClick(event, event.map, (response) => {
      const features = response.features;
      if (features.length === 0) {
        return;
      }
      this.#drawSource.addFeatures(response.features);
    });
  };

  #handleDrawFeatureAdded = () => {
    try {
      // First we need to get all the drawn features
      const features = this.#getDrawnFeatures();
      // Then we'll calculate the total area
      const totalArea = this.#getTotalArea(features);
      // And publish the results
      this.#localObserver.publish("map.featureAdded", {
        error: totalArea === 0,
        features: features,
        totalArea: totalArea,
      });
    } catch (error) {
      // If we've error:ed we have to let the view know
      this.#localObserver.publish("map.featureAdded", {
        error: true,
        features: [],
      });
    }
  };

  // Returns the combined area of all features supplied.
  #getTotalArea = (features) => {
    return features.reduce((acc, feature) => {
      return acc + this.#getFeatureArea(feature);
    }, 0);
  };

  // This handler has one job; add a change listener to the feature
  // currently being drawn.
  #handleDrawStart = (e) => {
    const feature = e.feature;
    feature.on("change", this.#handleFeatureChange);
  };

  // This handler will make sure that the overlay will be removed
  // when the feature is done.
  #handleDrawEnd = (e) => {
    const { feature } = e;
    this.#drawTooltipElement.innerHTML = null;
    this.#currentPointerCoordinate = null;
    this.#drawTooltip.setPosition(this.#currentPointerCoordinate);
    feature.setStyle(this.#getFeatureStyle(feature));
  };

  // This handler has one job; get the coordinate from the event,
  // and store it for later use.
  #handlePointerMove = (e) => {
    this.#currentPointerCoordinate = e.coordinate;
  };

  // This handler will make sure that we keep the area calculation
  // updated during the feature changes.
  #handleFeatureChange = (e) => {
    const feature = e.target;
    const toolTipText = this.#getTooltipText(feature);

    this.#drawTooltipElement.innerHTML = toolTipText;
    this.#drawTooltip.setPosition(this.#currentPointerCoordinate);
  };

  // Calculates the area of the supplied feature.
  // Accepts an OL-feature, and is tested for Circle and Polygon.
  #getFeatureArea = (feature) => {
    const geometry = feature.getGeometry();
    // Apparently the circle geometry instance does not expose a
    // getArea method. Here's a quick fix. (Remember that this area
    // is only used as an heads-up for the user.)
    if (geometry instanceof CircleGeometry) {
      const radius = geometry.getRadius();
      // We're rounding since precision isn't important when choosing the area.
      return Math.round(Math.pow(radius, 2) * Math.PI);
    }
    // If we're not dealing with a circle, we can just return the area.
    // We're rounding since precision isn't important when choosing the area.
    return Math.round(geometry.getArea());
  };

  // Returns the area of the supplied feature in a readable format.
  #getTooltipText = (feature) => {
    // First we must get the feature area.
    const featureArea = this.#getFeatureArea(feature);
    // Let's check if we're dealing with a huge area.
    if (featureArea >= 1e6) {
      // If the area is larger than one square kilometer we show the result in km²
      // Rounded to show 3 decimals.
      return `${(featureArea / 1e6).toFixed(3)} km²`;
    }
    // Otherwise m2² will do. (Displayed in local format).
    return `${featureArea.toLocaleString()} m²`;
  };

  // Resets the draw-layer
  #resetDrawing = () => {
    this.#drawSource.clear();
    this.#removeDrawInteraction();
    this.#removeEventListeners();
    this.#cleanupMapOverlays();
  };

  // Returns all drawn features.
  // TBD: Return OL- or GJ-features. Hmm...
  #getDrawnFeatures = () => {
    return this.#drawSource.getFeatures();
  };
}
export default MapViewModel;