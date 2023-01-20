import Origo from 'Origo';
import Awesomplete from 'awesomplete';
import $ from 'jquery';
import prepSuggestions from './prepsuggestions';
import generateUUID from './generateuuid';

const Main = function Main(options = {}) {
  const {
    viewer,
    geometryAttribute,
    layerNameAttribute,
    titleAttribute,
    contentAttribute,
    title,
    minLength,
    limit,
    showFeature = 'geometryOnly',
    featureStyles = {
      stroke: {
        color: [100, 149, 237, 1],
        width: 4,
        lineDash: null
      },
      fill: {
        color: [100, 149, 237, 0.2]
      },
      circle: {
        radius: 7,
        stroke: {
          color: [100, 149, 237, 1],
          width: 2
        },
        fill: {
          color: [255, 255, 255, 1]
        }
      }
    },
    labelFont = '7pt sans-serif',
    labelFontColor = [100, 149, 237, 0.3],
    labelBackgroundColor = [255, 255, 255, 0.5],
    estateLookup = false,
    estateLookupInitialState = 'initial',
    pageEstateReportWidth = '700px',
    pageEstateReportHeight = '500px',
    pageEstateReportUrl = '',
    pageEstateIconText = '<text x="5" y="40" font-size="45" font-family="Arial" fill="black">FI</text>',
    pageEstateIconSize = [50, 50],
    hideWhenEmbedded = false
  } = options;
  let {
    maxZoomLevel,
    searchEnabled = true
  } = options;
  let urlYta;
  let urlYtaKord;

  const keyCodes = {
    9: 'tab',
    27: 'esc',
    37: 'left',
    39: 'right',
    13: 'enter',
    38: 'up',
    40: 'down'
  };

  let searchDb = {};
  let map;
  let name;
  let northing;
  let easting;
  let idAttribute;
  let layerName;
  let includeSearchableLayers;
  let searchableDefault;
  let url;
  let projectionCode;
  let overlay;
  let awesomplete;
  // const cache = {};
  const prepOptions = {};
  const featureInfo = viewer.getControlByName('featureInfo');
  let vectorLayer;
  let vectorSource;
  const buttons = [];
  let estateButton;
  let estateLookupOn = false;
  let target;
  const vectorStyles = Origo.Style.createStyleRule(featureStyles);
  const svgFI = `<svg width="${pageEstateIconSize[0]}" height="${pageEstateIconSize[1]}" version="1.1" xmlns="http://www.w3.org/2000/svg"><rect width="${pageEstateIconSize[0]}" height="${pageEstateIconSize[1]}" style="fill:rgba(255,255,255,0.5);stroke-width:5;stroke:rgb(0,0,0)" />${pageEstateIconText}</svg>`;
  const iconStyle = new Origo.ol.style.Style({
    image: new Origo.ol.style.Icon({
      src: `data:image/svg+xml;utf8,${svgFI}`,
      anchor: [0.5, 70],
      anchorXUnits: 'fraction',
      anchorYUnits: 'pixels',
      scale: 1
    })
  });
  const isEmbedded = viewer.getEmbedded();
  if (isEmbedded && hideWhenEmbedded) {
    searchEnabled = false;
  }

  const setEstateActive = function setEstateActive(state) {
    if (state) {
      estateLookupOn = true;
      document.getElementById(estateButton.getId()).classList.add('active');
    } else {
      if (typeof estateButton !== 'undefined') {
        document.getElementById(estateButton.getId()).classList.remove('active');
      }
      estateLookupOn = false;
    }
  };

  return Origo.ui.Component({
    onAdd() {
      // viewer = evt.target;
      if (estateLookup && !(isEmbedded && hideWhenEmbedded)) {
        this.addComponents(buttons);
      }
      this.render();
      if (searchEnabled) {
        this.initAutocomplete();
      }
      this.bindUIActions();
      viewer.on('toggleClickInteraction', (detail) => {
        if (detail.name === 'lmsearch' && detail.active) {
          setEstateActive(true);
        } else {
          setEstateActive(false);
          this.clearSearchResults();
        }
      });
    },
    clearInfoMessage() {
      document.getElementById('o-lmsearch-info').innerHTML = "";
      document.getElementById('o-lmsearch-info').style.display = "none";
    },
    onInit() {
      name = options.searchAttribute;
      northing = options.northing || undefined;
      easting = options.easting || undefined;
      this.geometryAttribute = options.geometryAttribute;

      /** idAttribute in combination with layerNameAttribute
      must be defined if search result should be selected */
      idAttribute = options.idAttribute;
      this.layerNameAttribute = options.layerNameAttribute || undefined;
      layerName = options.layerName || undefined;
      url = options.url;
      this.title = options.title || '';
      this.titleAttribute = options.titleAttribute || undefined;
      this.contentAttribute = options.contentAttribute || undefined;
      includeSearchableLayers = Object.prototype.hasOwnProperty.call(options, 'includeSearchableLayers') ? options.includeSearchableLayers : false;
      searchableDefault = Object.prototype.hasOwnProperty.call(options, 'searchableDefault') ? options.searchableDefault : false;
      maxZoomLevel = options.maxZoomLevel || viewer.getResolutions().length - 2 || viewer.getResolutions();
      this.limit = options.limit || 9;
      this.hintText = options.hintText || 'Sök...';
      this.searchLabelText = options.searchLabelText || 'Sök:';
      this.minLength = options.minLength || 4;
      projectionCode = viewer.getProjectionCode();

      map = viewer.getMap();

      prepOptions.limit = limit;
      prepOptions.urlFastighet = options.urlFastighet;
      prepOptions.urlAdress = options.urlAdress;
      prepOptions.urlOrt = options.urlOrt;
      prepOptions.elasticSearch = options.elasticSearch || undefined;
      prepOptions.municipalities = options.municipalities;
      urlYta = options.urlYta;
      urlYtaKord = options.urlYtaKordinat;

      vectorSource = new Origo.ol.source.Vector();
      vectorLayer = new Origo.ol.layer.Vector({
        source: vectorSource,
        style: vectorStyles
      });
      vectorLayer.set('name', 'lmsearch');
      vectorLayer.set('group', 'none');
      map.addLayer(vectorLayer);

      if (estateLookup && !(isEmbedded && hideWhenEmbedded)) {
        estateButton = Origo.ui.Button({
          cls: 'o-estate padding-small margin-bottom-smaller icon-smaller round light box-shadow',
          click() {
            // For Origo to be able to react properly based on new event system
            document.dispatchEvent(new CustomEvent('toggleInteraction', {
              bubbles: true,
              detail: 'lmsearch'
            }));
            const detail = {
              name: 'lmsearch',
              active: !estateLookupOn
            };
            viewer.dispatch('toggleClickInteraction', detail);
          },
          state: estateLookupInitialState,
          validStates: ['initial', 'active'],
          icon: '#ic_crop_square_24px',
          tooltipText: 'Visa fastighet',
          tooltipPlacement: 'east',
          methods: {}
        });
        estateLookupOn = estateLookupInitialState === 'active';
        buttons.push(estateButton);
        target = `${viewer.getMain().getMapTools().getId()}`;
        const detail = {
          name: 'lmsearch',
          active: estateLookupOn
        };
        viewer.dispatch('toggleClickInteraction', detail);
        // $(document).on('enableInteraction', onEnableInteraction);
      }
    },
    onRender() {
    },
    clearSearchResults() {
      if (searchEnabled) {
        awesomplete.list = [];
        this.setSearchDb([]);
      }
      this.clearFeatures();
    },
    setSearchDb(data) {
      data.forEach((item) => {
        const dataItem = item;
        const id = generateUUID();
        dataItem.label = id;
        dataItem.value = item[name];
        searchDb[id] = dataItem;
      });
    },
    clear() {
      featureInfo.clear();
      if (overlay) {
        viewer.removeOverlays(overlay);
      }
    },
    clearFeatures() {
      vectorSource.clear();
    },
    render() {
      if (searchEnabled) {
        const template = `<div id="o-lmsearch-wrapper" class="o-search-wrapper absolute top-center rounded-larger box-shadow bg-white" style="flex-wrap: wrap; overflow: visible;">
          <div id="o-lmsearch" class="o-search o-search-false flex row align-center padding-right-small padding-left-small" style="">
          <span class="padding-left-small" style="display: flex; align-items: center;">
            <label id="searchLabel" for="lmsearch">${this.searchLabelText}</label>
          </span>
          <span class="padding-right-small">
            <input id="lmsearch" class="o-search-field form-control" type="text" placeholder="${this.hintText}" autocomplete="off" aria-labelledby="searchLabel" aria-autocomplete="list">
          </span>
          <ul hidden=""></ul>
          <span class="visually-hidden" role="status" aria-live="assertive" aria-relevant="additions"></span>
          <button id="o-lmsearch-button" class="o-search-button no-shrink no-grow compact icon-small" style="" aria-label="Sök">
          <span class="icon grey">
          <svg class="o-icon-24" class="grey" style><use xlink:href="#ic_search_24px"></use></svg>
          </span>
          </button>
          <button id="o-lmsearch-button-close" class="o-search-button-close no-shrink no-grow compact icon-small" style="" aria-label="Rensa">
          <span class="icon grey">
          <svg class="o-icon-24" class="grey" style><use xlink:href="#ic_close_24px"></use></svg>
          </span>
          </button>
          </div>
          <div id="o-lmsearch-info" class="dropdown-content"></div>
          </div>`;
        let elLayerManger = Origo.ui.dom.html(template);
        document.getElementById(viewer.getMain().getId()).appendChild(elLayerManger);
        elLayerManger = Origo.ui.dom.html(template);
      }
      if (estateLookup && !(isEmbedded && hideWhenEmbedded)) {
        const htmlString = estateButton.render();
        const el = Origo.ui.dom.html(htmlString);
        document.getElementById(target).appendChild(el);
      }
      this.dispatch('render');
    },
    initAutocomplete() {
      let list;

      $.support.cors = true;

      const input = $('#o-lmsearch .o-search-field');
      awesomplete = new Awesomplete('#o-lmsearch .o-search-field', {
        minChars: minLength,
        autoFirst: false,
        sort: false,
        maxItems: limit,
        item: this.renderList,
        filter(suggestion) {
          return suggestion.value;
        }
      });

      function groupDb(data) {
        const group = {};
        const ids = Object.keys(data);
        ids.forEach((id) => {
          const item = data[id];
          const type = item[layerNameAttribute];
          if (type in group === false) {
            group[type] = [];
            item.header = type;
            // item.header = viewer.getLayer(type).get('title');
          }
          group[type].push(item);
        });
        return group;
      }

      function groupToList(group) {
        const types = Object.keys(group);
        let glist = [];
        const selection = {};
        let nr = 0;
        let turn = 0;

        const groupList = () => {
          types.slice().forEach((type) => {
            if (nr < limit) {
              const item = group[type][turn];
              if (type in selection === false) {
                selection[type] = [];
              }
              selection[type][turn] = item;
              if (!group[type][turn + 1]) {
                types.splice(types.indexOf(type), 1);
              }
            }
            nr += 1;
          });
          turn += 1;
        };

        while (nr < limit && types.length) {
          groupList();
        }
        glist = Object.keys(selection).reduce((previous, currentGroup) => previous.concat(selection[currentGroup]), []);
        return glist;
      }

      function dbToList() {
        const items = Object.keys(searchDb);
        return items.map((item) => searchDb[item]);
      }

      function setSearchDb(data) {
        data.forEach((item) => {
          const dataItem = item;
          const id = generateUUID();
          dataItem.label = id;
          dataItem.value = item[name];
          searchDb[id] = dataItem;
        });
      }

      function clearSearchResults() {
        awesomplete.list = [];
        setSearchDb([]);
      }

      function responseHandler(data) {
        let result = data;
        if (result.length === 0) {
          result = [{label: 'Ingen träff', value:''}];
          document.getElementById('o-lmsearch-info').innerHTML = "Ingen träff";
          document.getElementById('o-lmsearch-info').style.display = "flex";
        } else {
          document.getElementById('o-lmsearch-info').innerHTML = "";
          document.getElementById('o-lmsearch-info').style.display = "none";
        }

        list = [];
        searchDb = {};

        if (result.length) {
          setSearchDb(result);
          if (name && layerNameAttribute) {
            list = groupToList(groupDb(searchDb));
          } else {
            list = dbToList(result);
          }
          awesomplete.list = list;
          awesomplete.evaluate();
        }
      }

      // we need to use this function bcuz IE does not understand spread syntax!
      function flattenData(data) {
        const flatData = [];
        for (let i = 0; i < data.length; i += 1) {
          const item = data[i];
          for (let j = 0; j < item.length; j += 1) {
            const innerItem = item[j];
            flatData.push(innerItem);
          }
        }
        return flatData;
      }

      function makeRequest2(handler, obj) {
        let data = [];
        console.log('making new request');
        clearSearchResults(); // to prevent showing old result while waiting for the new response
        prepSuggestions.makeRequest(prepOptions, obj.value, viewer).then((response) => {
          // IE cannot handle this! use flattenData function instead.
          // var data = [...response[0], ...response[1], ...response[2]];
          data = flattenData(response);
          // if (data !== null && data.length > 1) {
          //   cache[obj.value] = data;
          // }
          handler(data);
        }).catch((err) => {
          console.log(err.message);
          data = [{label: 'Error', value:''}];
          document.getElementById('o-lmsearch-info').innerHTML = err.message;
          document.getElementById('o-lmsearch-info').style.display = "flex";
          handler(data);
        });
      }
      // }

      const delay = (function delay() {
        let timer = 0;
        return function timeout(callback, ms) {
          clearTimeout(timer);
          timer = setTimeout(callback, ms);
        };
      }());

      $(input).on('keyup', function func(e) {
        const keyCode = e.keyCode;
        const that = this;
        if (this.value.length >= minLength) {
          if (keyCode in keyCodes) {
            // empty
          } else {
            delay(() => { makeRequest2(responseHandler, that); }, 500);
          }
        }
      });
    },
    selectHandler(evt) {
      let id = evt.text.label;
      const data = searchDb[id];
      let layer;
      let feature;
      let content;
      let coord;

      function fetchFastighetsYta(objectId) {
        const urlTemp = urlYta.replace('objectId', objectId);

        return $.ajax({
          url: urlTemp,
          dataType: 'json'
        });
      }

      function clear() {
        featureInfo.clear();
        if (overlay) {
          viewer.removeOverlays(overlay);
        }
      }

      function clearFeatures() {
        vectorSource.clear();
      }

      function showFeatureInfo(features, objTitle, contentFeatureInfo, objectId) {
        if (showFeature === 'popup') {
          const obj = {};
          obj.feature = features[0];
          obj.title = objTitle;
          obj.content = contentFeatureInfo;
          clear();
          featureInfo.render([obj], 'overlay', viewer.getMapUtils().getCenter(features[0].getGeometry()));
        } else {
          clearFeatures();
          vectorSource.addFeature(new Origo.ol.Feature({
            geometry: features[0].getGeometry(),
            name: objTitle
          }));
          if (typeof objectId !== 'undefined' && pageEstateReportUrl !== '') {
            let pageEstateReport = '';
            if (features[0].get('typ') === 'Samfällighet') {
              const samfallighetsattribut = features[0].get('samfallighetsattribut');
              const beteckning = features[0].get('name');
              pageEstateReport = "<h1>Samfällighet</h1><p><b>Beteckning:</b> " + beteckning.slice(0, beteckning.indexOf("Enhetesområde")) + "</p>"
              + (
                  typeof samfallighetsattribut.totalLandarea !== "undefined" ?
                  "<p><b>Land area:</b> " + samfallighetsattribut.totalLandarea + "</p>\n" :
                  ""
                )
              + (
                  typeof samfallighetsattribut.totalVattenarea !== "undefined" ?
                  "<p><b>Vatten area:</b> " + samfallighetsattribut.totalVattenarea + "</p>\n" :
                  ""
                )
              + (
                  typeof samfallighetsattribut.totalRegisterarea !== "undefined" ?
                  "<p><b>Register area:</b> " + samfallighetsattribut.totalRegisterarea + "</p>\n" :
                  ""
                )
              + (
                  typeof samfallighetsattribut.senasteAndring !== "undefined" ?
                  "<p><b>Senaste ändring:</b> " + samfallighetsattribut.senasteAndring + "</p>\n" :
                  ""
                )
              + (
                  typeof samfallighetsattribut.samfallighetsandamal !== "undefined" ?
                  "<p><b>Samfällighetsändamål:</b> " + samfallighetsattribut.samfallighetsandamal.join(',') + "</p>\n" :
                  ""
                );
            } else {
              pageEstateReport = `<iframe src="${pageEstateReportUrl}${objectId}" style="width: ${pageEstateReportWidth}; height: ${pageEstateReportHeight};display: block;"></iframe>`;
            }
            const iconFeature = new Origo.ol.Feature({
              geometry: new Origo.ol.geom.Point(viewer.getMapUtils().getCenter(features[0].getGeometry())),
              name: 'Fastighetsinformation',
              objektidentitet: objectId,
              pageEstateReport
            });
            iconFeature.setStyle(iconStyle);
            vectorSource.addFeature(iconFeature);
          }
        }
        viewer.zoomToExtent(features[0].getGeometry(), maxZoomLevel);
      }

      function showOverlay(dataOverlay, coordOverlay) {
        clear();
        const newPopup = Origo.popup('#o-map');
        overlay = new Origo.ol.Overlay({
          element: newPopup.getEl()
        });

        map.addOverlay(overlay);

        overlay.setPosition(coordOverlay);
        const contentPopup = dataOverlay[name];
        newPopup.setContent({
          contentPopup,
          title
        });
        newPopup.setVisibility(true);
        viewer.zoomToExtent(new Origo.ol.geom.Point(coordOverlay), maxZoomLevel);
      }

      if (layerNameAttribute && idAttribute) {
        layer = viewer.getLayer(data[layerNameAttribute]);
        id = data[idAttribute];
        this.getFeature(id, layer)
          .done((res) => {
            let featureWkt;
            let coordWkt;
            if (res.length > 0) {
              showFeatureInfo(res, layer.get('title'), this.getAttributes(res[0], layer));
            } else if (geometryAttribute) {
              // Fallback if no geometry in response
              featureWkt = viewer.getMapUtils().wktToFeature(data[geometryAttribute], projectionCode);
              coordWkt = featureWkt.getGeometry().getCoordinates();
              showOverlay(data, coordWkt);
            }
          });
      } else if (geometryAttribute && layerName) {
        feature = viewer.getMapUtils().wktToFeature(data[geometryAttribute], projectionCode);
        layer = viewer.getLayer(data[layerName]);
        showFeatureInfo([feature], layer.get('title'), Origo.getAttributes(feature, layer));
      } else if (titleAttribute && contentAttribute && geometryAttribute) {
        if (data[layerNameAttribute] === 'Fastighet') {
          const objectId = data.id;
          const areaPromise = fetchFastighetsYta(objectId);

          areaPromise.then((response) => {
            if (response.features.length === 0) {
              alert('There is no data available for this object!');
              return;
            }
            const format = new Origo.ol.format.GeoJSON();
            const features = format.readFeatures(response);
            /*
              If the response is a feature collection we read the geometries into a multipolygon instead.
              This is becase Origo will ignore multiple geometries and only display the first if we do not do it this way
              A Better solution would probably be to patch origo so that it handles this in a better way but it's not a
              well defined way to do this in a generic way as there are multiple features with both multiple attributes as well as geometries.
              How should that be handled? In this function, at least we know from what service the data comes from.
            */
            if (features.length > 1) {
              console.log('Found FeatureCollection with multiple features. Trying to merge them into a Multigeometry');
              if (features[0].getGeometry().getType() === 'Polygon') {
                const multiGeom = new Origo.ol.geom.MultiPolygon(features[0].getGeometry());
                features.forEach((feat) => {
                  // Make sure that geometry is polygon in the case that it might be a point
                  if (feat.getGeometry().getType() === 'Polygon') {
                    multiGeom.appendPolygon(feat.getGeometry());
                  }
                });
                features[0].setGeometry(multiGeom);
              } else {
                console.log('FeatureCollection does not contain Polygons, we have not implemented this for Points or Lines');
              }
            }
            // Make sure the response is wrapped in a html element
            content = viewer.getUtils().createElement('div', data[contentAttribute]);
            // content = prepSuggestions.createElement('div', data[contentAttribute]);
            showFeatureInfo(features, data[titleAttribute], content, objectId);
          }).catch((err) => {
            console.error(err.statusText);
          });
        } else {
          feature = viewer.getMapUtils().wktToFeature(data[geometryAttribute], projectionCode);
          // Make sure the response is wrapped in a html element
          content = viewer.getUtils().createElement('div', data[contentAttribute]);
          // content = prepSuggestions.createElement('div', data[contentAttribute]);
          showFeatureInfo([feature], data[titleAttribute], content);
        }
      } else if (geometryAttribute && title) {
        feature = viewer.getMapUtils().wktToFeature(data[geometryAttribute], projectionCode);
        content = viewer.getUtils().createElement('div', data[name]);
        // content = prepSuggestions.createElement('div', data[name]);
        showFeatureInfo([feature], title, content);
      } else if (easting && northing && title) {
        coord = [data[easting], data[northing]];
        this.showOverlay(data, coord);
      } else {
        console.log('Search options are missing');
      }
    },
    onMapClick(evt) {
      function fetchFastighetsYta(coords) {
        const urlTemp = urlYtaKord.replace('easting', coords[0]).replace('northing', coords[1]);

        return $.ajax({
          url: urlTemp,
          dataType: 'json'
        });
      }

      function clear() {
        featureInfo.clear();
        if (overlay) {
          viewer.removeOverlays(overlay);
        }
      }

      function clearFeatures() {
        vectorSource.clear();
      }

      function showFeatureInfo(features, objTitle, contentFeatureInfo, coordinate) {
        const curExtent = viewer.getExtent();
        clearFeatures();
        if (showFeature === 'geometryOnly') {
          if (features.length > 1) {
            features.forEach((feature) => {
              // Add the geometry of part of the estate
              vectorSource.addFeature(feature);
              // Get the shorthand for estatenumber part f.ex. 2:19>5
              const nameArr = feature.getProperties().name.split(' ');
              let strEstate = '';
              switch (nameArr.length) {
                case 5:
                  strEstate = `${nameArr[2]}>${nameArr[4]}`;
                  break;
                case 6:
                  strEstate = `${nameArr[3]}>${nameArr[5]}`;
                  break;
                case 7:
                  strEstate = `${nameArr[4]}>${nameArr[6]}`;
                  break;
                default:
                  strEstate = `${feature.getProperties().name.replace(' Enhetesområde ', '>')}`;
              }
              // Add the label of part of the estate on the center coordinate of the feature
              const newStyle = new Origo.ol.style.Style({
                text: new Origo.ol.style.Text({
                  text: strEstate,
                  font: labelFont,
                  stroke: new Origo.ol.style.Stroke({
                    color: labelFontColor
                  }),
                  backgroundFill: new Origo.ol.style.Fill({
                    color: labelBackgroundColor
                  }),
                  overflow: true
                })
              });
              const newFeature = new Origo.ol.Feature();
              newFeature.setGeometry(new Origo.ol.geom.Point(viewer.getMapUtils().getCenter(feature.getGeometry())));
              newFeature.setStyle(newStyle);
              vectorSource.addFeature(newFeature);
            });
          } else {
            // Add the geometry of a estate that is a single geometry
            vectorSource.addFeature(features[0]);
          }
          // Add the label of estate on the coordinate the user clicked, so that it is clearly visible for the user
          const clickStyle = new Origo.ol.style.Style({
            text: new Origo.ol.style.Text({
              text: `${features[0].getProperties().name.substring(0, features[0].getProperties().name.indexOf('Enhetesomr'))}`,
              font: labelFont,
              stroke: new Origo.ol.style.Stroke({
                color: labelFontColor
              }),
              backgroundFill: new Origo.ol.style.Fill({
                color: labelBackgroundColor
              }),
              overflow: true
            })
          });
          const clickFeature = new Origo.ol.Feature();
          clickFeature.setGeometry(new Origo.ol.geom.Point(coordinate));
          clickFeature.setStyle(clickStyle);
          vectorSource.addFeature(clickFeature);
          if (typeof features[0].getProperties().objektidentitet !== 'undefined' && pageEstateReportUrl !== '') {
            let pageEstateReport = '';
            if (features[0].get('typ') === 'Samfällighet') {
              const samfallighetsattribut = features[0].get('samfallighetsattribut');
              const beteckning = features[0].get('name');
              pageEstateReport = "<h1>Samfällighet</h1><p><b>Beteckning:</b> " + beteckning.slice(0, beteckning.indexOf("Enhetesområde")) + "</p>"
              + (
                  typeof samfallighetsattribut.totalLandarea !== "undefined" ?
                  "<p><b>Land area:</b> " + samfallighetsattribut.totalLandarea + "</p>\n" :
                  ""
                )
              + (
                  typeof samfallighetsattribut.totalVattenarea !== "undefined" ?
                  "<p><b>Vatten area:</b> " + samfallighetsattribut.totalVattenarea + "</p>\n" :
                  ""
                )
              + (
                  typeof samfallighetsattribut.totalRegisterarea !== "undefined" ?
                  "<p><b>Register area:</b> " + samfallighetsattribut.totalRegisterarea + "</p>\n" :
                  ""
                )
              + (
                  typeof samfallighetsattribut.senasteAndring !== "undefined" ?
                  "<p><b>Senaste ändring:</b> " + samfallighetsattribut.senasteAndring + "</p>\n" :
                  ""
                )
              + (
                  typeof samfallighetsattribut.samfallighetsandamal !== "undefined" ?
                  "<p><b>Samfällighetsändamål:</b> " + samfallighetsattribut.samfallighetsandamal.join(',') + "</p>\n" :
                  ""
                );
            } else {
              pageEstateReport = `<iframe src="${pageEstateReportUrl}${features[0].getProperties().objektidentitet}" style="width: ${pageEstateReportWidth}; height: ${pageEstateReportHeight};display: block;"></iframe>`;
            }
            const iconFeature = new Origo.ol.Feature({
              geometry: new Origo.ol.geom.Point(coordinate),
              name: 'Fastighetsinformation',
              objektidentitet: features[0].getProperties().objektidentitet,
              pageEstateReport
            });
            iconFeature.setStyle(iconStyle);
            vectorSource.addFeature(iconFeature);
          }
        } else {
          const obj = {};
          obj.feature = features[0];
          obj.title = objTitle;
          obj.content = contentFeatureInfo;
          clear();
          // Set the popup on the feature to closest point from the northwest point of the extent, so that the popup minimal block the feature.
          featureInfo.render([obj], 'overlay', features[0].getGeometry().getClosestPoint([curExtent[0], curExtent[3]]));
          // featureInfo.render([obj], 'overlay', viewer.getMapUtils().getCenter(features[0].getGeometry()));
          // viewer.zoomToExtent(features[0].getGeometry(), maxZoomLevel);
        }
      }

      // Clear info message if click on map
      if (searchEnabled) {
        document.getElementById('o-lmsearch-info').innerHTML = "";
        document.getElementById('o-lmsearch-info').style.display = "none";
      }

      let estateInfoClick = false;
      map.forEachFeatureAtPixel(evt.pixel,
        (feature) => {
          if (typeof feature.getProperties().pageEstateReport !== 'undefined' && pageEstateReportUrl !== '') {
            Origo.ui.Modal({
              title: feature.getProperties().name,
              content: feature.getProperties().pageEstateReport,
              style: 'width:auto;height:auto;resize:both;display:flex;flex-flow:column;',
              target: viewer.getId()
            });
            estateInfoClick = true;
          }
        });
      if (estateLookupOn && !estateInfoClick) {
        const coordinate = evt.coordinate;
        const areaPromise = fetchFastighetsYta(coordinate);
        let featureName = '';

        areaPromise.then((response) => {
          if (typeof response.features === 'undefined') {
            console.log('There is no data available for this object!');
            return;
          }
          const format = new Origo.ol.format.GeoJSON();
          const features = format.readFeatures(response);
          /*
            If the response is a feature collection we read the geometries into a multipolygon instead.
            This is becase Origo will ignore multiple geometries and only display the first if we do not do it this way
            A Better solution would probably be to patch origo so that it handles this in a better way but it's not a
            well defined way to do this in a generic way as there are multiple features with both multiple attributes as well as geometries.
            How should that be handled? In this function, at least we know from what service the data comes from.
          */
          if (features.length > 1 && showFeature === 'popup') {
            console.log('Found FeatureCollection with multiple features. Trying to merge them into a Multigeometry');
            if (features[0].getGeometry().getType() === 'Polygon') {
              const multiGeom = new Origo.ol.geom.MultiPolygon(features[0].getGeometry());
              features.forEach((feature) => {
                const polygon = new Origo.ol.geom.Polygon(feature.getGeometry().getCoordinates());
                polygon.set('description', feature.getProperties().name);
                multiGeom.appendPolygon(polygon);
              });
              features[0].setGeometry(multiGeom);
            } else {
              console.log('FeatureCollection does not contain Polygons, we have not implemented this for Points or Lines');
            }
          }
          const featureProps = features[0].getProperties();
          featureName = featureProps.name;
          featureName = featureName.substring(0, featureName.indexOf('Enhetesomr'));
          // Make sure the response is wrapped in a html element
          const content = viewer.getUtils().createElement('div', featureName);
          // content = prepSuggestions.createElement('div', data[contentAttribute]);
          showFeatureInfo(features, 'Fastighet', content, coordinate);
        }).catch((err) => {
          console.error(err);
        });
      }
    },
    bindUIActions() {
      if (searchEnabled) {
        document.getElementById('lmsearch').addEventListener('awesomplete-selectcomplete', this.selectHandler);

        $('#o-lmsearch .o-search-field').on('input', () => {
          if ($('#o-lmsearch .o-search-field').val() && $('#o-lmsearch').hasClass('o-search-false')) {
            $('#o-lmsearch').removeClass('o-search-false');
            $('#o-lmsearch').addClass('o-search-true');
            this.onClearSearch();
          } else if (!($('#o-lmsearch .o-search-field').val()) && $('#o-lmsearch').hasClass('o-search-true')) {
            $('#o-lmsearch').removeClass('o-search-true');
            $('#o-lmsearch').addClass('o-search-false');
          }
        });

        $('.o-search-field').on('blur', () => {
          $('.o-search-wrapper').removeClass('active');
          window.dispatchEvent(new Event('resize'));
        });
        $('.o-search-field').on('focus', () => {
          $('.o-search-wrapper').addClass('active');
          window.dispatchEvent(new Event('resize'));
        });
      }
      map.on('click', this.onMapClick);
    },
    renderList(suggestion, input) {
      const item = searchDb[suggestion.label] || {};
      const header = 'header' in item ? `<div class="heading">${item.header}</div>` : '';
      let optionsTemp = {};
      let html = input === '' ? suggestion.value : suggestion.value.replace(RegExp(Awesomplete.$.regExpEscape(input), 'gi'), '<mark>$&</mark>');
      html = `${header}<div class="suggestion">${html}</div>`;
      optionsTemp = {
        innerHTML: html,
        'aria-selected': 'false'
      };
      if ('header' in item) {
        optionsTemp.className = 'header';
      }

      return Awesomplete.$.create('li', optionsTemp);
    },
    onClearSearch() {
      $('#o-lmsearch-button-close').on('click', (e) => {
        this.clearSearchResults();
        this.clear();
        this.clearInfoMessage();
        $('#o-lmsearch').removeClass('o-search-true');
        $('#o-lmsearch').addClass('o-search-false');
        $('#o-lmsearch .o-search-field').val('');
        $('#o-lmsearch-button').blur();
        e.preventDefault();
      });
    }
  });
};

export default Main;
