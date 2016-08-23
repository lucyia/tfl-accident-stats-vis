d3.json('data.json', data => createVis(data));

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
  var height = 300;

  var t = d3.transition(t).duration(2000);

  var boroughVis = createBoroughVis(data);
  var vehicleVis = createVehicleVis(data);
  var ageVis = createAgeVis(data);

  createMapVis(data);

  function updateAllVis(type = undefined, value) {

    var updatedData = data;

    switch (type) {
      case 'borough':
        updatedData = updatedData.filter(d => d.borough === value);
        ageVis.update(updatedData);
        vehicleVis.update(updatedData);
        break;
      case 'age':
        var filteredData = [];
        updatedData.forEach( d => {
          var found = false;

          d.casualties.forEach( casualty => {
            if (casualty.age >= value[0] && casualty.age <= value[1]) {
              found = true;
            }
          });

          if (found) {
            filteredData.push(d);
          }
        });
        updatedData = filteredData;

        ageVis.update(updatedData);
        vehicleVis.update(updatedData);
        boroughVis.update(updatedData);
        break;
      case 'mode':
        var filteredData = [];
        updatedData.forEach( d => {
          var found = false;

          d.vehicles.forEach( vehicle => {
            if (vehicle.type === value) {
              found = true;
            }
          });

          d.casualties.forEach( casualty => {
            if (value === 'Pedestrian' && casualty.mode === value) {
              found = true;
            }
          });

          if (found) {
            filteredData.push(d);
          }
        });
        updatedData = filteredData;

        ageVis.update(updatedData);
        vehicleVis.update(updatedData);
        boroughVis.update(updatedData);
        break;
      case undefined:
        d3.selectAll('.rect-selected')
          .classed('rect-selected', false);

        ageVis.update(updatedData);
        vehicleVis.update(updatedData);
        boroughVis.update(updatedData);
        break;
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

    var mapElem = d3.select('#map')
      .attr('width', window.innerWidth+'px')
      .attr('height', window.innerHeight+'px');

    var map = new google.maps.Map(d3.select('#map').node(), {
      zoom: 13,
      center: new google.maps.LatLng(51.5, -0.11),
      mapTypeId: google.maps.MapTypeId.TERRAIN,
      zoomControl: false,
      mapTypeControl: false,
      scaleControl: false,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: false,
      styles: options
    });

    var severityColor = d3.scaleOrdinal()
      .domain(severityTypes)
      .range(['#98abc5', '#7b6888', '#ff8c00']);

    var overlay = new google.maps.OverlayView();

    /**
     * Code taken from Mike Bostock, see https://gist.github.com/mbostock/899711
     */
    overlay.onAdd = function () {
      var layer = d3.select(this.getPanes().overlayLayer).append('div')
        .attr('class', 'casualties-map');

      overlay.draw = function () {
        var projection = this.getProjection();
        var padding = 10;

        var marker = layer.selectAll('svg')
          .data(data)
          .each(transform)
          .enter()
          .append('svg')
            .each(transform)
            .attr('class', 'marker');

        marker.append('circle')
          .attr('r', 5)
          .attr('cx', padding)
          .attr('cy', padding)
          .attr('fill', d => severityColor(d.severity));

        // marker.append('text')
        //   .attr('x', padding + 10)
        //   .attr('y', padding)
        //   .attr('dy', '.5em')
        //   .attr('fill', 'yellow')
        //   .text(d => d.location);

        function transform(d) {
          d = new google.maps.LatLng(d.lat, d.lon);
          d = projection.fromLatLngToDivPixel(d);

          return d3.select(this)
            .style('left', (d.x - padding) + 'px')
            .style('top', (d.y - padding) + 'px');
        }
      };
    };

    overlay.setMap(map);
  }

  function createAgeVis(data) {

    var ageVis = {};

    ageVis.vis = createHorBarVis(prepareData(data), 'vis-age', 8*22, false);

    ageVis.update = data => ageVis.vis.update(prepareData(data));

    return ageVis;

    function prepareData(data) {
      var ageBands = [
        { type: [0, 4], groupType: 'age', Fatal: 0, Severe: 0, Slight: 0, total: 0 },
        { type: [5, 11], groupType: 'age', Fatal: 0, Severe: 0, Slight: 0, total: 0 },
        { type: [12, 17], groupType: 'age', Fatal: 0, Severe: 0, Slight: 0, total: 0 },
        { type: [18, 24], groupType: 'age', Fatal: 0, Severe: 0, Slight: 0, total: 0 },
        { type: [25, 34], groupType: 'age', Fatal: 0, Severe: 0, Slight: 0, total: 0 },
        { type: [35, 49], groupType: 'age', Fatal: 0, Severe: 0, Slight: 0, total: 0 },
        { type: [50, 74], groupType: 'age', Fatal: 0, Severe: 0, Slight: 0, total: 0 },
        { type: [75, 100], groupType: 'age', Fatal: 0, Severe: 0, Slight: 0, total: 0 }
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

  function createVehicleVis(data) {

    var vehicleVis = {};

    vehicleVis.vis = createHorBarVis(preprocessData(data), 'vis-vehicles', 11*22, true);

    vehicleVis.update = data => vehicleVis.vis.update(preprocessData(data));

    return vehicleVis;

    function preprocessData(data) {
      // vehicle type + casualty mode (Pedestrian only) - original data: 16 unique values; updated data: 11 unique values
      var allTrafficModes = [].concat.apply( ['Pedestrian'], data.map( d => {
        return d.vehicles.map( v => {
          preprocessVehicleType(v);
          return v.type;
        } );
      } ) );

      var trafficModeTypes = Array.from( new Set( allTrafficModes ) ).sort();

      var trafficCasualties = trafficModeTypes.map( vehicleType  => {
        var obj = {};

        obj.Slight = 0;
        obj.Severe = 0;
        obj.Fatal = 0;

        obj.groupType = 'mode';

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

    appendBackground(horBarVis.svg, visWidth, visHeight);

    var xAxis = d3.axisTop(xScale)
      .ticks('4');

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
            .attr('x', d => Math.max(shift, xScale(d[0])))
            .attr('height', yScale.bandwidth())
          .transition(t)
            .attr('width', d => Math.max(1, xScale(d[1]) - xScale(d[0])))
            .style('fill-opacity', 1);
    };

    var groupData = horBarVis.svg.selectAll('.g-bar')
      .data(data);

    var group = groupData.enter()
      .append('g')
        .attr('class', 'g-bar')
        .on('click', function(d) {
          d3.selectAll('.rect-background')
            .classed('rect-selected', false);

          toggleClass(d3.select(this), '.rect-background', 'rect-selected', true);

          updateAllVis(d.groupType, d.type);
        })
        .on('mouseover', function (d) {
          toggleClass(d3.select(this), '.rect-background', 'rect-hover', true);
        })
        .on('mouseout', function (d) {
          toggleClass(d3.select(this), '.rect-background', 'rect-hover', false);
        });

    group.append('rect')
      .attr('class', 'rect-background')
      .attr('x', 0)
      .attr('y', d => yScale(d.type))
      .attr('width', yScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', 'transparent');

    if (iconsEnabled) {
      group.append('svg:image')
          .attr('class', 'icon-bar')
          .attr('x', 0)
          .attr('y', d => yScale(d.type))
          .attr('width', yScale.bandwidth())
          .attr('height', yScale.bandwidth())
          .attr('xlink:href', d => 'icons/'+d.type+'.svg');
    } else {
      group.append('text')
          .attr('class', 'label-bar label')
          .attr('x', margin/3*2)
          .attr('y', d => yScale(d.type)+yScale.bandwidth()/4*3)
          .text(d => d.type[0]+'+');
    }

    horBarVis.update(data);

    return horBarVis;

  }

  function createBoroughVis(data) {

    var boroughVis = {};

    var margin = 20;
    var visWidth = width - margin*2;
    var visHeight = height - margin*2;

    var londonBoroughs = [
      { pos: [-10, -10], nameShort: 'bug', name: 'dummy element'      }, // known bug: updated selection for generating vis ignores the first element
      { pos: [7, 3], nameShort: 'bar', name: 'Barking and Dagenham'   },
      { pos: [3, 1], nameShort: 'brn', name: 'Barnet'                 },
      { pos: [7, 4], nameShort: 'bxl', name: 'Bexley'                 },
      { pos: [2, 2], nameShort: 'brt', name: 'Brent'                  },
      { pos: [5, 5], nameShort: 'brm', name: 'Bromley'                },
      { pos: [3, 2], nameShort: 'cmd', name: 'Camden'                 },
      { pos: [4, 3], nameShort: 'cty', name: 'City of London'         },
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

    boroughVis.vis = createVis(preprocessData(data), 'vis-boroughs');

    boroughVis.update = data => boroughVis.vis.update(preprocessData(data));

    return boroughVis;

    function preprocessData(data) {

      londonBoroughs.forEach( borough => {
        var casualties = 0;

        data.forEach( data => {
            if (data.borough === borough.name) {
              casualties += data.casualties.length;
            }
        });

        borough.casualties = casualties;
      });

      return londonBoroughs;
    }

    function createVis(londonBoroughs, idElement) {

      var boroughVis = {};

      var boxWidth = (visWidth <= visHeight) ? (visWidth / 8.5) : (visHeight / 7.5);
      var shift = boxWidth / 20;

      var casualtiesScale = d3.scaleLinear()
        .domain(d3.extent(londonBoroughs.map(d => d.casualties)))
        .range(['#cee069', '#2c7fb8']);

      boroughVis.svg = d3.select('#'+idElement)
        .append('svg')
          .attr('width', visWidth + margin*2)
          .attr('height', visHeight + margin*2)
        .append('g')
          .attr('transform', 'translate('+ margin +','+ margin +')');

      appendBackground(boroughVis.svg, visWidth, visHeight);

      boroughVis.update = function(data) {

        casualtiesScale.domain(d3.extent(data.map(d => d.casualties)));

        var groupData = boroughVis.svg.selectAll('.g-borough')
          .data(data, d => d);

        var group = groupData.enter()
          .append('g')
            .attr('class', 'g-borough')
          .on('click', function(d) {
            d3.selectAll('.rect-selected')
              .classed('rect-selected', false);

            toggleClass(d3.select(this), '.borough-rect', 'rect-selected', true);

            updateAllVis('borough', d.name);
          })
          .on('mouseover', function (d) {
            toggleClass(d3.select(this), '.borough-rect', 'rect-hover', true);
          })
          .on('mouseout', function (d) {
            toggleClass(d3.select(this), '.borough-rect', 'rect-hover', false);
          });

        var rect = group.append('rect')
          .attr('class', 'borough-rect');

        rect.exit()
          .transition(t)
            .style('opacity', 1e-6)
            .remove();

        rect.transition(t)
          .attr('fill', d => casualtiesScale(d.casualties));

        rect.attr('id', d => 'borough-rect-'+d.nameShort)
            .attr('class', 'borough-rect')
            .attr('x', d => d.pos[0]*boxWidth + d.pos[0]*shift)
            .attr('y', d => d.pos[1]*boxWidth + d.pos[1]*shift)
            .attr('width', boxWidth)
            .attr('height', boxWidth)
            .style('fill-opacity', 0)
          .transition(t)
            .attr('fill', d => casualtiesScale(d.casualties))
            .style('fill-opacity', 1);

        group.append('text')
            .attr('id', d => 'borough-num-'+d.nameShort)
            .attr('class', 'borough-num label')
            .attr('x', d => d.pos[0]*boxWidth + d.pos[0]*shift + boxWidth - shift*2)
            .attr('y', d => d.pos[1]*boxWidth + d.pos[1]*shift + boxWidth - shift*2)
            .style('font-size', d => (boxWidth < 45) ? '10px' : '13px' )
          .text(d => d.casualties);

        group.append('text')
            .attr('id', d => 'borough-label-'+d.nameShort)
            .attr('class', 'borough-label label')
            .attr('x', d => d.pos[0]*boxWidth + d.pos[0]*shift + shift*2)
            .attr('y', d => d.pos[1]*boxWidth + d.pos[1]*shift + shift*6)
            .style('font-size', d => (boxWidth < 45) ? '10px' : '13px' )
          .text(d => d.nameShort.toUpperCase());

      }

      boroughVis.update(londonBoroughs);

      return boroughVis;
    }
  }

  function toggleClass(selection, selectClass, classed, toggle) {
    selection.select(selectClass)
      .classed(classed, toggle);
  }

  function appendBackground(svg, width, height) {
    svg.append('rect')
      .attr('class', 'svg-background')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'transparent')
      .on('click', () => updateAllVis());
  }

}
