const width = 640
const height = 640
const speed = 0

// level of zoom to generate the clusters
const zoom = 10;

// start processing
clusterPoints(zoom)
  .then( clusters => {
    console.log(clusters.length + ' results after clustering at z' + zoom);

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

    showSVG(polygons, projection)

  })
  .catch( error => console.error(error) )


function showSVG(polygons, projection) {

  var canvas = document.querySelector("canvas"),
      context = canvas.getContext("2d");

  d3.select(canvas)
     .attr('width', width)
     .attr('height', height)

  const path = d3.geoPath(projection, context).pointRadius(1);

  polygons.features.forEach((p, i) => {
    context.beginPath();
    path(p);
    context.strokeStyle = context.fillStyle = p.properties.site[2];
    context.lineWidth = .5;
    context.fill();
    context.stroke();

  });
}
function getColorScale(stations) {
  // colors
  const counts = stations.map( d => d.count)
  const domain =  [ d3.max(counts), d3.min(counts) ]

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

  let voronoi = d3.geoVoronoi(points);

  return {
    type: "FeatureCollection",
    features: voronoi.polygons().features
  }
}

function clusterPoints(zoom) {
  return new Promise(function(resolve, reject) {
    const points = []

    shapefile.openShp("./stations1.shp")
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

            const clusters = index.getClusters([-180, -180, 180, 180], zoom)

            const minify = clusters.map( d => ({
                'coords' : d.geometry.coordinates,
                'count' : d.properties ? d.properties.point_count : 1
              }))

            resolve(minify)
            return
          }

          return source.read().then(log);
        }))
      .catch(error => reject(error.stack));

  })
}
