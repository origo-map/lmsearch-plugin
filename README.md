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
