const shapefile = require("shapefile");
const Supercluster = require('supercluster');
const jsonfile = require('jsonfile')

// level of zoom to generate the clusters
const ZOOM = 5;

const points = []

shapefile.openShp("WorldClim_ Global weather stations/data/commonData\\Data0\\stations1.shp")
  .then(source => source.read()
    .then(function log(result) {
      
      if (!result.done) {

        let point = {
              "type": "Feature",
              "geometry": result.value
            }

        points.push(point)
      } else {

        const index = new Supercluster({
          log: true,
          radius: 60,
          extent: 256,
          maxZoom: 17
        })
        .load(points);

        const clusters = index.getClusters([-180, -180, 180, 180], ZOOM)
          .map( d => ({
            'coords' : d.geometry.coordinates,
            'count' : d.properties ? d.properties.point_count : 1
          }))

        const filename = 'stations.json'
        jsonfile.writeFile(filename, clusters, function (err) {
          if (err) console.error(err)
          console.log(clusters.length + " clusters saved in " + filename)
        })


        return
      }

      return source.read().then(log);
    }))
  .catch(error => console.error(error.stack));
