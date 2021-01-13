import Origo from 'Origo';
import Main from './lmsearch/Main';

const Lmsearch = function Lmsearch(options = {}) {
  const {
    geometryAttribute,
    layerNameAttribute,
    searchAttribute,
    titleAttribute,
    contentAttribute,
    title,
    hintText,
    estateLookup,
    estateLookupInitialState,
    minLength,
    limit,
    maxZoomLevel,
    municipalities,
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
    elasticSearch
  } = options;

  let viewer;
  let search;

  return Origo.ui.Component({
    name: 'lmsearch',
    onAdd(evt) {
      viewer = evt.target;

      search = Main({
        viewer,
        geometryAttribute,
        layerNameAttribute,
        searchAttribute,
        titleAttribute,
        contentAttribute,
        title,
        hintText,
        estateLookup,
        estateLookupInitialState,
        minLength,
        limit,
        maxZoomLevel,
        municipalities,
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
        elasticSearch
      });
      this.addComponent(search);
      this.render();
    },
    onInit() {
      this.on('render', this.onRender);
    },
    render() {
    }
  });
};

export default Lmsearch;
