const width = 640
const height = 640

// level of zoom to generate the clusters
let zoom = 0;
let speed = 0;


// start processing
getClusters()
  .then( allClusters => {

    let points = getCluster(allClusters, zoom)

    d3.select('#zoom')
      .on('input', function(a)  {
        zoom = this.value
        d3.select('#zoomValue').html(zoom)
        points = getCluster(allClusters, zoom)
      })

    d3.select('#speed')
      .on('input', function(a)  {
        speed = this.value
        d3.select('#speedValue').html(speed)
      })

    // initial geo projection
    const projection = d3.geoAzimuthalEqualArea()
        .rotate([180, -90])
        .translate([width / 2, height / 2])
        .fitExtent([[1, 1], [width - 1, height - 1]], {type: "Sphere"})
        .precision(0.1)


    setInterval(function() {

      points = getPoints(points)
      const polygons = getPolygons(points)

      // earth rotation
      let rotation = speed ? (Date.now() / speed ) : 0
      projection.rotate([rotation, projection.rotate()[1]]);

      // draw SVG
      showSVG(polygons, projection)

      // console.log(polygons.features.length + ' polygons');
    }, (Date.now() / (501-speed)) );

  })
  .catch( error => console.error(error) )

function showSVG(polygons, projection) {

  var canvas = document.querySelector("canvas"),
      context = canvas.getContext("2d");

  d3.select(canvas)
     .attr('width', width)
     .attr('height', height)
     .on('click', d => console.log('click') )

  const path = d3.geoPath(projection, context).pointRadius(1);

  polygons.features.forEach((p, i) => {

    context.beginPath();
    path(p);
    context.strokeStyle = context.fillStyle = p.properties.site[2];
    context.lineWidth = 1;
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
  let voronoi = d3.geoVoronoi(points);
  return {
    type: "FeatureCollection",
    features: voronoi.polygons().features
  }
}

function getPoints(points) {

  // perturbation
  const brownianNoise = Math.random();
  const perturbation = points.map(_ => [0, 0]);

  return points.map((d, i) => {
      perturbation[i][0] += speed/10 * brownianNoise;
      perturbation[i][1] += speed/10 * brownianNoise;
      return [
        (d[0] + perturbation[i][0]),
        (d[1] + perturbation[i][1]),
        d[2]
      ];
    })
}

function getCluster(allClusters, zoom) {
  const clusters = allClusters.getClusters([-180, -180, 180, 180], zoom)
    .map( d => ({
      'coords' : d.geometry.coordinates,
      'count' : d.properties ? d.properties.point_count : 1
    }))

  console.log(clusters.length + ' results after clustering at z' + zoom);

  // points
  const colorScale = getColorScale(clusters);
  const points = clusters.map((d,i) => [d.coords[0], d.coords[1],  colorScale(d.count)])

  return points
}

function getClusters() {
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
            const clusters = new Supercluster({
              log: true,
              radius: 60,
              extent: 256,
              maxZoom: 17
            })
            .load(points);

            resolve(clusters)
            return
          }

          return source.read().then(log);
        }))
      .catch(error => reject(error.stack));

  })
}
