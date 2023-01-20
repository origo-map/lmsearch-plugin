# LMSearch plugin

Search for Lantmäteriet Direct services via Origoserver API

Requires Origo 2.1.1 or later and a Origoserver

#### Example usage of LMsearch plugin

**index.html:**
```
    <head>
    	<meta charset="utf-8">
    	<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    	<meta http-equiv="X-UA-Compatible" content="IE=Edge;chrome=1">
    	<title>Origo exempel</title>
    	<link href="css/style.css" rel="stylesheet">
    	<link href="plugins/lmsearch.css" rel="stylesheet">
    </head>
    <body>
    <div id="app-wrapper">
    </div>
    <script src="js/origo.js"></script>
    <script src="plugins/lmsearch.min.js"></script>

    <script type="text/javascript">
    	//Init origo
    	var origo = Origo('index.json');
    	origo.on('load', function (viewer) {
        var lmsearch = Lmsearch({
          "geometryAttribute": "st_astext",
          "layerNameAttribute": "layer",
          "searchAttribute": "NAMN",
          "titleAttribute": "layer",
          "contentAttribute": "NAMN",
          "title": "Sökresultat",
          "hintText": "Sök adress, fastigheter...",
          "estateLookup": true,
          "estateLookupInitialState": "initial",
          "minLength": 4,
          "limit": 10,
          "maxZoomLevel": 10,
          "municipalities": "Sundsvall,Hudiksvall",
          "showFeature": "geometryOnly",
          "featureStyles": {
            "stroke": {
              "color": [100, 149, 237, 1],
              "width": 4,
              "lineDash": null
            },
            "fill": {
              "color": [100, 149, 237, 0.2]
            },
            "circle": {
              "radius": 7,
              stroke": {
                "color": [100, 149, 237, 1],
                "width": 2
              },
              "fill": {
                "color": [255, 255, 255, 1]
              }
            }
          },
          "labelFont": '7pt sans-serif',
          "labelFontColor": [100, 149, 237, 0.3],
          "labelBackgroundColor": [255, 255, 255, 0.5],
          "url_fastighet": "https://exempel.se/origoserver/lm/registerenheter?srid=3006",
          "url_adress": "https://exempel.se/origoserver/lm/addresses?srid=3006",
          "url_ort": "https://exempel.se/origoserver/lm/placenames?srid=3006",
          "url_yta": "https://exempel.se/origoserver/lm/registerenheter/objectId/enhetsomraden?srid=3006",
          "urlYtaKordinat": "https://exempel.se/origoserver/lm/enhetsomraden?x=easting&y=northing&srid=3006",
          "elasticSearch": {
            "url": "https://exempel.se/search/es/_search?_dc=1608289134133&page=1&start=0&limit=25",
            "name": "Example",
            "text": "_source.properties.TEXT",
            "searchIn": ["_source.properties.TEXT","_source.properties.PLANNUMMER"],
            "id": "_source.id",
            "geometry": "_source.geometry"
          },
          "pageEstateReportWidth": "700px",
          "pageEstateReportHeight": "500px",
          "pageEstateReportUrl": "https://example.com/origoserver/estate/inskrivning?objektid=",
          "pageEstateIconText": '<text font-size="1em" font-family="Arial" font-weight="bold" fill="black"><tspan x="5" dy="1.2em">Fastighets-</tspan><tspan x="5" dy="1.2em">rapport</tspan></text>',
          "pageEstateIconSize": [96, 48]
        });
        viewer.addComponent(lmsearch);
    	});
    </script>
```

#### Configuration options
The configuration options explained:

- geometryAttribute - the attribute in search json that holds the geometry.

- layerNameAttribute - the attribute in search json that specify which type the match is.

- searchAttribute - the attribute in search json that contains the name that should be shown.

- searchLabelText - the label for search input field, defualt is 'Sök'.

- titleAttribute - the attribute in search json that specify the title of the type.

- contentAttribute - the attribute in search json that contains the content for the search.

- title - the hint text shown in the search box.

- hintText - the hint text shown in the search box.

- estateLookup - sets if the estate lookup by click in map should be turned on, defualt is false.

- estateLookupInitialState - sets the initial state of the 'estate lookup by click function' choices are 'active' or 'initial', defualt is 'initial'.

- minLength - specifies the minimum length of how many characters should be entered before search, defualt is 4.

- limit - specifies how many matches should be shown. defualt is 9.

- maxZoomLevel - specifies which zoom level should be used when zooming in to when clicking on search hits. default is lowest resolution specified in config.

- municipalities - sets in which municipalities the search should be limited to. The value is a string delimited with comma sign.

- showFeature - specifies how matches should be shown. The options are 'geometryOnly' or 'popup', defualt is 'geometryOnly'.

- featureStyles - a object for the style when 'geometryOnly' is selected.

- labelFont - the font that should be used for the label on the estate in the estate click function, default is '7pt sans-serif'.

- labelFontColor - the font color that should be used for the label on the estate in the estate click function, default is '[100, 149, 237, 0.3]'.

- labelBackgroundColor - the background color that should be used for the label on the estate in the estate click function, default is '[255, 255, 255, 0.5]'.

- url_fastighet - the url to search for estates. If not set estate lookup will not be include in the searches.

- url_adress - the url to search for addresses. If not set address lookup will not be include in the searches.

- url_ort - the url to search for places. If not set placenames lookup will not be include in the searches.

- url_yta - the url to retrieve the geometry for a estate.

- urlYtaKordinat - the url to retrieve the estate for a coordinate.

- elasticSearch - a object for the configuration of searching a ElasticSearch index.

		url - the url to the ElasticSearch index endpoint.

		name - the name of the search, it's used as header in the search result.

		text - the property which is to be used as text shown in the search result.

		searchIn - a array of the property which should be searched in to find a match.

		id - the property which is to be used as a id to be able to exclude duplicates in the search result.

		geometry - the property which holds the geometry.

- pageEstateReportWidth - the width of the page for the estate report, default is '700px'

- pageEstateReportHeight - the height of the page for the estate report, default is '500px'

- pageEstateReportUrl - the URL to the page for the estate report, default is empty string.

- pageEstateIconText - the text which should be displayed withen estate report icon, default is `<text x="5" y="40" font-size="45" font-family="Arial" fill="black">FI</text>`.

- pageEstateIconSize - an array with the width and height, in pixels, to use for the estate icon rectangle, default is `[50, 50]`.

- searchEnabled - sets if the search input should be turned on, makes it possible only to use the estate lookup without the search function, default is true.

- hideWhenEmbedded - sets if the search input and estate lookup button should be hidden when map is embedded, default is false.

#### Coordinate reference systems

The default coordinate reference system is SWEREF99 TM (EPSG:3006).

If your map uses a different coordinate reference systems you must specify which is used in the calls to the Origoserver search API. Add a query parameter srid and the EPSG number in the URL

     For example if SWEREF99 17 15 (EPSG:3014) is used:

     https://exempel.se/origoserver/lm/registerenheter?lmuser=test&srid=3014
     https://exempel.se/origoserver/lm/addresses?lmuser=test&srid=3014
     https://exempel.se/origoserver/lm/placenames?lmuser=test&srid=3014
     https://exempel.se/origoserver/lm/registerenheter/objectId/enhetsomraden?lmuser=test&srid=3014

Valid coordinate reference systems are

 * SWEREF99 TM **EPSG:3006**
 * SWEREF99 12 00 **EPSG:3007**
 * SWEREF99 13 30 **EPSG:3008**
 * SWEREF99 15 00 **EPSG:3009**
 * SWEREF99 16 30 **EPSG:3010**
 * SWEREF99 18 00 **EPSG:3011**
 * SWEREF99 14 15 **EPSG:3012**
 * SWEREF99 15 45 **EPSG:3013**
 * SWEREF99 17 15 **EPSG:3014**
 * SWEREF99 18 45 **EPSG:3015**
 * SWEREF99 20 15 **EPSG:3016**
 * SWEREF99 21 45 **EPSG:3017**
 * SWEREF99 23 15 **EPSG:3018**
 * WGS 84 / Pseudo-Mercator -- Spherical Mercator **EPSG:3857**
 * WGS84 - World Geodetic System 1984, used in GPS **EPSG:4326**

 If others are need please update Origoserver.
