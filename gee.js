// GEE Script per il calcolo del bilancio idrico

var soilG = soil.geometry();
// Definizione dei confini con buffer negativo di 2
var confiniBuffered = Confini.buffer(-2);
var studyArea = ee.FeatureCollection(soil).geometry(); 
var clip = studyArea.intersection(Confini, ee.ErrorMargin(1));

var start_date = "2024-01-09"
var finish_date = "2024-01-18"

// Parametri di visualizzazione
var min_v = 0.1;
var max_v = 0.9;
var palette = ['FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718',
               '74A901', '66A000', '529400', '3E8601', '207401', '056201',
               '004C00', '023B01', '012E01', '011D01', '011301'];

// Caricamento dell'immagine Sentinel-2 con filtri per data, posizione e copertura nuvolosa
var sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterDate(start_date, finish_date)
  .filterBounds(clip)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
  .map(function(image) {
    return image.clip(clip);
  });
  
// PRECIPITATION--------------------------------------------------------------------

var mm_rain = 23  // data taken by meteo stations

// -----------------------------------------------------------------------------------
print(sentinel2);

// Funzione per calcolare NDVI
var calculateNDVI = function(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
};

// Applicare la funzione NDVI alla collezione Sentinel-2
var withNDVI = sentinel2.map(calculateNDVI);

// Composizione NDVI (media delle immagini)
var ndviComposite = withNDVI.select('NDVI').mean().clip(clip);

// Visualizzazione NDVI

Map.addLayer(ndviComposite, {min: min_v, max: max_v, palette: palette}, 'NDVI Composite');

// Calcolo Kc moltiplicando NDVI per 5 e aggiungendo 1
var kcComposite = ndviComposite.multiply(5).add(1).rename('Kc');

// Visualizzazione Kc
Map.addLayer(kcComposite, {min: 0, max: 6, palette: palette}, 'Kc Composite');

// Definizione di un valore arbitrario per ET0 (da sostituire con dati reali in futuro)
var et0 = 5.5;

// Calcolo ET moltiplicando Kc per ET0
var et = kcComposite.multiply(et0).rename('ET');

// Visualizzazione ET
Map.addLayer(et, {min: min_v, max: max_v, palette: palette}, 'ET Composite');
Map.addLayer(clip, {}, "Clip")
// Stampa dei compositi per analisi
print('NDVI Composite:', ndviComposite);
print('Kc Composite:', kcComposite);
print('ET Composite:', et);

// Intersezione dei confini con il suolo
var soilWithinConfini = soil.filterBounds(clip);
//print(soilWithinConfini);
//Map.addLayer(soilWithinConfini, {}, "soilWithinConfini");

// Funzione per calcolare le occorrenze dei valori stringa
var calculateStringOccurrences = function(feature) {
  var soilInFeature = soilWithinConfini.filterBounds(feature.geometry());

  // Estrai valori distinti per "tess_descr" e "schel_desc"
  var tessDescrValues = soilInFeature.aggregate_array('tess_descr').distinct();
  var schelDescValues = soilInFeature.aggregate_array('schel_desc').distinct();

  // Imposta i valori distinti come proprietà della feature
  feature = feature.set('tess_descr', tessDescrValues);
  feature = feature.set('schel_desc', schelDescValues);

  return feature;
};

// Estrai singoli poligoni dalla geometria collezione dei confini
var polygons = clip.geometries().map(function(geometry) {
  return ee.Feature(ee.Geometry(geometry));
});

// Converti la lista di geometrie in una FeatureCollection
var confiniBufferedCollection = ee.FeatureCollection(polygons);

// Calcolo delle statistiche del suolo per ogni poligono nei confini
var soilStats = confiniBufferedCollection.map(calculateStringOccurrences);

// Visualizzazione dei confini con le statistiche del suolo
Map.addLayer(soilStats, {}, "Confini con Statistiche del Suolo");

// Stampa dei compositi per analisi
print('NDVI Composite:', ndviComposite);
print('Kc Composite:', kcComposite);
print('ET Composite:', et);
print('Soil within Confini:', soilWithinConfini);
print('Soil Stats:', soilStats);

// --------------------------------------------------------------- //

// ------ RANGES FOR EACH TYPE OF REGION, WHAT IS THE LEVEL
var soglia_minima_ok = 0.5 // if > of this then ok
// ----
// Funzione per calcolare il bilancio idrico per ogni confine
var calculateWaterBalance = function(feature) {
  var meanET = et.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: feature.geometry(),
    scale: 30,
    maxPixels: 1e9
  }).get('ET');
  var balance = ee.Number(mm_rain).subtract(meanET); 

  // get the list schel_desc from the feature
    var schel_desc = feature.get('schel_desc');

    // check if schel_desc contains the string "comune (5-15%)"
    //var isCommon = schel_desc.contains('comune (5-15%)');
    //var isFrequent = schel_desc.contains('frequente (15-35%)');
    //var isRare = schel_desc.contains('scarso (1-5%)');
    //var isAbsent = schel_desc.contains('assente (<1%)');
    //var isAbbondant = schel_desc.contains('abbondante (35-60%)');
    //var notSoil = schel_desc.contains('Non suolo');
    
    // Use the Filter function to check if is in list
    var isCommon = ee.String(schel_desc).match('comune (5-15%)');
    var isFrequent = ee.String(schel_desc).match('frequente (15-35%)');
    var isRare = ee.String(schel_desc).match('scarso (1-5%)');
    var isAbsent = ee.String(schel_desc).match('assente (<1%)');
    var isAbbondant = ee.String(schel_desc).match('abbondante (35-60%)');
    var notSoil = ee.String(schel_desc).match('Non suolo');
    

    // Get the range
    var highRisk = isAbsent.or(isRare).or(isCommon);
    var mediumRisk = isFrequent;
    var lowRisk = isAbbondant;

    var color;
    if(notSoil){
        color = "black";
    }else{
        if (balance.gte(soglia_minima_ok)) {
            color = "green";
        }else{
            if (lowRisk){
                color = "green";
            }else if(mediumRisk){
                color = "orange";
            }else{
                color = "red";
            }
        }
    }

  feature = feature.set('water_balance', balance);
  feature = feature.set('color', color);

  return feature;
};

// Calcolo del bilancio idrico per ogni confine
var confiniWithWaterBalance = confiniBufferedCollection.map(calculateWaterBalance);

// Visualizzazione dei confini con il bilancio idrico
var visParams = {
  palette: ['red', 'orange', 'green'],
  min: 0,
  max: 1,
  opacity: 0.7
};

var styledConfini = confiniWithWaterBalance.map(function(feature) {
  return feature.set('style', {
    color: feature.get('color'),
    width: 2
  });
});


Map.addLayer(styledConfini.style({styleProperty: 'style'}), {}, "Confini con Bilancio Idrico");

print(confiniWithWaterBalance)