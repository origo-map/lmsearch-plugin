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
           "minLength": 4,
           "limit": 10,
          "municipalities": "Sundsvall,Hudiksvall",
			"url_fastighet": "https://exempel.se/origoserver/lm/registerenheter?lmuser=test",
			"url_adress": "https://exempel.se/origoserver/lm/addresses?lmuser=test",
			"url_ort": "https://exempel.se/origoserver/lm/placenames?lmuser=test",
			"url_yta": "https://exempel.se/origoserver/lm/registerenheter/objectId/enhetsomraden?lmuser=test"
        });
    		viewer.addComponent(lmsearch);
    	});
    </script>
```

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
