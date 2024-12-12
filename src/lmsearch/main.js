import Origo from 'Origo';
import Awesomplete from 'awesomplete';
import prepSuggestions from './prepsuggestions';
import generateUUID from './generateuuid';

/**
 * Main component for the map search functionality.
 * @param {Object} options - Configuration options for the Main component.
 * @param {Object} options.viewer - The map viewer instance.
 * @param {string} [options.geometryAttribute] - The attribute representing geometry.
 * @param {string} [options.layerNameAttribute] - The attribute representing the layer name.
 * @param {string} [options.titleAttribute] - The attribute representing the title.
 * @param {string} [options.contentAttribute] - The attribute representing the content.
 * @param {string} [options.title] - The title for the search.
 * @param {number} [options.minLength=4] - Minimum length of search input before search starts.
 * @param {number} [options.limit=9] - Limit on the number of search results.
 * @param {string} [options.showFeature='geometryOnly'] - Determines how features are displayed ('geometryOnly' or 'popup').
 * @param {Object} [options.featureStyles] - Styles for the features on the map.
 * @param {Object} [options.labelFont] - Font settings for the label text.
 * @param {Array} [options.labelFontColor] - Font color for the label text.
 * @param {Array} [options.labelBackgroundColor] - Background color for the label text.
 * @param {boolean} [options.estateLookup=false] - Flag to enable estate lookup.
 * @param {string} [options.estateLookupInitialState='initial'] - Initial state for estate lookup button.
 * @param {string} [options.pageEstateReportWidth='700px'] - Width of the estate report page.
 * @param {string} [options.pageEstateReportHeight='500px'] - Height of the estate report page.
 * @param {string} [options.pageEstateReportUrl=''] - URL for the estate report page.
 * @param {string} [options.pageEstateIconText] - Icon text for the estate report.
 * @param {Array} [options.pageEstateIconSize] - Size of the estate report icon.
 * @param {boolean} [options.hideWhenEmbedded=false] - Flag to hide certain elements when embedded.
 * @returns {Object} The Main component instance.
 */
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
    /**
     * Adds the component to the map viewer.
     */
    onAdd() {
      // Check if estate lookup is enabled and not embedded
      if (estateLookup && !(isEmbedded && hideWhenEmbedded)) {
        this.addComponents(buttons);
      }
      this.render();
      // Initialize autocomplete if search is enabled
      if (searchEnabled) {
        this.initAutocomplete();
      }
      this.bindUIActions();
      // Listen for toggle click interaction event to activate/deactivate estate lookup
      viewer.on('toggleClickInteraction', (detail) => {
        if (detail.name === 'lmsearch' && detail.active) {
          setEstateActive(true);
        } else {
          setEstateActive(false);
          this.clearSearchResults();
        }
      });
    },
    /**
     * Clears the informational message displayed in the search.
     */
    clearInfoMessage() {
      document.getElementById('o-lmsearch-info').innerHTML = '';
      document.getElementById('o-lmsearch-info').style.display = 'none';
    },
    /**
     * Initializes the component.
     */
    onInit() {
      name = options.searchAttribute;
      northing = options.northing || undefined;
      easting = options.easting || undefined;
      this.geometryAttribute = options.geometryAttribute;
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
      // Set preparation options for requests
      prepOptions.limit = limit;
      prepOptions.urlFastighet = options.urlFastighet;
      prepOptions.urlAdress = options.urlAdress;
      prepOptions.urlOrt = options.urlOrt;
      prepOptions.elasticSearch = options.elasticSearch || undefined;
      prepOptions.municipalities = options.municipalities;
      prepOptions.statusAddress = options.statusAddress ? options.statusAddress : undefined;
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
      // Create estate button if lookup is enabled
      if (estateLookup && !(isEmbedded && hideWhenEmbedded)) {
        estateButton = Origo.ui.Button({
          cls: 'o-estate padding-small margin-bottom-smaller icon-smaller round light box-shadow',
          click() {
            // Dispatch toggle interaction event
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
      }
    },
    /**
     * Renders the component.
     */
    onRender() {},
    /**
     * Clears the search results from the autocomplete and map.
     */
    clearSearchResults() {
      // Clear autocomplete list and map features
      if (searchEnabled) {
        awesomplete.list = [];
        this.setSearchDb([]);
      }
      this.clearFeatures();
    },
    /**
     * Sets the search database with the given data.
     * @param {Array} data - Array of search results.
     */
    setSearchDb(data) {
      data.forEach((item) => {
        const dataItem = item;
        const id = generateUUID();
        dataItem.label = id;
        dataItem.value = item[name];
        searchDb[id] = dataItem;
      });
    },
    /**
     * Clears any overlays or feature info displayed on the map.
     */
    clear() {
      featureInfo.clear();
      if (overlay) {
        viewer.removeOverlays(overlay);
      }
    },
    /**
     * Clears all features from the vector source.
     */
    clearFeatures() {
      vectorSource.clear();
    },
    /**
     * Renders the search component on the map.
     */
    render() {
      if (searchEnabled) {
        // Create search input field HTML template
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
        // Append the estate button to the target element
        const htmlString = estateButton.render();
        const el = Origo.ui.dom.html(htmlString);
        document.getElementById(target).appendChild(el);
      }
      this.dispatch('render');
    },
    /**
     * Initializes the autocomplete functionality for the search input field.
     */
    initAutocomplete() {
      let list;
      const input = document.querySelector('#o-lmsearch .o-search-field');
      // Initialize Awesomplete for the input field
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

      // Group search results by type
      function groupDb(data) {
        const group = {};
        const ids = Object.keys(data);
        ids.forEach((id) => {
          const item = data[id];
          const type = item[layerNameAttribute];
          if (type in group === false) {
            group[type] = [];
            item.header = type;
          }
          group[type].push(item);
        });
        return group;
      }

      // Convert grouped search results to a list
      function groupToList(group) {
        const types = Object.keys(group);
        let glist = [];
        const selection = {};
        let nr = 0;
        let turn = 0;

        // Cycle through grouped types until reaching the limit
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

      // Convert search database to a list
      function dbToList() {
        const items = Object.keys(searchDb);
        return items.map((item) => searchDb[item]);
      }

      // Set search database with given data
      function setSearchDb(data) {
        data.forEach((item) => {
          const dataItem = item;
          const id = generateUUID();
          dataItem.label = id;
          dataItem.value = item[name];
          searchDb[id] = dataItem;
        });
      }

      // Clear the search results
      function clearSearchResults() {
        awesomplete.list = [];
        setSearchDb([]);
      }

      // Handle the response from search requests
      function responseHandler(data) {
        let result = data;
        if (result.length === 0) {
          result = [{ label: 'Ingen träff', value: '' }];
          document.getElementById('o-lmsearch-info').innerHTML = 'Ingen träff';
          document.getElementById('o-lmsearch-info').style.display = 'flex';
        } else {
          document.getElementById('o-lmsearch-info').innerHTML = '';
          document.getElementById('o-lmsearch-info').style.display = 'none';
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

      /**
       * Flattens a nested array of data into a single-level array.
       * This function is used because Internet Explorer does not understand spread syntax.
       * @param {Array} data - A nested array of data to be flattened.
       * @returns {Array} A single-level array containing all elements from the nested array.
       */
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

      /**
       * Makes a request to fetch suggestions and handles the response.
       * Uses the `prepSuggestions.makeRequest` function to get the response and handles the results.
       * @param {Function} handler - A callback function to handle the response data.
       * @param {Object} obj - An object containing the value to be used for the request.
       */
      function makeRequest2(handler, obj) {
        let data = [];
        console.log('making new request');
        clearSearchResults(); // to prevent showing old result while waiting for the new response
        prepSuggestions.makeRequest(prepOptions, obj.value, viewer).then((response) => {
          // IE cannot handle spread syntax. Use flattenData function instead.
          data = flattenData(response);
          handler(data);
        }).catch((err) => {
          console.log(err.message);
          data = [{ label: 'Error', value: '' }];
          document.getElementById('o-lmsearch-info').innerHTML = err.message;
          document.getElementById('o-lmsearch-info').style.display = 'flex';
          handler(data);
        });
      }

      // Create a delay for input to prevent multiple rapid requests
      const delay = (function delay() {
        let timer = 0;
        return function timeout(callback, ms) {
          clearTimeout(timer);
          timer = setTimeout(callback, ms);
        };
      }());

      // Listen for keyup events on the input field
      input.addEventListener('keyup', function func(e) {
        const keyCode = e.keyCode;
        const that = this;
        if (this.value.length >= minLength) {
          if (keyCode in keyCodes) {
            // Ignore special keys
          } else {
            delay(() => { makeRequest2(responseHandler, that); }, 500);
          }
        }
      });
    },
    /**
     * Handles the selection of a search suggestion.
     * @param {Event} evt - The event triggered by selecting a suggestion.
     */
    selectHandler(evt) {
      let id = evt.text.label;
      const data = searchDb[id];
      let layer;
      let feature;
      let content;
      let coord;

      /**
       * Fetches the property area for a given object ID.
       *
       * @param {string} objectId - The ID of the property object to fetch the area for.
       * @returns {Promise<Object>} A promise that resolves to the JSON response containing the property area data.
       * @throws {Error} Throws an error if the network response is not ok.
       */
      function fetchFastighetsYtaById(objectId) {
        // Replace 'objectId' placeholder in the URL with the actual object ID
        const urlTemp = urlYta.replace('objectId', objectId);

        // Fetch the data from the constructed URL
        return fetch(urlTemp)
          .then(response => {
            if (!response.ok) {
              // Throw an error if the response status is not successful
              throw new Error('Network response was not ok');
            }
            // Return the JSON data from the response
            return response.json();
          })
          .catch(error => {
            // Log an error message if the fetch operation fails
            console.log('There has been a problem with your fetch operation:', error);
          });
      }
      
      // Clear the feature information and overlays
      function clear() {
        featureInfo.clear();
        if (overlay) {
          viewer.removeOverlays(overlay); // Remove any existing overlays
        }
      }

      // Clear all features from the vector source
      function clearFeatures() {
        vectorSource.clear(); // Clear all vector features from the source
      }

      /**
       * Displays feature information on the map, either in a popup or as a geometry feature.
       * @param {Array} features - Array of features to display.
       * @param {string} objTitle - Title for the feature information.
       * @param {HTMLElement} contentFeatureInfo - Content to display in the feature information.
       * @param {string} [objectId] - Identifier for the estate report (optional).
       */
      function showFeatureInfo(features, objTitle, contentFeatureInfo, objectId) {
        if (showFeature === 'popup') {
          // Prepare the object to display in the popup
          const obj = {};
          obj.feature = features[0];
          obj.title = objTitle;
          obj.content = contentFeatureInfo;
          clear(); // Clear previous overlays
          // Render feature information as a popup overlay
          featureInfo.render([obj], 'overlay', viewer.getMapUtils().getCenter(features[0].getGeometry()));
        } else {
          // Clear existing features from the vector source
          clearFeatures();
          // Add the selected feature to the vector source for visualization
          vectorSource.addFeature(new Origo.ol.Feature({
            geometry: features[0].getGeometry(),
            name: objTitle
          }));
          // If objectId and pageEstateReportUrl are defined, create the estate report content
          if (typeof objectId !== 'undefined' && pageEstateReportUrl !== '') {
            let pageEstateReport = '';
            // If the feature type is 'samfällighet', create a detailed HTML report
            if (features[0].get('typ').toLowerCase() === 'samfällighet') {
              const samfallighetsattribut = features[0].get('samfallighetsattribut');
              const beteckning = features[0].get('name');
              // Create HTML content for the estate report, conditionally including available attributes
              pageEstateReport = `<h1>Samfällighet</h1><p><b>Beteckning:</b> ${beteckning.slice(0, beteckning.indexOf('Enhetesområde'))}</p>
              ${typeof samfallighetsattribut.totalLandarea !== 'undefined' ? `<p><b>Land area:</b> ${samfallighetsattribut.totalLandarea}</p>` : ''}
              ${typeof samfallighetsattribut.totalVattenarea !== 'undefined' ? `<p><b>Vatten area:</b> ${samfallighetsattribut.totalVattenarea}</p>` : ''}
              ${typeof samfallighetsattribut.totalareal !== 'undefined' ? `<p><b>Register area:</b> ${samfallighetsattribut.totalareal}</p>` : ''}
              ${typeof samfallighetsattribut.senasteAndringAllmannaDelen !== 'undefined' ? `<p><b>Senaste ändring:</b> ${samfallighetsattribut.senasteAndringAllmannaDelen}</p>` : ''}
              ${typeof samfallighetsattribut.status !== 'undefined' ? `<p><b>Status:</b> ${samfallighetsattribut.status}</p>` : ''}
              ${typeof samfallighetsattribut.samfallighetsandamal !== 'undefined' ? `<p><b>Samfällighetsändamål:</b> ${samfallighetsattribut.samfallighetsandamal}</p>` : ''}`;
            } else {
              // If not 'samfällighet', display the estate report in an iframe
              pageEstateReport = `<iframe src="${pageEstateReportUrl}${objectId}" style="width: ${pageEstateReportWidth}; height: ${pageEstateReportHeight};display: block;"></iframe>`;
            }
            // Create an icon feature for displaying the estate report information on the map
            const iconFeature = new Origo.ol.Feature({
              geometry: new Origo.ol.geom.Point(viewer.getMapUtils().getCenter(features[0].getGeometry())),
              name: 'Fastighetsinformation',
              objektidentitet: objectId,
              pageEstateReport
            });
            // Set the icon style for the estate report feature
            iconFeature.setStyle(iconStyle);
            vectorSource.addFeature(iconFeature);
          }
        }
        // Zoom to the extent of the feature geometry
        viewer.zoomToExtent(features[0].getGeometry(), maxZoomLevel);
      }

      /**
       * Displays an overlay popup on the map at a given coordinate.
       *
       * @param {Object} dataOverlay - The data to display in the overlay.
       * @param {Array<number>} coordOverlay - The coordinates where the overlay should be displayed.
       */
      function showOverlay(dataOverlay, coordOverlay) {
        // Clear any existing overlays or popups
        clear();

        // Create a new popup element for the overlay
        const newPopup = Origo.popup('#o-map');

        // Create a new overlay using the popup element
        overlay = new Origo.ol.Overlay({
          element: newPopup.getEl()
        });

        // Add the overlay to the map
        map.addOverlay(overlay);

        // Set the position of the overlay on the map
        overlay.setPosition(coordOverlay);

        // Extract the content for the popup from the dataOverlay object
        const contentPopup = dataOverlay[name];

        // Set the content and title of the new popup
        newPopup.setContent({
          contentPopup,
          title
        });

        // Make the popup visible
        newPopup.setVisibility(true);

        // Zoom the map to the specified coordinates with a maximum zoom level
        viewer.zoomToExtent(new Origo.ol.geom.Point(coordOverlay), maxZoomLevel);
      }


      if (layerNameAttribute && idAttribute) {
        layer = viewer.getLayer(data[layerNameAttribute]);
        id = data[idAttribute];
        this.getFeature(id, layer)
          .then((res) => {
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
          const areaPromise = fetchFastighetsYtaById(objectId);

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
                const multiGeom = new Origo.ol.geom.MultiPolygon([]);
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
            content = viewer.getUtils().createElement('div', data[contentAttribute]);
            showFeatureInfo(features, data[titleAttribute], content, objectId);
          }).catch((err) => {
            console.log(err);
          });
        } else {
          feature = viewer.getMapUtils().wktToFeature(data[geometryAttribute], projectionCode);
          content = viewer.getUtils().createElement('div', data[contentAttribute]);
          showFeatureInfo([feature], data[titleAttribute], content);
        }
      } else if (geometryAttribute && title) {
        feature = viewer.getMapUtils().wktToFeature(data[geometryAttribute], projectionCode);
        content = viewer.getUtils().createElement('div', data[name]);
        showFeatureInfo([feature], title, content);
      } else if (easting && northing && title) {
        coord = [data[easting], data[northing]];
        this.showOverlay(data, coord);
      } else {
        console.log('Search options are missing');
      }
    },
    /**
     * Handles the map click event to display estate information.
     * @param {Event} evt - The map click event.
     */
    onMapClick(evt) {
      // Fetch estate information using coordinates
      function fetchFastighetsYta(coords) {
        const urlTemp = urlYtaKord.replace('easting', coords[0]).replace('northing', coords[1]);

        // Fetch estate data using the modified URL
        return fetch(urlTemp)
          .then(response => response.json());
      }

      // Clear the feature information and overlays
      function clear() {
        featureInfo.clear();
        if (overlay) {
          viewer.removeOverlays(overlay); // Remove any existing overlays
        }
      }

      // Clear all features from the vector source
      function clearFeatures() {
        vectorSource.clear(); // Clear all vector features from the source
      }

      // Display feature information on the map
      function showFeatureInfo(features, objTitle, contentFeatureInfo, coordinate) {
        const curExtent = viewer.getExtent();
        clearFeatures(); // Clear existing features before adding new ones
        if (showFeature === 'geometryOnly') {
          // Handle multiple features case
          if (features.length > 1) {
            features.forEach((feature) => {
              vectorSource.addFeature(feature); // Add each feature to the vector source
              // Get the shorthand for estatenumber part f.ex. 2:19>5
              const nameArr = feature.getProperties().name.split(' ');
              let strEstate = '';
              // Determine the estate name format based on the number of parts
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
              // Create a new style for the label of the estate part
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
              // Set the geometry of the label to the center of the estate feature
              newFeature.setGeometry(new Origo.ol.geom.Point(viewer.getMapUtils().getCenter(feature.getGeometry())));
              newFeature.setStyle(newStyle); // Apply the label style
              vectorSource.addFeature(newFeature); // Add the label feature to the vector source
            });
          } else {
            vectorSource.addFeature(features[0]); // If only a single geometry, add it directly
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
          clickFeature.setGeometry(new Origo.ol.geom.Point(coordinate)); // Set the geometry to the click coordinate
          clickFeature.setStyle(clickStyle); // Apply the style for the clicked feature
          vectorSource.addFeature(clickFeature); // Add the feature to the vector source
          // If estate report URL is available, create the report iframe
          if (typeof features[0].getProperties().objektidentitet !== 'undefined' && pageEstateReportUrl !== '') {
            let pageEstateReport = '';
            // Check if the feature type is 'samfällighet' and construct the appropriate report content
            if (features[0].get('typ').toLowerCase() === 'samfällighet') {
              const samfallighetsattribut = features[0].get('samfallighetsattribut');
              const beteckning = features[0].get('name');
              pageEstateReport = `<h1>Samfällighet</h1><p><b>Beteckning:</b> ${beteckning.slice(0, beteckning.indexOf('Enhetesområde'))}</p>
              ${typeof samfallighetsattribut.totalLandarea !== 'undefined' ? `<p><b>Land area:</b> ${samfallighetsattribut.totalLandarea}</p>` : ''}
              ${typeof samfallighetsattribut.totalVattenarea !== 'undefined' ? `<p><b>Vatten area:</b> ${samfallighetsattribut.totalVattenarea}</p>` : ''}
              ${typeof samfallighetsattribut.totalareal !== 'undefined' ? `<p><b>Register area:</b> ${samfallighetsattribut.totalareal}</p>` : ''}
              ${typeof samfallighetsattribut.senasteAndringAllmannaDelen !== 'undefined' ? `<p><b>Senaste ändring:</b> ${samfallighetsattribut.senasteAndringAllmannaDelen}</p>` : ''}
              ${typeof samfallighetsattribut.status !== 'undefined' ? `<p><b>Status:</b> ${samfallighetsattribut.status}</p>` : ''}
              ${typeof samfallighetsattribut.samfallighetsandamal !== 'undefined' ? `<p><b>Samfällighetsändamål:</b> ${samfallighetsattribut.samfallighetsandamal}</p>` : ''}`;
            } else {
              // If not 'samfällighet', create an iframe to show the report
              pageEstateReport = `<iframe src="${pageEstateReportUrl}${features[0].getProperties().objektidentitet}" style="width: ${pageEstateReportWidth}; height: ${pageEstateReportHeight};display: block;"></iframe>`;
            }
            const iconFeature = new Origo.ol.Feature({
              geometry: new Origo.ol.geom.Point(coordinate), // Set the geometry of the estate report icon
              name: 'Fastighetsinformation',
              objektidentitet: features[0].getProperties().objektidentitet,
              pageEstateReport
            });
            iconFeature.setStyle(iconStyle); // Apply the icon style
            vectorSource.addFeature(iconFeature); // Add the estate report icon to the vector source
          }
        } else {
          // Show the feature info in a popup overlay
          const obj = {};
          obj.feature = features[0];
          obj.title = objTitle;
          obj.content = contentFeatureInfo;
          clear(); // Clear previous overlays
          featureInfo.render([obj], 'overlay', features[0].getGeometry().getClosestPoint([curExtent[0], curExtent[3]])); // Set the popup on the feature to closest point from the northwest point of the extent, so that the popup minimal block the feature.
        }
      }
      if (searchEnabled) {
        // Clear info message if search is enabled
        document.getElementById('o-lmsearch-info').innerHTML = '';
        document.getElementById('o-lmsearch-info').style.display = 'none';
      }
      let estateInfoClick = false;
      // Iterate through features at the click location to check if any has an estate report
      map.forEachFeatureAtPixel(
        evt.pixel,
        (feature) => {
          if (typeof feature.getProperties().pageEstateReport !== 'undefined' && pageEstateReportUrl !== '') {
            // Show modal with estate report if available
            Origo.ui.Modal({
              title: feature.getProperties().name,
              content: feature.getProperties().pageEstateReport,
              style: 'width:auto;height:auto;resize:both;display:flex;flex-flow:column;',
              target: viewer.getId()
            });
            estateInfoClick = true; // Mark that estate information was clicked
          }
        }
      );
      if (estateLookupOn && !estateInfoClick) {
        // If estate lookup is active and no existing estate information is clicked
        const coordinate = evt.coordinate;
        const areaPromise = fetchFastighetsYta(coordinate); // Fetch estate information for the clicked coordinate
        let featureName = '';
        areaPromise.then((response) => {
          if (typeof response.features === 'undefined') {
            console.log('There is no data available for this object!');
            return;
          }
          const format = new Origo.ol.format.GeoJSON();
          const features = format.readFeatures(response); // Convert response to features
          /*
            If the response is a feature collection we read the geometries into a multipolygon instead.
            This is becase Origo will ignore multiple geometries and only display the first if we do not do it this way
            A Better solution would probably be to patch origo so that it handles this in a better way but it's not a
            well defined way to do this in a generic way as there are multiple features with both multiple attributes as well as geometries.
            How should that be handled? In this function, at least we know from what service the data comes from.
          */
            if (features.length > 1 && showFeature === 'popup') {
              let enhetsOmrade = [];
              console.log('Found FeatureCollection with multiple features. Trying to merge them into a Multigeometry');
              const multiGeom = new Origo.ol.geom.MultiPolygon([]);
              features.forEach((feature) => {
                if (feature.getGeometry().getType() === 'Polygon') {
                  const polygon = new Origo.ol.geom.Polygon(feature.getGeometry().getCoordinates());
                  polygon.set('name', feature.getProperties().name);
                  enhetsOmrade.push(feature.getProperties().name);
                  multiGeom.appendPolygon(polygon);
                }
              });
              multiGeom.set('Enhetsområden', enhetsOmrade.join('<br/>'));
               features[0].setGeometry(multiGeom);
          }
          const featureProps = features[0].getProperties();
          featureName = featureProps.name;
          featureName = featureName.substring(0, featureName.indexOf('Enhetsomr')); // Extract part of the feature name
          const contentArr = [];
          contentArr.push(`<div class="o-identify-content">`)
          contentArr.push(viewer.getUtils().createElement('p', `${featureName}`)) // Add feature name to content
          Object.entries(features[0].getGeometry().getProperties()).forEach((prop) => {
            contentArr.push(viewer.getUtils().createElement('p', `<b>${prop[0]}:</b><br/> ${prop[1]}`)) // Add all properties for the first feature to content
          });
          contentArr.push(`</div>`)
         showFeatureInfo(features, 'Fastighet', contentArr.join(''), coordinate); // Display feature information
        }).catch((err) => {
          console.log(err); // Log any errors during the fetch process
        });
      }
    },
    bindUIActions() {
      if (searchEnabled) {
        // Bind event to handle selecting a suggestion from the autocomplete
        document.getElementById('lmsearch').addEventListener('awesomplete-selectcomplete', this.selectHandler);
        // Handle input changes in the search field
        document.querySelector('#o-lmsearch .o-search-field').addEventListener('input', () => {
          const searchField = document.querySelector('#o-lmsearch .o-search-field');
          if (searchField.value && document.querySelector('#o-lmsearch').classList.contains('o-search-false')) {
            // If there's input, change the search state to active
            document.querySelector('#o-lmsearch').classList.remove('o-search-false');
            document.querySelector('#o-lmsearch').classList.add('o-search-true');
            this.onClearSearch(); // Clear previous search results
          } else if (!searchField.value && document.querySelector('#o-lmsearch').classList.contains('o-search-true')) {
            // If input is cleared, reset the search state
            document.querySelector('#o-lmsearch').classList.remove('o-search-true');
            document.querySelector('#o-lmsearch').classList.add('o-search-false');
          }
        });
        // Handle the blur event on the search field
        document.querySelector('.o-search-field').addEventListener('blur', () => {
          document.querySelector('.o-search-wrapper').classList.remove('active'); // Remove active state from search wrapper
          window.dispatchEvent(new Event('resize')); // Trigger resize event
        });
        // Handle the focus event on the search field
        document.querySelector('.o-search-field').addEventListener('focus', () => {
          document.querySelector('.o-search-wrapper').classList.add('active'); // Add active state to search wrapper
          window.dispatchEvent(new Event('resize')); // Trigger resize event
        });
      }
      // Bind click event on the map to handle feature selection
      map.on('click', this.onMapClick);
    },
    /**
     * Renders the suggestion list for the autocomplete.
     * @param {Object} suggestion - The suggestion object.
     * @param {string} input - The current input value.
     * @returns {HTMLElement} The suggestion list element.
     */
    renderList(suggestion, input) {
      const item = searchDb[suggestion.label] || {}; // Get the corresponding item from the search database
      const header = 'header' in item ? `<div class="heading">${item.header}</div>` : ''; // Add a header if present
      let optionsTemp = {};
      // Highlight the input match in the suggestion
      let html = input === '' ? suggestion.value : suggestion.value.replace(RegExp(Awesomplete.$.regExpEscape(input), 'gi'), '<mark>$&</mark>');
      html = `${header}<div class="suggestion">${html}</div>`;
      optionsTemp = {
        innerHTML: html,
        'aria-selected': 'false'
      };
      if ('header' in item) {
        optionsTemp.className = 'header'; // Add class if item has a header
      }
      return Awesomplete.$.create('li', optionsTemp); // Create and return the list element
    },
    /**
     * Clears the search input and results.
     */
    onClearSearch() {
      // Bind click event to the clear button to clear search results and input
      document.querySelector('#o-lmsearch-button-close').addEventListener('click', (e) => {
        this.clearSearchResults(); // Clear the search results from autocomplete
        this.clear(); // Clear any map overlays or features
        this.clearInfoMessage(); // Clear any informational messages
        document.querySelector('#o-lmsearch').classList.remove('o-search-true'); // Set search state to inactive
        document.querySelector('#o-lmsearch').classList.add('o-search-false');
        document.querySelector('#o-lmsearch .o-search-field').value = ''; // Clear the search input field
        document.querySelector('#o-lmsearch-button').blur(); // Remove focus from the search button
        e.preventDefault(); // Prevent default button behavior
      });
    }
  });
};

export default Main;
