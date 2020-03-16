import Origo from 'Origo';
import Overlay from 'ol/overlay';
import Point from 'ol/geom/Point';
import MultiPolygon from 'ol/geom/MultiPolygon';
import GeoJSON from 'ol/format/geojson';
import Awesomplete from 'awesomplete';
import $ from 'jquery';
import prepSuggestions from './prepsuggestions';
import generateUUID from './generateuuid';

const Main = function Main(options = {}) {
  const {
    viewer
  } = options;
  const {
    geometryAttribute,
    layerNameAttribute,
    titleAttribute,
    contentAttribute,
    title,
    estateLookup,
    minLength,
    limit
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
  let maxZoomLevel;
  let url;
  let projectionCode;
  let overlay;
  let awesomplete;
  // const cache = {};
  const prepOptions = {};
  const featureInfo = viewer.getControlByName('featureInfo');


  return Origo.ui.Component({
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
      this.minLength = options.minLength || 4;
      projectionCode = viewer.getProjectionCode();

      map = viewer.getMap();

      prepOptions.limit = limit;
      prepOptions.urlFastighet = options.urlFastighet;
      prepOptions.urlAdress = options.urlAdress;
      prepOptions.urlOrt = options.urlOrt;
      prepOptions.municipalities = options.municipalities;
      urlYta = options.urlYta;
      urlYtaKord = options.urlYtaKordinat;

      this.render();
      this.initAutocomplete();
      this.bindUIActions();
    },
    onRender() {
      this.dispatch('render');
    },
    clearSearchResults() {
      awesomplete.list = [];
      this.setSearchDb([]);
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
    render() {
      const template = `<div id="o-lmsearch-wrapper" class="o-search-wrapper absolute top-center rounded-larger box-shadow bg-white" style="flex-wrap: wrap; overflow: visible;">
        <div id="o-lmsearch" class="o-search o-search-false flex row align-center padding-right-small" style="">
        <input id="hjl" class="o-search-field form-control" type="text" placeholder="${this.hintText}" autocomplete="off" aria-autocomplete="list">
        <ul hidden=""></ul>
        <span class="visually-hidden" role="status" aria-live="assertive" aria-relevant="additions"></span>
        <button id="o-lmsearch-button" class="o-search-button no-shrink no-grow compact icon-small" style="">
        <span class="icon grey">
        <svg class="o-icon-fa-search" class="grey" style><use xlink:href="#ic_search_24px"></use></svg>
        </span>
        </button>
        <button id="o-lmsearch-button-close" class="o-search-button-close no-shrink no-grow compact icon-small" style="">
        <span class="icon grey">
        <svg class="o-icon-search-fa-times" class="grey" style><use xlink:href="#ic_close_24px"></use></svg>
        </span>
        </button>
        </div>
        </div>`;
      const elLayerManger = Origo.ui.dom.html(template);
      document.getElementById(viewer.getMain().getId()).appendChild(elLayerManger);
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
        return items.map(item => searchDb[item]);
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

      const handler = function func(data) {
        if (data.length === 0) {
          console.log('Ingen träff');
          data = [{
            NAMN: ' ',
            value: ' ',
            layer: 'Ingen träff'
          }];
        }

        list = [];
        searchDb = {};

        if (data.length) {
          setSearchDb(data);
          if (name && layerNameAttribute) {
            list = groupToList(groupDb(searchDb));
          } else {
            list = dbToList(data);
          }
          awesomplete.list = list;
          awesomplete.evaluate();
        }
      };

      function makeRequest2(handler, obj) {
        let data = [];
        console.log('making new request');
        clearSearchResults(); // to prevent showing old result while waiting for the new response
        prepSuggestions.makeRequest(prepOptions, obj.value).then((response) => {
          // IE cannot handle this! use flattenData function instead.
          // var data = [...response[0], ...response[1], ...response[2]];
          data = flattenData(response);
          // if (data !== null && data.length > 1) {
          //   cache[obj.value] = data;
          // }
          handler(data);
        }).catch((err) => {
          console.log(err.message);
          data = [{
            NAMN: ' ',
            value: ' ',
            layer: err.message // workaround to quickly render the message in the drop down list
          }];
          handler(data);
        });
      }
      // }

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
            delay(() => { makeRequest2(handler, that); }, 500);
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

      function showFeatureInfo(features, objTitle, contentFeatureInfo) {
        const obj = {};
        obj.feature = features[0];
        obj.title = objTitle;
        obj.content = contentFeatureInfo;
        clear();
        featureInfo.render([obj], 'overlay', viewer.getMapUtils().getCenter(features[0].getGeometry()));
        viewer.zoomToExtent(features[0].getGeometry(), maxZoomLevel);
      }

      function showOverlay(dataOverlay, coordOverlay) {
        clear();
        const newPopup = Origo.popup('#o-map');
        overlay = new Overlay({
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
        viewer.zoomToExtent(new Point(coordOverlay), maxZoomLevel);
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
            const format = new GeoJSON();
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
                const multiGeom = new MultiPolygon(features[0].getGeometry());
                features.map((feature) => {
                  multiGeom.appendPolygon(feature.getGeometry());
                });
                features[0].setGeometry(multiGeom);
              } else {
                console.log('FeatureCollection does not contain Polygons, we have not implemented this for Points or Lines');
              }
            }
            // Make sure the response is wrapped in a html element
            content = viewer.getUtils().createElement('div', data[contentAttribute]);
            // content = prepSuggestions.createElement('div', data[contentAttribute]);
            showFeatureInfo(features, data[titleAttribute], content);
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
      const coordinate = evt.coordinate;

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

      function showFeatureInfo(features, objTitle, contentFeatureInfo) {
        const obj = {};
        obj.feature = features[0];
        obj.title = objTitle;
        obj.content = contentFeatureInfo;
        clear();
        featureInfo.render([obj], 'overlay', viewer.getMapUtils().getCenter(features[0].getGeometry()));
        viewer.zoomToExtent(features[0].getGeometry(), maxZoomLevel);
      }
      const areaPromise = fetchFastighetsYta(coordinate);
      let featureName = '';

      areaPromise.then((response) => {
        if (typeof response.features === 'undefined') {
          console.log('There is no data available for this object!');
          return;
        }
        const format = new GeoJSON();
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
            const multiGeom = new MultiPolygon(features[0].getGeometry());
            features.map((feature) => {
              multiGeom.appendPolygon(feature.getGeometry());
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
        showFeatureInfo(features, 'Fastighet', content);
      }).catch((err) => {
        console.error(err);
      });
    },
    bindUIActions() {
      document.getElementById('hjl').addEventListener('awesomplete-selectcomplete', this.selectHandler);

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
      if (estateLookup) {
        map.on('click', this.onMapClick);
      }
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
