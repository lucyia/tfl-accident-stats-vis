d3.json('data.json', data => createVis(data) );

function createVis(data) {

  // severity - 3 unique values
  // ["Slight", "Severe", "Fatal"]
  var severityTypes = Array.from( new Set( data.map( d => d.severity ) ) ).sort();

  // age band - 3 unique values
  // ["Adult", "Child", "Unknown"]
  var ageBand = Array.from( new Set( [].concat.apply( [], data.map( d => d.casualties.map( c => c.ageBand ) ) ) ) );

  // casualty mode - 8 unique values
  // ["PedalCycle", "Pedestrian", "PoweredTwoWheeler", "Car", "Taxi", "GoodsVehicle", "BusOrCoach", "OtherVehicle"]
  var casualtyMode = Array.from( new Set( [].concat.apply( [], data.map( d => d.casualties.map( c => c.mode ) ) ) ) );

  // casualty class - 3 unique values
  // ["Driver", "Pedestrian", "Passenger"]
  var casualtyClassTypes = Array.from( new Set( [].concat.apply( [], data.map( d => d.casualties.map( c => c.class ) ) ) ) );

  // borough - 33 unique values
  // ["City of London", "City of Westminster", "Camden", "Islington", "Hackney", "Tower Hamlets", "Greenwich", "Lewisham", "Southwark", "Lambeth", "Wandsworth", "Hammersmith and Fulham", "Kensington and Chelsea", "Waltham Forest", "Redbridge", "Havering", "Barking and Dagenham", "Newham", "Bexley", "Bromley", "Croydon", "Sutton", "Merton", "Kingston", "Richmond upon Thames", "Hounslow", "Hillingdon", "Ealing", "Brent", "Harrow", "Barnet", "Haringey", "Enfield"]
  var boroughTypes = Array.from( new Set( data.map( d => d.borough ) ) );

  // age - 98 unique values
  // range: [0, 98]; each number from 0 to 98 is represented
  var ageRange = d3.extent( [].concat.apply( [], data.map( d => d.casualties.map( c => c.age ) ) ) );

  // casualties range - 12 unique values
  // range: [1, 17], all unique values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 13, 17]
  var casualtiesRange = d3.extent( Array.from( new Set( data.map( d => d.casualties.length ) ) ) );

  // number of vehicles involved - 8 unique values
  // range: [1, 8], all unique values: [1, 2, 3, 4, 5, 6, 7, 8]
  var vehiclesRange = d3.extent( Array.from( new Set( data.map( d => d.vehicles.length ) ) ) );

  // vis panel attr
  var width = 400;
  var height = 400;

  var t = d3.transition(t).duration(2000);

  var boroughVis = createBoroughVis(data);
  var vehicleVis = createVehicleVis(data, 40);
  var ageVis = createAgeVis(data);

  function updateAllVis(change) {
    var updatedData = data;

    if (change.type === 'borough') {
      updatedData = updatedData.filter(d => d.borough === change.value);

      ageVis.update(updatedData);
      vehicleVis.update(updatedData);
    }

  }

  function createMapVis(data) {
    var options = [
      {
        "featureType": "administrative",
        "stylers": [
          { "visibility": "off" }
        ]
      },{
        "featureType": "landscape",
        "stylers": [
          { "visibility": "simplified" }
        ]
      },{
        "featureType": "poi",
        "stylers": [
          { "visibility": "off" }
        ]
      },{
        "featureType": "poi.park",
        "stylers": [
          { "visibility": "simplified" }
        ]
      },{
        "featureType": "transit.line",
        "stylers": [
          { "visibility": "off" }
        ]
      },{
        "elementType": "labels.text",
        "stylers": [
          { "visibility": "simplified" }
        ]
      },{
        "stylers": [
          { "invert_lightness": true },
          { "hue": "#0077ff" }
        ]
      },{
        "featureType": "administrative.locality",
        "elementType": "labels.text",
        "stylers": [
          { "visibility": "off" }
        ]
      },{
        "featureType": "administrative.neighborhood",
        "stylers": [
          { "visibility": "simplified" }
        ]
      }
    ]
  }

  function createAgeVis(data) {

    var ageVis = {};

    ageVis.vis = createHorBarVis(prepareData(data), 'vis-age', 8*30, false);

    ageVis.update = function (data) {
      ageVis.vis.update(prepareData(data));
    }

    return ageVis;

    function prepareData(data) {
      var ageBands = [
        { type: [0, 4], Fatal: 0, Severe: 0, Slight: 0, total: 0 },
        { type: [5, 11], Fatal: 0, Severe: 0, Slight: 0, total: 0 },
        { type: [12, 17], Fatal: 0, Severe: 0, Slight: 0, total: 0 },
        { type: [18, 24], Fatal: 0, Severe: 0, Slight: 0, total: 0 },
        { type: [25, 34], Fatal: 0, Severe: 0, Slight: 0, total: 0 },
        { type: [35, 49], Fatal: 0, Severe: 0, Slight: 0, total: 0 },
        { type: [50, 74], Fatal: 0, Severe: 0, Slight: 0, total: 0 },
        { type: [75, 100], Fatal: 0, Severe: 0, Slight: 0, total: 0 }
      ];

      data.forEach( data => {
        ageBands.forEach( bandObj => {
          data.casualties.forEach( casualty => {
            if (casualty.age >= bandObj.type[0] && casualty.age <= bandObj.type[1]) {
              bandObj[casualty.severity] += 1;
            }
          });
        });
      });

      ageBands.forEach( bandObj => {
        bandObj.total = bandObj.Fatal + bandObj.Severe + bandObj.Slight;
      });

      return ageBands;
    }
  }

  function createVehicleVis(data, boxWidth) {

    var vehicleVis = {};

    // vehicle type + casualty mode (Pedestrian only) - original data: 16 unique values; updated data: 11 unique values
    var allTrafficModes = [].concat.apply( ['Pedestrian'], data.map( d => {
      return d.vehicles.map( v => {
        preprocessVehicleType(v);
        return v.type;
      } );
    } ) );

    var trafficModeTypes = Array.from( new Set( allTrafficModes ) ).sort();

    var trafficCasualties = getTrafficCasualties(data, trafficModeTypes);

    var casualtiesScale = d3.scaleLinear()
      .domain(d3.extent(trafficCasualties.map(d => (d.Fatal + d.Severe + d.Slight) )))
      .range([1, width-boxWidth]);

    vehicleVis.vis = createHorBarVis(trafficCasualties, 'vis-vehicles', trafficCasualties.length*30, true);

    vehicleVis.update = function (data) {
      var trafficCasualties = getTrafficCasualties(data, trafficModeTypes);
      casualtiesScale.domain(d3.extent(trafficCasualties.map(d => (d.Fatal + d.Severe + d.Slight) )));

      vehicleVis.vis.update(trafficCasualties);
    }

    return vehicleVis;

    function getTrafficCasualties(data, trafficModeTypes) {
      var trafficCasualties = trafficModeTypes.map( vehicleType  => {
        var obj = {};
        obj.Slight = 0;
        obj.Severe = 0;
        obj.Fatal = 0;

        data.forEach( data => {

          if (vehicleType === 'Pedestrian') {
            data.casualties.forEach( casualty => {
              if (casualty.mode === 'Pedestrian') {
                obj[data.severity] += 1;
                obj.type = 'Pedestrian';
              }
            });
          } else {
            data.vehicles.forEach( vehicle => {
              if (vehicle.type === vehicleType) {
                obj[data.severity] += 1;
                obj.type = vehicleType;
              }
            });
          }

        });

        obj.total = obj.Slight + obj.Severe + obj.Fatal;
        return obj;
      });

      trafficCasualties.sort( (pre, cur) => (cur.Fatal + cur.Severe + cur.Slight) - (pre.Fatal + pre.Severe + pre.Slight));

      return trafficCasualties;
    }

    function preprocessVehicleType(vehicle) {
      switch (vehicle.type) {
        case 'Motorcycle_0_50cc':
          vehicle.fullType = vehicle.type;
          vehicle.type = 'Motorcycle';
          break;
        case 'Motorcycle_50_125cc':
          vehicle.fullType = vehicle.type;
          vehicle.type = 'Motorcycle';
          break;
        case 'Motorcycle_125_500cc':
          vehicle.fullType = vehicle.type;
          vehicle.type = 'Motorcycle';
          break;
        case 'Motorcycle_500cc_Plus':
          vehicle.fullType = vehicle.type;
          vehicle.type = 'Motorcycle';
          break;
        case 'LightGoodsVehicle':
          vehicle.fullType = vehicle.type;
          vehicle.type = 'GoodsVehicle';
          break;
        case 'MediumGoodsVehicle':
          vehicle.fullType = vehicle.type;
          vehicle.type = 'GoodsVehicle';
          break;
        case 'HeavyGoodsVehicle':
          vehicle.fullType = vehicle.type;
          vehicle.type = 'GoodsVehicle';
          break;
        case 'Minibus':
          vehicle.fullType = vehicle.type;
          vehicle.type = 'BusOrCoach';
          break;
        default:
          vehicle.fullType = vehicle.type;
      }
    }
  }

  function createBarVis(data, boxWidth) {

    var visWidth = width - boxWidth;
    var visHeight = height/2 - boxWidth;

    var stack = d3.stack();

    var xScale = d3.scaleBand()
      .domain(data.map(d => d.type))
      .rangeRound([0, visWidth])
      .padding(0.1)
      .align(0.1);

    var yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.total)]).nice()
      .range([visHeight, 1]);

    var severityColor = d3.scaleOrdinal()
      .domain(severityTypes)
      .range(['#a05d56', '#98abc5', '#ff8c00']);

    var svg = d3.select('#'+'vis-vehicles')
      .append('svg')
      .attr('width', visWidth)
      .attr('height', visHeight);

    svg.selectAll('.serie')
      .data(stack.keys(severityTypes)(data))
      .enter()
      .append('g')
        .attr('class', d => 'serie serie-'+d.key)
        .attr('fill', d => severityColor(d.key))
      .selectAll('rect')
        .data(d => d)
        .enter()
        .append('rect')
          .attr('x', d => xScale(d.data.type))
          .attr('y', d => yScale(d[1]))
          .attr('height', d => Math.max(1, yScale(d[0]) - yScale(d[1])) )
          .attr('width', xScale.bandwidth());
  }

  function createHorBarVis(data, idElement, height, iconsEnabled) {

    var horBarVis = {};

    var margin = 20;
    var shift = 40;
    var visWidth = width - margin*2;
    var visHeight = height - margin*2;

    var stack = d3.stack();

    var yScale = d3.scaleBand()
      .domain(data.map(d => d.type))
      .rangeRound([0, visHeight])
      .padding(0.1)
      .align(0.1);

    var xScale = d3.scaleLinear()
      .domain([1, d3.max(data, d => d.total)]).nice()
      .range([shift, visWidth]);

    var severityColor = d3.scaleOrdinal()
      .domain(severityTypes)
      .range(['#98abc5', '#7b6888', '#ff8c00']);

    horBarVis.svg = d3.select('#'+idElement)
      .append('svg')
      .attr('width', visWidth + margin*2)
      .attr('height', visHeight + margin*2)
        .append('g')
        .attr('transform', 'translate('+margin+','+margin+')');

    var xAxis = d3.axisTop(xScale).ticks('4');
    horBarVis.svg.append('g')
        .attr('class', 'axis axis--x')
        .call(xAxis);

    horBarVis.update = function(data) {

      xScale.domain([1, d3.max(data, d => d.total)]).nice();

      horBarVis.svg.select('.axis--x')
        .transition()
        .call(xAxis);

      var bars = horBarVis.svg.selectAll('.serie')
        .data(stack.keys(severityTypes)(data), d => d);

      bars.exit()
        .transition(t)
          .attr('width', 0)
          .remove();

      bars.style('fill-opacity', 1)
        .transition()
        .attr('width', d => xScale(d[1]) - xScale(d[0]));

      bars.enter()
        .append('g')
          .attr('class', d => 'serie serie--'+d.key)
          .attr('fill', d => severityColor(d.key))
          .style('fill-opacity', 0)
        .selectAll('rect')
          .data(d => d)
          .enter()
          .append('rect')
            .attr('y', d => yScale(d.data.type))
            .attr('x', d => xScale(d[0]))
            .attr('height', yScale.bandwidth())
          .transition(t)
            .attr('width', d => Math.max( 1, xScale(d[1]) - xScale(d[0]))) // 1 is minVisible value
            .style('fill-opacity', 1);
    };

    if (iconsEnabled) {
      horBarVis.svg.selectAll('.icon-bar')
        .data(data)
        .enter()
        .append('svg:image')
          .attr('class', 'icon-bar')
          .attr('x', 0)
          .attr('y', d => yScale(d.type))
          .attr('width', yScale.bandwidth())
          .attr('height', yScale.bandwidth())
          .attr('xlink:href', d => 'icons/'+d.type+'.svg');
    } else {
      horBarVis.svg.selectAll('.label-bar')
        .data(data)
        .enter()
        .append('text')
          .attr('class', 'label-bar')
          .attr('x', margin/3*2)
          .attr('y', d => yScale(d.type)+yScale.bandwidth()/4*3)
          .text(d => d.type[0]+'+');
    }

    horBarVis.update(data);

    return horBarVis;

  }

  function createBoroughVis(data) {

    var boxWidth = (width <= height) ? (width / 8.5) : (height / 7.5);
    var shift = boxWidth / 17;

    var londonBoroughs = [
      { pos: [4, 3], nameShort: 'cty', name: 'City of London'         },
      { pos: [7, 3], nameShort: 'bar', name: 'Barking and Dagenham'   },
      { pos: [3, 1], nameShort: 'brn', name: 'Barnet'                 },
      { pos: [7, 4], nameShort: 'bxl', name: 'Bexley'                 },
      { pos: [2, 2], nameShort: 'brt', name: 'Brent'                  },
      { pos: [5, 5], nameShort: 'brm', name: 'Bromley'                },
      { pos: [3, 2], nameShort: 'cmd', name: 'Camden'                 },
      { pos: [4, 5], nameShort: 'crd', name: 'Croydon'                },
      { pos: [1, 2], nameShort: 'elg', name: 'Ealing'                 },
      { pos: [4, 0], nameShort: 'enf', name: 'Enfield'                },
      { pos: [6, 4], nameShort: 'grn', name: 'Greenwich'              },
      { pos: [5, 2], nameShort: 'hck', name: 'Hackney'                },
      { pos: [1, 3], nameShort: 'hms', name: 'Hammersmith and Fulham' },
      { pos: [4, 1], nameShort: 'hgy', name: 'Haringey'               },
      { pos: [2, 1], nameShort: 'hrw', name: 'Harrow'                 },
      { pos: [7, 2], nameShort: 'hvg', name: 'Havering'               },
      { pos: [0, 2], nameShort: 'hdn', name: 'Hillingdon'             },
      { pos: [0, 3], nameShort: 'hns', name: 'Hounslow'               },
      { pos: [4, 2], nameShort: 'isl', name: 'Islington'              },
      { pos: [2, 3], nameShort: 'kns', name: 'Kensington and Chelsea' },
      { pos: [2, 5], nameShort: 'kng', name: 'Kingston'               },
      { pos: [3, 4], nameShort: 'lam', name: 'Lambeth'                },
      { pos: [5, 4], nameShort: 'lsh', name: 'Lewisham'               },
      { pos: [3, 5], nameShort: 'mrt', name: 'Merton'                 },
      { pos: [6, 3], nameShort: 'nwm', name: 'Newham'                 },
      { pos: [6, 2], nameShort: 'rdb', name: 'Redbridge'              },
      { pos: [1, 4], nameShort: 'rch', name: 'Richmond upon Thames'   },
      { pos: [4, 4], nameShort: 'swr', name: 'Southwark'              },
      { pos: [3, 6], nameShort: 'stn', name: 'Sutton'                 },
      { pos: [5, 3], nameShort: 'tow', name: 'Tower Hamlets'          },
      { pos: [5, 1], nameShort: 'wth', name: 'Waltham Forest'         },
      { pos: [2, 4], nameShort: 'wns', name: 'Wandsworth'             },
      { pos: [3, 3], nameShort: 'wst', name: 'City of Westminster'    }
    ];

    preprocessLondonBoroughs();

    var casualtiesScale = d3.scaleLinear()
      .domain(d3.extent(londonBoroughs.map(d => d.casualties)))
      .range(['#cee069', '#2c7fb8']);

    return createVis('vis-boroughs');

    function preprocessLondonBoroughs() {
      londonBoroughs.forEach( borough => {
        var casualties = 0;

        data.forEach( data => {
            if (data.borough === borough.name) {
              casualties += data.casualties.length;
            }
        });

        borough.casualties = casualties;
      });
    }

    function createVis(idElement) {
      var boroughVis = {};

      boroughVis.svg = d3.select('#'+idElement)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

      boroughVis.update = function(data) {

        var rect = boroughVis.svg.selectAll('.borough-rect')
          .data(londonBoroughs, d => d);

        rect.exit()
          .transition(t)
            .style('opacity', 1e-6)
            .remove();

        rect.transition(t)
          .attr('fill', d => casualtiesScale(d.casualties));

        rect.enter()
          .append('rect')
            .attr('id', d => 'borough-rect-'+d.nameShort)
            .attr('class', 'borough-rect')
            .attr('x', d => d.pos[0]*boxWidth + d.pos[0]*shift)
            .attr('y', d => d.pos[1]*boxWidth + d.pos[1]*shift)
            .attr('width', boxWidth)
            .attr('height', boxWidth)
            .style('fill-opacity', 0)
            .on('click', d => {
              updateAllVis({type: 'borough', value: d.name});
            })
          .transition(t)
            .attr('fill', d => casualtiesScale(d.casualties))
            .style('fill-opacity', 1);

        boroughVis.svg.selectAll('.borough-num')
          .data(londonBoroughs)
          .enter()
          .append('text')
            .attr('id', d => 'borough-num-'+d.nameShort)
            .attr('class', 'borough-num label')
            .attr('x', d => d.pos[0]*boxWidth + d.pos[0]*shift + boxWidth - shift*2)
            .attr('y', d => d.pos[1]*boxWidth + d.pos[1]*shift + boxWidth - shift*2)
          .text(d => d.casualties);
      }

      boroughVis.update(data);

      boroughVis.svg.selectAll('.borough-label')
        .data(londonBoroughs)
        .enter()
        .append('text')
          .attr('id', d => 'borough-label-'+d.nameShort)
          .attr('class', 'borough-label label')
          .attr('x', d => d.pos[0]*boxWidth + d.pos[0]*shift + shift*2)
          .attr('y', d => d.pos[1]*boxWidth + d.pos[1]*shift + shift*5)
        .text(d => d.nameShort.toUpperCase());

      return boroughVis;
    }
  }

}
