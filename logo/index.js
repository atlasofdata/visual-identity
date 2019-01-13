const d3 = require('d3');
const geoVoronoi = require('d3-geo-voronoi')
const cluster = require('./cluster')

//
const width = 640
const height = 640
const speed = 0

// level of zoom to generate the clusters
const zoom = 6;

// start processing
cluster.clusterPoints(zoom)
  .then( clusters => {
    console.log(clusters.length + ' results after clustering at z' + zoom);
    // cluster.saveJson('stations.json', clusters)

    const colorScale = getColorScale(clusters);

    // points
    const points = clusters.map((d,i) => [d.coords[0], d.coords[1],  colorScale(d.count)])

    // initial geo projection
    const projection = d3.geoAzimuthalEqualArea()
        .rotate([0, -90])
        .translate([width / 2, height / 2])
        .fitExtent([[1, 1], [width - 1, height - 1]], {type: "Sphere"})
        .precision(0.1)

    const polygons = getPolygons(points)

    console.log(polygons.features.length + ' polygons');



  })
  .catch( error => console.error(error) )

function getColorScale(stations) {
  // colors
  const counts = stations.map( d => d.count)
  const domain =  [ d3.min(counts), d3.max(counts) ] // : [ d3.max(counts), d3.min(counts) ]

  return d3.scaleSequential()
    .domain(domain)
    .interpolator(d3.interpolatePuBu)
}

function getPolygons(points) {

  // perturbation
  const brownianNoise = Math.random();
  const perturbation = points.map(_ => [0, 0]);

  let noisePoints = points.map((d, i) => {
      perturbation[i][0] += speed/10 * brownianNoise;
      perturbation[i][1] += speed/10 * brownianNoise;
      return [
        d[0] + perturbation[i][0],
        (d[1] + perturbation[i][1]),
        d[2]
      ];
    })

  let voronoi = geoVoronoi.geoVoronoi(points);

  return {
    type: "FeatureCollection",
    features: voronoi.polygons().features
  }
}
