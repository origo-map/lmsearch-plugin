import communeCodes from './communecodes';

const _ = require('lodash');
/*
  {
   "NAMN": "Erik vallers väg 12a",
   "GID": 1027,
   "TYPE": "hallstakartan.tk_s_ads_p",
   "layer": "Adress",
   "st_astext": "POINT(134690.511 6610941.918)"
 }
 */

/**
 * Prepares a URI-encoded string of municipalities from a comma-separated input string.
 * @function
 * @name prepMunicipalities
 * @param {string} municipalities - Comma-separated list of municipality names.
 * @returns {string} URI-encoded list of municipalities.
 */
function prepMunicipalities(municipalities) {
  // Split the municipalities string into an array and trim whitespace from each element
  const results = [];
  let municipalitiesTokenized = [];
  if (municipalities) {
    municipalitiesTokenized = municipalities.split(',');
  }
  for (let i = 0; i < municipalitiesTokenized.length; i += 1) {
    results.push(municipalitiesTokenized[i].trim());
  }
  // Encode the array as a URI component
  return encodeURI(results.join(','));
}

/**
 * Converts municipality names to commune codes.
 * @function
 * @name prepCommuneCodes
 * @param {string} municipalities - Comma-separated list of municipality names.
 * @returns {string} Comma-separated list of commune codes.
 */
function prepCommuneCodes(municipalities) {
  // Convert municipalities into commune codes using communeCodes.getCommuneCode
  const results = [];
  let municipalitiesTokenized = [];
  if (municipalities) {
    municipalitiesTokenized = municipalities.split(',');
  }
  for (let i = 0; i < municipalitiesTokenized.length; i += 1) {
    results.push(communeCodes.getCommuneCode(municipalitiesTokenized[i].trim()));
  }
  return results.join(',');
}

/**
 * Compares two address objects by their street names, ignoring house numbers.
 * @function
 * @name compareAddress
 * @param {Object} a - First address object.
 * @param {Object} b - Second address object.
 * @returns {number} -1 if a < b, 1 if a > b, 0 if equal.
 */
function compareAddress(a, b) {
  // Compare two addresses by their street names, ignoring the first and last components (e.g., house numbers)
  const addressString1 = a.NAMN;
  const addressString2 = b.NAMN;

  const str1 = addressString1.split(' ');
  const str2 = addressString2.split(' ');

  // Remove the first and last components, assuming they are house numbers
  str1.pop();
  str2.pop();

  str1.shift();
  str2.shift();

  const streetName1 = str1.join(' ');
  const streetName2 = str2.join(' ');

  // Compare the street names
  if (streetName1 < streetName2) {
    return -1;
  }
  if (streetName1 > streetName2) {
    return 1;
  }
  return 0;
}

/**
 * Compares two property objects by their names.
 * @function
 * @name compareFastighet
 * @param {Object} a - First property object.
 * @param {Object} b - Second property object.
 * @returns {number} -1 if a < b, 1 if a > b, 0 if equal.
 */
function compareFastighet(a, b) {
  // Simple comparison based on the property name (NAMN)
  if (a.NAMN < b.NAMN) {
    return -1;
  }
  if (a.NAMN > b.NAMN) {
    return 1;
  }
  return 0;
}

/**
 * Removes erroneous components from an object based on a query string.
 * @function
 * @name removeErroniousComponents
 * @param {Object} object - The object to clean.
 * @param {string} q - The query string used for filtering properties.
 */
function removeErroniousComponents(object, q) {
  // Remove properties from the object if they don't match the first word in the query
  const q2 = q.split(' ');
  const substrRegex = new RegExp(q2[0], 'i');
  for (const property in object) {
    if (!substrRegex.test(property)) {
      delete object[property];
    }
  }
}

/**
 * Retrieves a nested attribute from an entity object using dot notation.
 * @function
 * @name getAttribute
 * @param {Object} entity - The object from which to retrieve the attribute.
 * @param {string} key - The key representing the nested attribute (e.g., 'property.subproperty').
 * @returns {*} The value of the nested attribute, or an empty string if not found.
 */
function getAttribute(entity, key) {
  let retVal = '';
  let keys = '';
  if (typeof key !== 'undefined' && key !== null) {
    if (key.includes('.')) {
      keys = key.split('.');
      let tempVal = entity[keys[0]];
      for (let index = 1; index < keys.length; index += 1) {
        tempVal = tempVal[keys[index]];
      }
      retVal = tempVal;
    } else {
      retVal = entity[key];
    }
  }
  return retVal;
}

/**
 * Removes basic authentication from a URL and stores the username and password in variables.
 *
 * @param {string} url - The URL containing basic authentication.
 * @returns {Object} An object containing the modified URL, username, and password.
 */
function removeBasicAuth(url) {
  // Use a regular expression to match the username and password in the URL
  const authRegex = /^(https?:\/\/)([^:]+):([^@]+)@(.+)$/;
  const match = url.match(authRegex);

  if (match) {
    // Extract the protocol, username, password, and the rest of the URL
    const protocol = match[1];
    const username = match[2];
    const password = match[3];
    const restOfUrl = match[4];

    // Construct the URL without the authentication part
    const modifiedUrl = protocol + restOfUrl;

    // Return an object containing the modified URL, username, and password
    return {
      url: modifiedUrl,
      username: username,
      password: password
    };
  } else {
    // Return the original URL if no authentication was found
    return {
      url: url,
      username: null,
      password: null
    };
  }
}

/**
 * Extracts property names from a given URL for properties (fastigheter).
 * @function
 * @name extractNames
 * @param {string} urlFastighet - The URL to fetch property data from.
 * @returns {Promise<Array>} A promise that resolves to an array of property names.
 */
const extractNames = async function extractNames(urlFastighet) {
  if (!urlFastighet) return [];

  try {
    const response = await fetch(urlFastighet);
    if (!response.ok) {
      console.log('Något gick fel, kunde inte hämta Fastigheter.');
      return [];
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      // Map the data into a list of matches
      const matches = data.map((obj) => ({
        NAMN: obj.properties.name,
        id: obj.properties.objid,
        TYPE: 'hallstakartan.tk_s_ads_p',
        layer: 'Fastighet',
      }));

      // Assuming compareFastighet is defined elsewhere to sort the matches
      // matches.sort(compareFastighet);
      return matches;
    } else {
      console.warn('Svar är inte en array.');
      return [];
    }
  } catch (error) {
    console.log('Något gick fel:', error);
    return [];
  }
};

/**
 * Extracts addresses from a given URL.
 * @function
 * @name extractAddresses
 * @param {string} urlAdress - The URL to fetch address data from.
 * @param {string} q - The search query string.
 * @param {number} limit - The maximum number of results to return.
 * @returns {Promise<Array>} A promise that resolves to an array of addresses.
 */
const extractAddresses = async function extractAddresses(urlAdress, q, limit) {
  if (urlAdress) {
    try {
      const response = await fetch(urlAdress);
      if (!response.ok) {
        console.log('Något gick fel, kunde inte hämta Adresser.');
        return [];
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        return [];
      }

      // An array that will be populated with substring matches
      const preliminaryMatches = [];
      let i = 0;
      /* Iterate through the pool of strings and group by street name for better distribution of results.
       * In other words all addresses coming from the same street name will be placed in a single group. this gives us a
       * better possibility of evenly spreading the results.
       */
      const searchResultsBasedOnStreetName = {};
      data.forEach((arrObj) => {
        const str = arrObj[1].split(' ');
        str.pop();
        str.pop();
        str.shift();
        const streetName = str.join(' ');
        if (!searchResultsBasedOnStreetName[streetName]) {
          searchResultsBasedOnStreetName[streetName] = [];
        }
        searchResultsBasedOnStreetName[streetName].push(arrObj);
      });
      // Iterate through the grouped results to collect matches, ensuring an even spread of results
      do {
        for (const streetName in searchResultsBasedOnStreetName) {
          let nextObj = searchResultsBasedOnStreetName[streetName][i];
          if (nextObj) {
            preliminaryMatches.push(nextObj);
          }
        }
        i += 1;
      } while (preliminaryMatches.length < limit && i <= preliminaryMatches.length && i < 100);
      // Transform the array objects into standard geojson objects and push to matches array
      const matches = preliminaryMatches.map(arrObj => ({
        NAMN: arrObj[1],
        TYPE: 'hallstakartan.tk_s_ads_p',
        layer: 'Adress',
        st_astext: `POINT(${arrObj[2]} ${arrObj[3]})`,
        geom_format: 'WKT'
      }));
      matches.sort(compareAddress);
      return matches;
    } catch (err) {
      console.log(`Något gick fel, kunde inte hämta Adresser. Error: ${err}`);
      return [];
    }
  }
  return [];
};

/**
 * Extracts place names (Orter) from a given URL.
 * @function
 * @name extractOrter
 * @param {string} urlOrt - The URL to fetch place data from.
 * @param {string} q - The search query string.
 * @param {number} limit - The maximum number of results to return.
 * @returns {Promise<Array>} A promise that resolves to an array of places.
 */
const extractOrter = async function extractOrter(urlOrt, q, limit) {
  if (urlOrt) {
    try {
      const response = await fetch(urlOrt);
      if (!response.ok) {
        console.log('Något gick fel, kunde inte hämta Orter.');
        return [];
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        return [];
      }

      // Regex used to determine if a string contains the substring 'q'
      const substrRegex = new RegExp(`^${q}`, 'i');
      const substrRegexGeneral = new RegExp(q, 'i');
      // Iterate through the pool of strings and add matches to the 'matches' array

      // An array that will be populated with substring matches
      const matches = [];

      data.forEach((obj) => {
        if (substrRegex.test(obj.properties.name)) {
          matches.push({
            NAMN: obj.properties.name,
            id: obj.properties.id,
            layer: 'Ort',
            st_astext: `POINT(${obj.geometry.coordinates[1]} ${obj.geometry.coordinates[0]})`,
            geometry_format: 'WKT'
          });
        }
      });
      // If fewer matches than the limit, add more matches using a general regex
      if (matches.length < limit) {
        data.forEach((obj) => {
          if (substrRegexGeneral.test(obj.properties.name)) {
            matches.push({
              NAMN: obj.properties.name,
              id: obj.properties.id,
              TYPE: 'hallstakartan.tk_s_ads_p',
              layer: 'Ort',
              st_astext: `POINT(${obj.geometry.coordinates[1]} ${obj.geometry.coordinates[0]})`,
              geometry_format: 'WKT'
            });
          }
        });
      }
      // Remove duplicate matches based on the 'id' field
      const duplicateFreeMatches = _.uniqBy(matches, obj => obj.id);
      return duplicateFreeMatches;
    } catch (err) {
      console.log('Något gick fel, kunde inte hämta Orter.');
      return [];
    }
  }
  return [];
};

/**
 * Requests data from an ElasticSearch index and extracts matches.
 * @function
 * @name extractES
 * @param {Object} elasticSearch - ElasticSearch configuration containing URL and search parameters.
 * @param {string} q - The search query string.
 * @param {number} limit - The maximum number of results to return.
 * @param {Object} viewer - Viewer object to handle geographic transformations.
 * @returns {Promise<Array>} A promise that resolves to an array of search results.
 */
const extractES = async function extractES(elasticSearch, q, limit, viewer) {
  if (elasticSearch) {
    let url = elasticSearch.url;
    url += `&q=%22${encodeURI(q)}%22*`;
    const urlWithoutBA = removeBasicAuth(url);
    try {
      const response = await fetch(urlWithoutBA.url, {
        method:'GET', 
        headers: {'Authorization': 'Basic ' + btoa(urlWithoutBA.username + ":" + urlWithoutBA.password)}
      });
      if (!response.ok) {
        console.log(`Något gick fel, kunde inte hämta ${elasticSearch.name}!`);
        return [];
      }

      const data = await response.json();
      if (!Array.isArray(data.hits.hits)) {
        return [];
      }

      // Regex used to determine if a string contains the substring 'q'
      const substrRegex = new RegExp(`^${q}`, 'i');
      const substrRegexGeneral = new RegExp(q, 'i');
      // Iterate through the pool of strings and add matches to the 'matches' array

      // An array that will be populated with substring matches
      const matches = [];
      data.hits.hits.forEach((obj) => {
        let found = false;
        elasticSearch.searchIn.forEach((search) => {
          found = substrRegex.test(getAttribute(obj, search));
          if (found) {
            matches.push({
              NAMN: getAttribute(obj, elasticSearch.text),
              id: getAttribute(obj, elasticSearch.id),
              layer: elasticSearch.name,
              st_astext: viewer.getMapUtils().geojsonToWkt(getAttribute(obj, elasticSearch.geometry)),
              geometry_format: 'WKT'
            });
          }
          found = false;
        });
      });
      // If fewer matches than the limit, add more matches using a general regex
      if (matches.length < limit) {
        data.hits.hits.forEach((obj) => {
          let found = false;
          elasticSearch.searchIn.forEach((search) => {
            found = substrRegexGeneral.test(getAttribute(obj, search));
          });
          if (found) {
            matches.push({
              NAMN: getAttribute(obj, elasticSearch.text),
              id: getAttribute(obj, elasticSearch.id),
              TYPE: 'hallstakartan.tk_s_ads_p',
              layer: elasticSearch.name,
              st_astext: viewer.getMapUtils().geojsonToWkt(getAttribute(obj, elasticSearch.geometry)),
              geometry_format: 'WKT'
            });
          }
        });
      }
      // Remove duplicate matches based on the 'id' field
      const duplicateFreeMatches = _.uniqBy(matches, obj => obj.id);
      return duplicateFreeMatches;
    } catch (err) {
      console.log(`Något gick fel, kunde inte hämta ${elasticSearch.name}! ${err.statusText}`);
      return [];
    }
  }
  return [];
};

/**
 * Makes a request to multiple endpoints to gather suggestions.
 * @function
 * @name makeRequest
 * @param {Object} prepOptions - Options to prepare the request, including URLs and search parameters.
 * @param {string} q - The search query string.
 * @param {Object} viewer - Viewer object for geographic transformations.
 * @returns {Promise<Array>} A promise that resolves to an array of suggestions from multiple sources.
 */
const makeRequest = function makeRequest(prepOptions, q, viewer) {
  // Prepare municipality data for the request
  const municipalities = prepMunicipalities(prepOptions.municipalities);
  const limit = prepOptions.limit;
  let urlFastighet = '';
  if (prepOptions.urlFastighet) {
    urlFastighet = prepOptions.urlFastighet;
    urlFastighet += `&q=${municipalities} ${encodeURI(q)}`;
  }

  let urlAdress = '';
  if (prepOptions.urlAdress) {
    urlAdress = prepOptions.urlAdress;
    let statusAddress = '';
    if (typeof prepOptions.statusAddress !== 'undefined') {
      statusAddress = `&statusAddress=${encodeURI(prepOptions.statusAddress)}`;
    }
    const codes = prepCommuneCodes(prepOptions.municipalities);
    urlAdress += `&municipalityCodes=${codes}&q=${encodeURI(q)}${statusAddress}`;
  }

  let urlOrt = '';
  if (prepOptions.urlOrt) {
    urlOrt = prepOptions.urlOrt;
    const codes = prepCommuneCodes(prepOptions.municipalities);
    urlOrt += `&kommunkod=${codes}&q=${encodeURI(q)}`;
  }

  // Make parallel requests to different endpoints and return the combined result
  return Promise.all([
    extractNames(urlFastighet),
    extractAddresses(urlAdress, q, limit),
    extractOrter(urlOrt, q, limit),
    extractES(prepOptions.elasticSearch, q, limit, viewer)
  ])
    .then(data => data)
    .catch((err) => {
      throw new Error(`Något gick fel, kunde inte hämta data: ${err}`);
    });
};

export default {
  extractNames,
  extractAddresses,
  extractOrter,
  extractES,
  makeRequest
};
