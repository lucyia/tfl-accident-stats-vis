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

  createBoroughVis(data);
  createVehicleVis(data, 40);

  function createVehicleVis(data, boxWidth) {
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
      .domain(d3.extent(trafficCasualties.map(d => (d.Fatal + d.Serious + d.Slight) )))
      .range([1, width-boxWidth]);

    //createBarVis(trafficCasualties, boxWidth);
    createHorBarVis(trafficCasualties, boxWidth);

    function getTrafficCasualties(data, trafficModeTypes) {
      var trafficCasualties = trafficModeTypes.map( vehicleType  => {
        var obj = {};
        obj.Slight = 0;
        obj.Serious = 0;
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

        obj.total = obj.Slight + obj.Serious + obj.Fatal;
        return obj;
      });

      trafficCasualties.sort( (pre, cur) => (cur.Fatal + cur.Serious + cur.Slight) - (pre.Fatal + pre.Serious + pre.Slight));

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

  function createHorBarVis(data, boxWidth) {

    var visWidth = width - boxWidth;
    var visHeight = height;

    var stack = d3.stack();

    var yScale = d3.scaleBand()
      .domain(data.map(d => d.type))
      .rangeRound([0, visHeight])
      .padding(0.1)
      .align(0.1);

    var xScale = d3.scaleLinear()
      .domain([1, d3.max(data, d => d.total)]).nice()
      .range([boxWidth, visWidth]);

    var severityColor = d3.scaleOrdinal()
      .domain(severityTypes)
      .range(['#98abc5', '#7b6888', '#ff8c00']);

    var svg = d3.select('#'+'vis-vehicles')
      .append('svg')
      .attr('width', visWidth)
      .attr('height', visHeight);

    svg.selectAll('.vehicle-icon')
      .data(data)
      .enter()
      .append('svg:image')
        .attr('class', 'vehicle-icon')
        .attr('x', d => d.x)
        .attr('y', d => yScale(d.type))
        .attr('width', yScale.bandwidth())
        .attr('height', yScale.bandwidth())
        .attr('xlink:href', d => 'icons/'+d.type+'.svg');

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
          .attr('y', d => yScale(d.data.type))
          .attr('x', d => xScale(d[0]))
          .attr('width', d => Math.max( 1, xScale(d[1]) - xScale(d[0]))) // 1 is minVisible value
          .attr('height', yScale.bandwidth());
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

    var visBoroughs = createVis('vis-boroughs');

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
      var svg = d3.select('#'+idElement)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

      var rect = svg.selectAll('.borough-rect')
        .data(londonBoroughs)
        .enter()
        .append('rect')
          .attr('id', d => 'borough-rect-'+d.nameShort)
          .attr('class', 'borough-rect')
          .attr('x', d => d.pos[0]*boxWidth + d.pos[0]*shift)
          .attr('y', d => d.pos[1]*boxWidth + d.pos[1]*shift)
          .attr('width', boxWidth)
          .attr('height', boxWidth)
          .attr('fill', d => casualtiesScale(d.casualties));

      svg.selectAll('.borough-label')
        .data(londonBoroughs)
        .enter()
        .append('text')
          .attr('id', d => 'borough-label-'+d.nameShort)
          .attr('class', 'borough-label label')
          .attr('x', d => d.pos[0]*boxWidth + d.pos[0]*shift + shift*2)
          .attr('y', d => d.pos[1]*boxWidth + d.pos[1]*shift + shift*5)
        .text(d => d.nameShort.toUpperCase());

      svg.selectAll('.borough-num')
        .data(londonBoroughs)
        .enter()
        .append('text')
          .attr('id', d => 'borough-num-'+d.nameShort)
          .attr('class', 'borough-num label')
          .attr('x', d => d.pos[0]*boxWidth + d.pos[0]*shift + boxWidth - shift*2)
          .attr('y', d => d.pos[1]*boxWidth + d.pos[1]*shift + boxWidth - shift*2)
        .text(d => d.casualties);

      return svg;
    }
  }

}
