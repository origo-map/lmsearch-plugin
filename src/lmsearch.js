// Importing Origo framework and the main module for the search functionality
import Origo from 'Origo';
import Main from './lmsearch/main';

// Defining the Lmsearch component as a function
const Lmsearch = function Lmsearch(options = {}) {
  // Destructuring settings provided in the options parameter
  const {
    geometryAttribute, // Attribute for geometry
    layerNameAttribute, // Attribute for layer name
    searchAttribute, // Attribute used for performing searches
    titleAttribute, // Attribute for displaying titles
    contentAttribute, // Attribute for displaying detailed content
    title, // Title of the search component
    hintText, // Hint text for the user (e.g., "Search for an address")
    searchLabelText, // Label text next to the search field
    estateLookup, // Whether property lookup is enabled
    estateLookupInitialState, // Initial state for property lookup
    minLength, // Minimum number of characters to start a search
    limit, // Maximum number of search results to return
    maxZoomLevel, // Maximum zoom level to display search results
    municipalities, // List of municipalities to include in the search
    statusAddress, // Whether to include address status in search results
    showFeature, // Whether to display the search result as a feature on the map
    featureStyles, // Styles for displaying search results as features
    labelFont, // Font for labels
    labelFontColor, // Text color for labels
    labelBackgroundColor, // Background color for labels
    urlFastighet, // URL for property data
    urlAdress, // URL for address data
    urlOrt, // URL for locality data
    urlYta, // URL for area data to include
    urlYtaKordinat, // URL for coordinates representing areas
    elasticSearch, // Configuration for ElasticSearch integration
    pageEstateReportWidth, // Width for estate report window
    pageEstateReportHeight, // Height for estate report window
    pageEstateReportUrl, // URL for generating property reports
    pageEstateIconText, // Text displayed in estate report icons
    pageEstateIconSize, // Size of the estate report icon
    searchEnabled, // Whether the search functionality is enabled
    hideWhenEmbedded // Whether to hide the component when embedded
  } = options;

  let viewer; // Holds a reference to the Origo viewer
  let search; // Holds a reference to the search functionality

  // Returning a custom Origo component
  return Origo.ui.Component({
    name: 'lmsearch', // Name of the component
    onAdd(evt) {
      // Executes when the component is added to the Origo viewer
      viewer = evt.target; // Assigns the Origo viewer to the variable

      // Initializes the main module for the search functionality
      search = Main({
        viewer, // Reference to the Origo viewer
        geometryAttribute,
        layerNameAttribute,
        searchAttribute,
        titleAttribute,
        contentAttribute,
        title,
        hintText,
        searchLabelText,
        estateLookup,
        estateLookupInitialState,
        minLength,
        limit,
        maxZoomLevel,
        municipalities,
        statusAddress,
        showFeature,
        featureStyles,
        labelFont,
        labelFontColor,
        labelBackgroundColor,
        urlFastighet,
        urlAdress,
        urlOrt,
        urlYta,
        urlYtaKordinat,
        elasticSearch,
        pageEstateReportWidth,
        pageEstateReportHeight,
        pageEstateReportUrl,
        pageEstateIconText,
        pageEstateIconSize,
        searchEnabled,
        hideWhenEmbedded
      });

      // Adds the search module as a sub-component
      this.addComponent(search);

      // Renders the component
      this.render();
    },
    onInit() {
      // Executes when the component is initialized
      // Sets up an event listener for the render event and triggers onRender (can be added later)
      this.on('render', this.onRender);
    },
    render() {
      // Rendering logic for the component
      // TODO: Add code to create UI elements, such as the search field
    }
  });
};

// Exporting the Lmsearch component as the default export
export default Lmsearch;
