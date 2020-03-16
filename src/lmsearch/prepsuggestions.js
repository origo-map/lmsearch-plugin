// this module is slightly different from prepare suggestions and is used for awsomeplete

// this module request data from https://karta.e-tjansteportalen.se and returns an array
// of suggestions to be shown for the search field

import $ from 'jquery';
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

function prepMunicipalities(municipalities) {
  const results = [];
  let municipalitiesTokenized = [];
  if (municipalities) {
    municipalitiesTokenized = municipalities.split(',');
  }
  for (let i = 0; i < municipalitiesTokenized.length; i += 1) {
    results.push(municipalitiesTokenized[i].trim());
  }
  return encodeURI(results.join(','));
}

function prepCommuneCodes(municipalities) {
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

function compareAddress(a, b) {
  const addressString1 = a.NAMN;
  const addressString2 = b.NAMN;

  const str1 = addressString1.split(' ');
  const str2 = addressString2.split(' ');

  str1.pop();
  str2.pop();

  str1.shift();
  str2.shift();

  const streetName1 = str1.join(' ');
  const streetName2 = str2.join(' ');

  if (streetName1 < streetName2) {
    return -1;
  }
  if (streetName1 > streetName2) {
    return 1;
  }
  return 0;
}

function compareFastighet(a, b) {
  if (a.NAMN < b.NAMN) {
    return -1;
  }
  if (a.NAMN > b.NAMN) {
    return 1;
  }
  return 0;
}

function removeErroniousComponents(object, q) {
  const q2 = q.split(' ');
  const substrRegex = new RegExp(q2[0], 'i');
  for (let property in object) {
    if (!substrRegex.test(property)) {
      delete object[property];
    }
  }
}

// Fastigheter
// OBS: response from lm is a list of features here
const extractNames = function extractNames(urlFastighet) {

  const dataPromise = $.ajax({
    url: urlFastighet,
    dataType: 'json'
  });

  return dataPromise.then((response) => {
    // an array that will be populated with substring matches
    // iterate and add the whole object to the 'matches' array plus a dataType identifier

    let matches = [];
    // sometimes server returns an empty object instead of a list. for example if we search "fisk"
    // OBS!  response.constructor.name does not work in IE
    if ( response !== null && Object.prototype.toString.call( response ) === '[object Array]' ) {

      matches = response.map((obj) => {
        return {
          NAMN: obj.properties.name,
          id: obj.properties.objid,
          TYPE: 'hallstakartan.tk_s_ads_p',
          layer: 'Fastighet',
          // this line has no effect bcuz the geometry will be requested later and this won't be used at all
          st_astext: 'POINT(134690.511 6610941.918)',
          geom_format: 'WKT'
        }
      });
      matches.sort(compareFastighet);
    }
    return matches;
  }).fail(() => {
    console.log('Något gick fel, kunde inte hämta Fastigheter.');
  });
};

// Adresser
// OBS: response from lm is a list here:
const extractAddresses = function extractAddresses(urlAdress, q, limit) {

  const dataPromise = $.ajax({
    url: urlAdress,
    dataType: 'json'
  });

  return dataPromise.then((response) => {

    if (response === null || Object.prototype.toString.call(response) !== '[object Array]') {
      return [];
    }

    // an array that will be populated with substring matches
    let preliminaryMatches = [];
    let i = 0;
    // iterate through the pool of strings and populate the object below by different groups based on the street names!
    // in other words all addresses coming from the same street name will be placed in a single group. this gives us a
    // better possibility of evenly spreading the results.
    let searchResultsBasedOnStreetName = {};
    $.each(response, (i, arrObj) => {
      const str = arrObj[1].split(' ');
      str.pop();
      str.pop();
      str.shift();
      let streetName = str.join(' ');
      if (!searchResultsBasedOnStreetName[streetName]) {
        searchResultsBasedOnStreetName[streetName] = [];
      }
      searchResultsBasedOnStreetName[streetName].push(arrObj);
    });
    // this condition is checked because of the fault in the response from lm.
    // for example for the query 'stor' we get Brunne and Hundsjö in the answer also!!!
    removeErroniousComponents(searchResultsBasedOnStreetName, q);
    do {
      for (let streetName in searchResultsBasedOnStreetName) {
        let nextObj = searchResultsBasedOnStreetName[streetName][i];
        if (nextObj) {
          preliminaryMatches.push(nextObj);
        }
      }
      i += 1;
    } while (preliminaryMatches.length < limit && i <= preliminaryMatches.length && i < 100);

    // array objects are transformed into standards geojson objects and the pushed to matches array
    const matches = preliminaryMatches.map((arrObj) => {
      return {
        NAMN: arrObj[1],
        TYPE: 'hallstakartan.tk_s_ads_p',
        layer: 'Adress',
        st_astext: `POINT(${arrObj[2]} ${arrObj[3]})`,
        geom_format: 'WKT'
      };
    });
    matches.sort(compareAddress);
    return matches;
  }).fail((err) => {
    console.log(`Något gick fel, kunde inte hämta Adresser. Error: ${err}`);
  });
};

// Orter
// OBS: response from lm is a list of geojson objects here:
const extractOrter = function extractOrter(urlOrt, q, limit) {

  let dataPromise = $.ajax({
    url: urlOrt,
    dataType: 'json'
  });

  return dataPromise.then((response) => {

    if (response === null || Object.prototype.toString.call(response) !== '[object Array]') {
      return [];
    }

    // regex used to determine if a string contains the substring 'q'
    let substrRegex = new RegExp('^' + q, 'i');
    let substrRegexGeneral = new RegExp(q, 'i');
    // iterate through the pool of strings and for any string that
    // contains the substring 'q', add it to the 'matches' array

    // an array that will be populated with substring matches
    let matches = [];

    response.forEach((obj) => {
      if (substrRegex.test(obj.properties.name)) {
        matches.push({
          NAMN: obj.properties.name,
          id: obj.properties.id,
          // "TYPE": "hallstakartan.tk_s_ads_p",
          layer: 'Ort',
          st_astext: `POINT(${obj.geometry.coordinates[1]} ${obj.geometry.coordinates[0]})`,
          geometry_format: 'WKT'
        });
      }
    });
    if (matches.length < limit) {
      response.forEach((obj) => {
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
    const duplicateFreeMatches = _.uniqBy(matches, obj => obj.id);
    return duplicateFreeMatches;
  }).fail(() => {
    console.log('Något gick fel, kunde inte hämta Orter.');
  });
};

const makeRequest = function makeRequest(prepOptions, q) {
  const municipalities = prepMunicipalities(prepOptions.municipalities);
  const limit = prepOptions.limit;
  let urlFastighet = prepOptions.urlFastighet;
  urlFastighet += `&q=${municipalities} ${encodeURI(q)}`;

  let urlAdress = prepOptions.urlAdress;
  urlAdress += `&q=${municipalities} ${encodeURI(q)}`;

  let urlOrt = prepOptions.urlOrt;
  const codes = prepCommuneCodes(prepOptions.municipalities);
  urlOrt += `&kommunkod=${codes}&q=${encodeURI(q)}`;

  return Promise.all([
    extractNames(urlFastighet),
    extractAddresses(urlAdress, q, limit),
    extractOrter(urlOrt, q, limit)
  ])
    .then((data) => {
      return data;
    })
    .catch((err) => {
      throw new Error('Något gick fel, kunde inte hämta data');
    });
};

export default {
  extractNames,
  extractAddresses,
  extractOrter,
  makeRequest
};
