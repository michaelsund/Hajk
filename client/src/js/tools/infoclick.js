// Copyright (C) 2016 Göteborgs Stad
//
// Denna programvara är fri mjukvara: den är tillåten att distribuera och modifiera
// under villkoren för licensen CC-BY-NC-SA 4.0.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the CC-BY-NC-SA 4.0 licence.
//
// http://creativecommons.org/licenses/by-nc-sa/4.0/
//
// Det är fritt att dela och anpassa programvaran för valfritt syfte
// med förbehåll att följande villkor följs:
// * Copyright till upphovsmannen inte modifieras.
// * Programvaran används i icke-kommersiellt syfte.
// * Licenstypen inte modifieras.
//
// Den här programvaran är öppen i syfte att den skall vara till nytta för andra
// men UTAN NÅGRA GARANTIER; även utan underförstådd garanti för
// SÄLJBARHET eller LÄMPLIGHET FÖR ETT VISST SYFTE.
//
// https://github.com/Johkar/Hajk2

var ToolModel = require('tools/tool');
var HighlightLayer = require('layers/highlightlayer');

var FeatureModel = Backbone.Model.extend({
  defaults:{
    feature: undefined,
    information: undefined,
    layer: undefined
  },

  initialize: function () {
    this.id = this.cid;
  }
});

var FeatureCollection = Backbone.Collection.extend({
  model: FeatureModel
});

/**
 * @typedef {Object} InfoClickModel~InfoClickModelProperties
 * @property {string} type - Default: infoclick
 * @property {string} panel - Default: InfoPanel
 * @property {boolean} visible - Default: false
 * @property {external:"ol.map"} map
 * @property {string} wmsCallbackName - Default: LoadWmsFeatureInfo
 * @property {external:"ol.feature"[]} features
 * @property {external:"ol.feature"} selectedFeature
 * @property {external:"ol.layer"} highlightLayer
 * @property {string} markerImg - Default: "assets/icons/marker.png"
 */
var InfoClickModelProperties = {
  type: 'infoclick',
  panel: 'InfoPanel',
  visible: false,
  map: undefined,
  wmsCallbackName: "LoadWmsFeatureInfo",
  features: undefined,
  selectedFeature: undefined,
  highlightLayer: undefined,
  markerImg: "assets/icons/marker.png",
  anchor: [
    8,
    8
  ],
  imgSize: [
    16,
    16
  ]
};

/**
 * Prototype for creating an infoclick model.
 * @class
 * @augments {external:"Backbone.Model"}
 * @param {InfoClickModel~InfoClickModelProperties} options - Default options
 */
var InfoClickModel = {
  /**
   * @instance
   * @property {InfoClickModel~InfoClickModelProperties} defaults - Default settings
   */
  defaults: InfoClickModelProperties,

  initialize: function (options) {
    ToolModel.prototype.initialize.call(this);
    this.initialState = options;

    this.set('highlightLayer', new HighlightLayer({
      anchor: this.get('anchor'),
      imgSize: this.get('imgSize'),
      markerImg: this.get('markerImg')
    }));
    this.set("features", new FeatureCollection());
    this.get("features").on("add", (feature, collection) => {
      if (collection.length === 1) {
        this.set('selectedFeature', feature);
      }
    });
    this.on("change:selectedFeature", (sender, feature) => {
      setTimeout(() => {
        if (this.get('visible')) {
          this.highlightFeature(feature);
        }
      }, 0);
    });
  },

  configure: function (shell) {
    var map = shell.getMap().getMap();

    this.layerCollection = shell.getLayerCollection();
    this.map = map;
    this.map.on('singleclick', (event) => {
      try {
        setTimeout(a => {
          if (!map.get('clickLock') && !event.filty) {
            this.onMapPointer(event);
          }
        }, 0);
      } catch (e) {}
    });
    this.set('map', this.map);
    this.map.addLayer(this.get('highlightLayer').layer);
  },

  /**
   * Handle when users clicks anywhere in the map.
   * Support for WMS layers and vector layers.
   * @instance
   * @param {object} event - Mouse event
   */
  onMapPointer: function (event) {
    var wmsLayers = this.layerCollection.filter((layer) => {
          return (layer.get("type") === "wms" || layer.get("type") === "arcgis") &&
                 layer.get("queryable") &&
                 layer.getVisible();
        })
    ,   projection = this.map.getView().getProjection().getCode()
    ,   resolution = this.map.getView().getResolution()
    ,   infos = []
    ,   promises = []
    ;

    this.layerOrder = {};
    this.get("features").reset();

    this.map.getLayers().forEach((layer, i) => {
      this.layerOrder[layer.get('name')] = i;
    });

    this.map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
      if (layer && layer.get('name')) {
        if (
          layer.get('name') !== 'preview-layer' &&
          layer.get('name') !== 'highlight-wms'
        ) {
          promises.push(new Promise((resolve, reject) => {
              features = [feature];
              _.each(features, (feature) => {
                  this.addInformation(feature, layer, (featureInfo) => {
                    if (featureInfo) {
                      infos.push(featureInfo);
                    }
                    resolve();
                  });
              });
          }));
        }
      }
    });

    wmsLayers.forEach((wmsLayer, index) => {
      wmsLayer.index = index;
      promises.push(new Promise((resolve, reject) => {
        wmsLayer.getFeatureInformation({
          coordinate: event.coordinate,
          resolution: resolution,
          projection: projection,
          error: message => {
            resolve();
          },
          success: features => {
            if (Array.isArray(features) && features.length > 0) {
              features.forEach(feature => {
                this.addInformation(feature, wmsLayer, (featureInfo) => {
                  if (featureInfo) {
                    infos.push(featureInfo);
                  }
                  resolve();
                });
              });
            } else {
              resolve();
            }
          }
        });
      }));
    });

    this.set('loadFinished', false);

    Promise.all(promises).then(() => {
      infos.sort((a, b) => {
        var s1 = a.information.layerindex
        ,   s2 = b.information.layerindex
        ;
        return s1 === s2 ? 0 : s1 < s2 ? 1 : -1;
      });

      infos.forEach(info => {
        this.get('features').add(info);
      });

      this.set('loadFinished', true);
      this.togglePanel();

      if (infos.length === 0) {
        this.set('selectedFeature', undefined);
      }
    });
  },

  parseNaturaData: function (properties, data) {
    Object.keys(data).forEach(key => {

      if (key === "arter") {
        if (Array.isArray(data[key])) {
          data[key].forEach((art, i) => {
            properties[key + " " + i] = art.namn;
          });
        }
      }
      if (key === "naturtyper") {
        if (Array.isArray(data[key])) {
          data[key].forEach((naturtyp, i) => {
            properties[key + " namn " + i] = naturtyp.namn;
            properties[key + " utbredning " + i] = naturtyp.utbredningHA;
          });
        }
      }
      if (key === "naturtyperKnas") {
      }
      if (key === "omradesTyp") {
      }
      if (key === "omradesTypAsText") {
        return;
      }

      if (data[key]) {
        if (!properties.hasOwnProperty(key)) {
          if (typeof data[key] === "string") {
            properties[key] = data[key];
          }
        }
      }
    });
    return properties;
  },

  /**
   * Add feature to hit list.
   * @instance
   * @param {external:"ol.feature"} feature
   * @param {external:"ol.layer"} layer
   * @param {function} callback to invoke when information is added
   */
  addInformation: function (feature, layer, callback) {

    if (layer.get('name') === 'draw-layer') {
      callback(false);
      return;
    }

    var layerModel = this.layerCollection.findWhere({ name: layer.get("name") })
    ,   layerindex = -1
    ,   properties
    ,   information
    ,   iconUrl = feature.get('iconUrl') || ''
    ;

    properties = feature.getProperties();
    information = layerModel && layerModel.get("information") || "";

    if (information && typeof information === "string") {
      (information.match(/\{.*?\}\s?/g) || []).forEach(property => {
          function lookup(o, s) {
            s = s.replace('{', '')
                 .replace('}', '')
                 .trim()
                 .split('.');

            switch (s.length) {
              case 1: return o[s[0]] || "";
              case 2: return o[s[0]][s[1]] || "";
              case 3: return o[s[0]][s[1]][s[2]] || "";
            }
          }
          information = information.replace(property, lookup(properties, property));
      });
    }

    if (!layerModel) {
      layerIndex = 999;
    } else {
      layerindex = this.layerOrder.hasOwnProperty(layerModel.getName())
        ? this.layerOrder[layerModel.getName()]
        : 999;
    }

    if (properties.hasOwnProperty('sitecode')) {
      let c = properties['sitecode'];
      $.get(`${HAJK2.wfsProxy}http://skyddadnatur.naturvardsverket.se/rest/detail/${c}%40N2000`, (data) => {
        properties = this.parseNaturaData(properties, data);
        callback({
          feature: feature,
          layer: layer,
          information: {
              caption: layerModel && layerModel.getCaption() || "Sökträff",
              layerindex: layerindex,
              information: information || properties,
              iconUrl: iconUrl,
          }
        });
      });
    } else {
      callback({
        feature: feature,
        layer: layer,
        information: {
            caption: layerModel && layerModel.getCaption() || "Sökträff",
            layerindex: layerindex,
            information: information || properties,
            iconUrl: iconUrl,
        }
      });
    }
  },

  /**
   * Toggle the panel
   * @instance
   */
  togglePanel: function () {
    if (this.get("features").length > 0) {
      this.set('visible', true);
    } else if (this.get("navigation").get("activePanelType") === this.get("panel")) {
      this.set('visible', false);
    }
  },

  /**
   * Create and add feature to highlight layer.
   * @instance
   * @param {external:"ol.feature"} feature
   */
  createHighlightFeature: function (feature) {
    var layer = this.get('highlightLayer');
    layer.clearHighlight();
    this.reorderLayers(feature);
    layer.addHighlight(feature.get('feature'));
    layer.setSelectedLayer(feature.get('layer'));
  },

  /**
   * Adds the highlight layer at correct draw order in the map.
   * @instance
   * @param {external:"ol.feature"}
   */
  reorderLayers: function (feature) {

    var layerCollection = this.get('map').getLayers()
    ,   featureInfo = feature.get('information')
    ,   selectedLayer = feature.get('layer')
    ,   insertIndex;

    if (this.layerOrder.hasOwnProperty(selectedLayer.get('name'))) {
      insertIndex = this.layerOrder[selectedLayer.get('name')];
      insertIndex += 1;
    }

    if (insertIndex) {
      layerCollection.remove(this.get('highlightLayer').getLayer());
      layerCollection.insertAt(insertIndex, this.get('highlightLayer').getLayer());
      insertIndex = undefined;
    }

  },

  /**
   * Highlight feature.
   * @instance
   * @param {external:"ol.feature"} feature
   */
  highlightFeature: function (feature) {
    if (feature) {
      this.createHighlightFeature(feature);
    } else {
      this.get('highlightLayer').clearHighlight();
    }
  },

  /**
   * Highlight feature.
   * @instance
   * @param {external:"ol.feature"} feature
   */
  clearHighlight: function () {
     this.get('highlightLayer').clearHighlight();
  }

};

/**
 * InfoClick model module.<br>s
 * Use <code>require('models/infoclick')</code> for instantiation.
 * @module InfoClickModel-module
 * @returns {InfoClickModel}
 */
module.exports = ToolModel.extend(InfoClickModel);
