const width = 640
const height = 640

// level of zoom to generate the clusters
let zoom = 1;
let speed = 0;

let fill = true;
let colors = false;

let clusters = []; // cluster data from map
let cluster = []; // cluster data from map
let points = []; // parsed with colors and info

let loaded = false;
let colorScale;
// initial geo projection
const projection = d3.geoAzimuthalEqualArea()
    .rotate([180, -90])
    .translate([width / 2, height / 2])
    .fitExtent([[1, 1], [width - 1, height - 1]], {type: "Sphere"})
    .precision(0.1)

// UI stuff
d3.select('canvas')
   .attr('width', width)
   .attr('height', height)
   .on('click', d => console.log('click') )

d3.select('#zoom')
  .on('input', function(a)  {
    zoom = this.value
    d3.select('#zoomValue').html(zoom)
    init()
  })

d3.select('#speed')
  .on('input', function(a)  {
    speed = this.value
    d3.select('#speedValue').html(speed)
  })

d3.selectAll('input[type="radio"]')
  .on("change", function(a)  {
    if(this.value == 'fill') { fill = true; colors = true }
    else if(this.value == 'colors') { fill = false; colors = false }
  });

d3.select("#init")
  .on("click", function(a)  {
    speed = 0;
    zoom = 0;
    init();
  });

// drawing loop
setInterval(function() {
  if (loaded) update()
}, 25 );

function init() {
  cluster = getCluster(clusters, zoom);
  points = getPoints(cluster);

  colorScale = getColorScale(points);
}

// get data and start processing things
getClusters()
  .then( allClusters => {
    clusters = allClusters;
    init();
    loaded = true;
  })
  .catch( error => console.error(error) )

function update() {

  points = getPoints(points)
    .map(d => [
      d[0],
      d[1],
      d[2],
      colorScale(d[2])
    ])

  const polygons = getPolygons(points)

  // earth rotation
  // let rotation = speed ? (Date.now() / speed ) : 0
  // projection.rotate([rotation, projection.rotate()[1]]);

  // draw SVG
  draw(polygons, projection)
}

function draw(polygons, projection) {

  var canvas = document.querySelector("canvas"),
      context = canvas.getContext("2d");

  // clear canvas
	context.fillStyle = '#fff';
	context.fillRect(0, 0, width, height);

  const path = d3.geoPath(projection, context).pointRadius(1);

  polygons.features.forEach((p, i) => {
    context.beginPath();
    path(p);
    context.strokeStyle = context.fillStyle = (colors || fill) ? p.properties.site[3] : '#555';
    context.lineWidth = 1;
    if (fill) context.fill();
    context.stroke();
  });
}

function getColorScale(points) {

  // colors
  const counts = points.map( d => d[2])
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

  return clusters.map((d,i) => [
    d.coords[0],
    d.coords[1],
    d.count,
    'rgb(0,0,0)'
  ])
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
