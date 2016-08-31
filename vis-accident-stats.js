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
  var width = 300;
  var height = 300;

  var severityColorRange = ['#FC371E', '#FD8824', '#FDAF2A'];

  var tip = d3.tip().attr('class', 'd3-tip').html(d => d);

  // as default show only first two sections
  var initialData = data.filter(d => d.severity === 'Fatal' || d.severity === 'Severe');

  var boroughVis = createBoroughVis(initialData);
  var ageVis = createAgeVis(initialData);
  var modeVis = createModeVis(initialData);
  var severityVis = createSeverityVis(severityTypes);
  var map = createMapVis(initialData.sort((pre,cur) => pre.severity === cur.severity ? (cur.casualties.length-pre.casualties.length) : (pre.severity < cur.severity ? -1 : 1)));
  var accidentVis = createAccidentVis();

  var filter = resetFilter();

  toggleAbout();

  positionWrapper();

  function positionWrapper() {
    if (window.innerHeight > 750) {
      d3.select('#wrapper-body').style('top', (window.innerHeight/2-375)+'px')
    }
  }

  function toggleAbout() {
    d3.select('#toggle-about')
      .on('click', () => {
        hideAbout();
      });

    d3.select('#about-title')
      .on('click', () => {
        d3.select('#about-title').transition().style('right', '-100px');
        d3.select('#about').transition().style('opacity', '1').style('right', '0');
        d3.select('#vis-accident').transition().style('right', '-500px');
      });
  }

  function hideAbout() {
    d3.select('#about').transition().style('opacity', '0').style('right', '-500px');
    d3.select('#about-title').transition().style('right', '0');
  }

  function updateAllVis(type = undefined, value) {

    // reset data
    var filteredData = data;

    if (type) {
      // update value of changed filter
      filter[type] = value;
    } else {
      // reset all values
      filter = resetFilter();
      severityVis.resetAll();
      d3.selectAll('.rect-selected').classed('rect-selected', false);
    }

    // filter severity
    filteredData = filteredData.filter(d => filter.severity.indexOf(d.severity) !== -1 );
    // filter age
    filteredData = (filter.age.length > 2) ? filteredData : filterAge(filteredData);
    // filter mode
    filteredData = (typeof filter.mode === 'object') ? filteredData : filterMode(filteredData);

    if (type !== 'borough') {
      boroughVis.update(filteredData);
    }

    // lastly update data according to the selected borough
    filteredData = (typeof filter.borough === 'object') ? filteredData : filteredData.filter(d => filter.borough === d.borough);

    ageVis.update(filteredData);
    modeVis.update(filteredData);

    map.update(filteredData);

    function filterAge(filteredData) {
      var filteredAgeData = [];

      filteredData.forEach( d => {
        var found = false;

        d.casualties.forEach( casualty => {
          if (casualty.age >= filter.age[0] && casualty.age <= filter.age[1]) {
            found = true;
          }
        });

        if (found) {
          filteredAgeData.push(d);
        }
      });

      return filteredAgeData;
    }

    function filterMode(filteredData) {
      var filteredModeData = [];

      filteredData.forEach( d => {
        var found = false;

        d.vehicles.forEach( vehicle => {
          if (vehicle.type === filter.mode) {
            found = true;
          }
        });

        d.casualties.forEach( casualty => {
          if (value === 'Pedestrian' && casualty.mode === filter.mode) {
            found = true;
          }
        });

        if (found) {
          filteredModeData.push(d);
        }
      });

      return filteredModeData;
    }
  }

  function resetFilter() {
    return {
      severity: ['Fatal', 'Severe'],
      borough: boroughVis.londonBoroughs,
      age: ageVis.ageBands,
      mode: modeVis.modeTypes
    };
  }

  function createAccidentVis() {

    var vis = {};

    var svgWidth = 300;
    var svgHeight = 300;

    var centerHeight = svgHeight / 2 + 20;
    var centerWidth = svgWidth / 2 - 10;

    var severityColor = d3.scaleOrdinal()
      .domain(severityTypes)
      .range(severityColorRange);

    var svg = d3.select('#vis-accident')
      .append('svg')
        .attr('width', svgWidth)
        .attr('height', svgHeight);

    svg.call(tip);

    // quick replacement for button
    svg.append('text')
      .attr('class', 'label label-pointer label-green')
      .attr('x', 20)
      .attr('y', 20)
      .text('✖')
      .on('click', () => {
        d3.select('#vis-accident')
          .transition()
          .style('right', '-500px');
      });

    vis.update = accidentId => {
      // reset style of wrapper
      d3.select('#vis-accident').style('right', '0');

      var accident = data.find(d => d.id === accidentId);

      var allAccidentParticipants = accident.casualties.map(d => d);

      var casualties = accident.vehicles.forEach( vehicle => {
        var casualtyAlsoVehicle = accident.casualties.find( casualty => vehicle.type === casualty.type);
        if (casualtyAlsoVehicle === undefined) {
          allAccidentParticipants.push(vehicle);
        }
      });
      accident.participants = allAccidentParticipants;

      var numCasualties = accident.participants.length > 6 ? 6 : accident.participants.length;
      var angle = 360 / numCasualties;
      var r = 50;
      var iconSize = 30;

      locationHeading();
      casualtyModeIcon();
      casualtySeverity();
      casualtyAge();
      //pieChart();
      dateTimeLabel(true);
      dateTimeLabel(false);

      function locationHeading() {

        var locationHeading = d3.selectAll('.accident-location')
          .data([accident]);

        locationHeading.exit()
          .transition()
            .style('opacity', 0)
          .remove();

        locationHeading.enter()
          .append('span')
            .attr('class', 'accident-location label')
            .style('opacity', 0)
          .transition(d3.transition().duration(3000))
            .style('opacity', 1)
            .text(d => d.location);

        locationHeading.transition()
          .transition(d3.transition().duration(3000))
            .style('opacity', 1)
            .text(d => d.location);
      }

      function pieChart(age) {

        var translateX = 100;
        var translateY = 100;

        var pie = d3.pie()
          .value(d => d)
          .sort(null);

        var arc = d3.arc()
          .outerRadius(30)
          .innerRadius(40);

        var data = [100-age, age];

        var path = svg.datum(data).selectAll('path')
          .data(pie)
          .enter().append('path')
            .attr('class','piechart')
            .attr('transform', 'translate('+translateX+','+translateY+')')
            .attr('fill', (d,i) => i === 0 ? 'blue' : 'white')
            .attr('d', arc)
          .each(function(d){ this._current = d; });

        svg.datum(data).selectAll("path")
            .data(pie)
          .transition()
            .attrTween("d", arcTween);

        svg.datum(data).selectAll("path")
          .data(pie)
          .enter()
          .append('path')
            .attr('fill', (d,i) => i === 0 ? 'blue' : 'white')
            .attr('d', arc)
            .each(function(d){ this._current = d; })

        svg.datum(data)
          .selectAll('path')
          .data(pie)
          .exit()
          .remove();

        // code for arcTween function taken from Mike Bostock's block: https://bl.ocks.org/mbostock/1346410
        function arcTween(a) {
          var i = d3.interpolate(this._current, a);
          this._current = i(0);
          return function(t) {
            return arc(i(t));
          };
        }
      }

      function casualtyModeIcon() {
        var casualtyMode = svg.selectAll('.accident-icon')
          .data(accident.participants);

        casualtyMode.exit()
          .transition()
            .style('opacity', 0)
          .remove();

        casualtyMode.enter()
          .append('svg:image')
            .attr('class', 'accident-icon')
            .on('mouseover', d => {
              var vehicleText = '';
              var casualtyText = '';
              var ageText = '';

              if (d.type!=='Pedestrian') {
                vehicleText = 'Vehicle: '+d.type+'<br/>';
              }

              if (d.class) {
                casualtyText = 'Casualty: '+d.class+'<br/>';
              }

              if (d.age) {
                ageText = 'Age: '+d.age+'<br/>';
              }

              tip.show(vehicleText+casualtyText+ageText);
            })
            .on('mouseout', tip.hide)
          .transition()
            .style('opacity', 0)
          .transition()
            .attr('x', (d, i) => pointOnCircle(angle*i, r, i)[0] - iconSize/2)
            .attr('y', (d, i) => pointOnCircle(angle*i, r, i)[1] - iconSize/2)
            .attr('width', iconSize)
            .attr('height', iconSize)
          .transition()
            .style('opacity', 1)
            .attr('x', centerWidth)
            .attr('y', centerHeight)
          .transition()
            .attr('x', (d, i) => pointOnCircle(angle*i, r, i)[0] - iconSize/2)
            .attr('y', (d, i) => pointOnCircle(angle*i, r, i)[1] - iconSize/2)
            .attr('xlink:href', d => 'icons/'+d.type+'.svg')
            .style('opacity', 1);

        casualtyMode.transition()
          .style('opacity', 0)
          .transition()
            .attr('xlink:href', d => 'icons/'+d.type+'.svg')
            .attr('x', (d, i) => pointOnCircle(angle*i, r, i)[0] - iconSize/2)
            .attr('y', (d, i) => pointOnCircle(angle*i, r, i)[1] - iconSize/2)
            .attr('width', iconSize)
            .attr('height', iconSize)
          .transition()
            .style('opacity', 1)
            .attr('x', centerWidth - 5) // shift of the text label
            .attr('y', centerHeight - 10) // shift of the text label
          .transition()
            .attr('x', (d, i) => pointOnCircle(angle*i, r, i)[0] - iconSize/2)
            .attr('y', (d, i) => pointOnCircle(angle*i, r, i)[1] - iconSize/2)
            .style('opacity', 1);
      }

      function casualtyAge() {

        var shift = 15;

        var casualtyAgeCircle = svg.selectAll('.accident-age-circle')
          .data(accident.participants);

        casualtyAgeCircle.exit()
          .transition()
            .style('opacity', 0)
          .remove();

        casualtyAgeCircle.enter()
          .append('circle')
            .attr('class', 'accident-age-circle')
            .style('opacity', 0)
            .attr('r', 10)
            .attr('fill', 'white')
          .transition()
            .style('opacity', 0)
          .transition()
            .attr('cx', (d, i) => pointOnCircle(angle*i, r, i)[0]+shift)
            .attr('cy', (d, i) => pointOnCircle(angle*i, r, i)[1]-shift)
          .transition()
            .attr('cx', centerWidth)
            .attr('cy', centerHeight)
          .transition(d3.transition().duration(3000))
            .attr('cx', (d, i) => pointOnCircle(angle*i, r, i)[0]+shift)
            .attr('cy', (d, i) => pointOnCircle(angle*i, r, i)[1]-shift)
            .style('opacity', 1);

        casualtyAgeCircle.transition()
            .style('opacity', 0)
          .transition()
            .attr('cx', (d, i) => pointOnCircle(angle*i, r, i)[0]+shift)
            .attr('cy', (d, i) => pointOnCircle(angle*i, r, i)[1]-shift)
          .transition()
            .attr('cx', centerWidth)
            .attr('cy', centerHeight)
          .transition(d3.transition().duration(3000))
            .style('opacity', 1)
            .attr('cx', (d, i) => pointOnCircle(angle*i, r, i)[0]+shift)
            .attr('cy', (d, i) => pointOnCircle(angle*i, r, i)[1]-shift);

        var casualtyAge = svg.selectAll('.accident-age')
          .data(accident.participants);

        casualtyAge.exit()
          .transition()
            .style('opacity', 0)
          .remove();

        casualtyAge.enter()
          .append('text')
            .attr('class', 'accident-age')
            .attr('fill', 'black')
          .transition()
            .style('opacity', 0)
          .transition()
            .attr('transform', (d, i) => 'translate('+(pointOnCircle(angle*i, r, i)[0]+shift/4*2)+','+(pointOnCircle(angle*i, r, i)[1]-shift/4*3)+')')
          .transition()
            .attr('transform', (d, i) => 'translate('+(centerWidth)+','+(centerHeight)+')')
          .transition(d3.transition().duration(3000))
            .attr('transform', (d, i) => 'translate('+(pointOnCircle(angle*i, r, i)[0]+shift/4*2)+','+(pointOnCircle(angle*i, r, i)[1]-shift/4*3)+')')
            .style('opacity', 1)
            .text(d => (d.age) ? d.age+'y' : 'N/A');

        casualtyAge.transition()
            .style('opacity', 0)
          .transition()
            .attr('transform', (d, i) => 'translate('+(pointOnCircle(angle*i, r, i)[0]+shift/4*2)+','+(pointOnCircle(angle*i, r, i)[1]-shift/4*3)+')')
          .transition()
            .attr('transform', (d, i) => 'translate('+(centerWidth)+','+(centerHeight)+')')
          .transition(d3.transition().duration(3000))
            .style('opacity', 1)
            .attr('transform', (d, i) => 'translate('+(pointOnCircle(angle*i, r, i)[0]+shift/4*2)+','+(pointOnCircle(angle*i, r, i)[1]-shift/4*3)+')')
            .text(d => (d.age) ? d.age+'y' : 'N/A');

      }

      function casualtySeverity() {
        var shift = 10;

        var casualtySeverity = svg.selectAll('.accident-severity')
          .data(accident.participants);

        casualtySeverity.exit()
          .transition()
            .style('opacity', 0)
          .remove();

        casualtySeverity.enter()
          .append('path')
            .attr('class', 'accident-severity')
          .transition()
            .style('opacity', 0)
          .transition()
            .attr('fill', d => (d.severity) ? severityColor(d.severity) : 'transparent')
            .attr('transform', (d, i) => 'translate('+(pointOnCircle(angle*i, r, i)[0]+shift)+','+(pointOnCircle(angle*i, r, i)[1])+') scale('+0.05+')')
          .transition()
            .attr('transform', (d, i) => 'translate('+(centerWidth)+','+(centerHeight)+') scale('+0+')')
          .transition(d3.transition().duration(3000))
            .attr('transform', (d, i) => 'translate('+(pointOnCircle(angle*i, r, i)[0]+shift)+','+(pointOnCircle(angle*i, r, i)[1])+') scale('+0.05+')')
            .attr('d', 'M 243.44676,222.01677 C 243.44676,288.9638 189.17548,343.23508 122.22845,343.23508 C 55.281426,343.23508 1.0101458,288.9638 1.0101458,222.01677 C 1.0101458,155.06975 40.150976,142.95572 122.22845,0.79337431 C 203.60619,141.74374 243.44676,155.06975 243.44676,222.01677 z')
            .style('opacity', 1);

        casualtySeverity.transition()
            .style('opacity', 0)
          .transition()
            .attr('transform', (d, i) => 'translate('+(pointOnCircle(angle*i, r, i)[0]+shift)+','+(pointOnCircle(angle*i, r, i)[1])+') scale('+0.05+')')
          .transition()
            .attr('transform', (d, i) => 'translate('+(centerWidth)+','+(centerHeight)+') scale('+0+')')
          .transition(d3.transition().duration(3000))
            .style('opacity', 1)
            .attr('fill', d => (d.severity) ? severityColor(d.severity) : 'transparent')
            .attr('transform', (d, i) => 'translate('+(pointOnCircle(angle*i, r, i)[0]+shift)+','+(pointOnCircle(angle*i, r, i)[1])+') scale('+0.05+')');

      }

      function severityCircles() {
        var accidentCircles = svg.selectAll('.accident-circle')
          .data(accident.participants);

        accidentCircles.exit()
          .transition()
            .attr('r', 0)
            .style('fill-opacity', 0)
          .remove();

        accidentCircles.enter()
          .append('circle')
            .attr('class', 'accident-circle')
          .transition()
            .attr('cx', (d, i) => pointOnCircle(angle*i, r, i)[0])
            .attr('cy', (d, i) => pointOnCircle(angle*i, r, i)[1])
            .attr('r', 0)
          .transition()
            .attr('cx', centerWidth)
            .attr('cy', centerHeight)
            .attr('r', iconSize)
            .attr('fill', d => severityColor(d.severity))
          .transition()
            .attr('cx', (d, i) => pointOnCircle(angle*i, r, i)[0])
            .attr('cy', (d, i) => pointOnCircle(angle*i, r, i)[1])
            .style('opacity', 1);

        accidentCircles.transition()
            .attr('cx', (d, i) => pointOnCircle(angle*i, r, i)[0])
            .attr('cy', (d, i) => pointOnCircle(angle*i, r, i)[1])
            .attr('r', 0)
          .transition()
            .attr('cx', centerWidth)
            .attr('cy', centerHeight)
            .attr('r', iconSize)
          .transition()
            .attr('cx', (d, i) => pointOnCircle(angle*i, r, i)[0])
            .attr('cy', (d, i) => pointOnCircle(angle*i, r, i)[1])
            .attr('fill', d => severityColor(d.severity));

      }

      function dateTimeLabel(dateToggle) {
        var className = dateToggle ? 'accident-date' : 'accident-time';
        var shift = dateToggle ? 0 : 17;
        var fontSize = dateToggle ? '10px' : '9px';

        var dateTime = svg.selectAll('.'+className)
          .data([accident]);

        dateTime.exit()
          .style('opacity', '0')
          .style('font-size', '0px')
          .remove();

        dateTime.enter()
          .append('text')
          .attr('class', className+' label NEW')
          .attr('x', centerWidth + 5)
          .attr('y', centerHeight + shift)
          .style('text-anchor', 'middle')
          .style('opacity', '0')
          .style('font-size', fontSize)
          .transition(d3.transition().duration(3000))
          .style('opacity', '1')
          .text(dateTimeText);

        dateTime.transition()
          .style('opacity', '0')
          .transition(d3.transition().duration(3000))
          .attr('x', centerWidth + 5)
          .attr('y', centerHeight + shift)
          .style('opacity', '1')
          .style('font-size', fontSize)
          .text(dateTimeText);

        function dateTimeText(d) {
          if (dateToggle) {
            return new Date(d.date).toLocaleDateString();
          } else {
            var time = new Date(d.date).toLocaleTimeString();
            var parsedTime = /(.+:.+):.+\s(.+)/.exec(time);
            return parsedTime[1].concat(' ').concat(parsedTime[2]);
          }
        }
      }
    }

    return vis;

    function pointOnCircle(angle, radius, i) {
      var center = [centerWidth, centerHeight];

      var shift = (i < 6) ? 0 : 1;
      var angleShift = shift === 1 ? -angle/2 : 0;

      var rads = (angle+angleShift) * Math.PI / 180;

      var x = center[0] + (radius+shift*radius) * Math.cos(rads);
      var y = center[1] + (radius+shift*radius) * Math.sin(rads);

      return [x, y];
    }

  }

  function createMapVis(data) {

    var mapData = data;

    var severityColor = d3.scaleOrdinal()
      .domain(severityTypes)
      .range(severityColorRange);

    var mapObj = {};

    var map = initMap();

    var geoJSONdata = format2geoJSON(mapData.slice(0, 5000));

    map.data.addGeoJson(geoJSONdata);

    map.data.addListener('click', event => {
      hideAbout();
      accidentVis.update(event.feature.getProperty('id'));
    });

    map.data.addListener('mouseover', event => {
      map.data.revertStyle();
      map.data.overrideStyle(event.feature, mapIcon(event.feature, true));
    });

    map.data.addListener('mouseout', event => map.data.revertStyle());

    map.addListener('mouseup', () => mapObj.update(mapData));

    map.addListener('zoom_changed', () => mapObj.update(mapData));

    map.data.setStyle(feature => mapIcon(feature, false));

    mapObj.map = map;

    mapObj.update = data => {

      mapData = data.sort((pre,cur) => pre.severity === cur.severity ? (cur.casualties.length-pre.casualties.length) : (pre.severity < cur.severity ? -1 : 1));

      var ne = map.getBounds().getNorthEast();
      var sw = map.getBounds().getSouthWest();

      var latBounds = [sw.lat(), ne.lat()];
      var lonBounds = [sw.lng(), ne.lng()];

      var dataWithinBounds = mapData.filter( d => inBounds(d.lat, d.lon, latBounds, lonBounds)).slice(0, 3500);
      var oldData = [];

      map.data.forEach(feature => {
        var remaining = dataWithinBounds.find( d => d.id === feature.getProperty('id'));
        if (remaining) {
          oldData.push(remaining);
        } else {
          map.data.remove(feature);
        }
      });

      var newData = dataWithinBounds.filter(x => oldData.indexOf(x) === -1).slice(0, 3500);
      map.data.addGeoJson(format2geoJSON(newData));

    }

    return mapObj;

    function mapIcon(feature, hover) {
      return ({
        title: 'click for details',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: feature.getProperty('casualties')*10,
          fillColor: severityColor(feature.getProperty('severity')),
          fillOpacity: 0.5,
          strokeColor: hover ? '#05ffa7' : 'white',
          strokeWeight: hover ? 2 : .7
        }
      })
    }

    function inBounds(lat, lon, latBounds, lonBounds) {
      return (lat < latBounds[1] && lat > latBounds[0]) && (lon < lonBounds[1] && lon > lonBounds[0]);
    }

    function format2geoJSON(data) {
      var features = data.map( (d,i) => {
        return {
          "type": "Feature",
          "properties": {
            "id": d.id,
            "casualties": d.casualties.length,
            "severity": d.severity
          },
          "geometry": {
            "type": "Point",
            "coordinates": [d.lon, d.lat]
          }
        }
      });

      return {
        "type": "FeatureCollection",
        "features": features
      };
    }

    function initMap() {
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
            { "hue": "#0077ff" },
            { "saturation": -20 }
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
      ];

      return new google.maps.Map(document.getElementById('map'), {
        zoom: 13,
        center: new google.maps.LatLng(51.5, -0.11),
        mapTypeId: google.maps.MapTypeId.TERRAIN,
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: false,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: false,
        styles: options
      });
    }
  }

  function createAgeVis(data) {

    var ageVis = {};

    ageVis.ageBands = [ [0, 4], [5, 11], [12, 17], [18, 24], [25, 34], [35, 49], [50, 74], [75, 100] ];

    ageVis.vis = createHorBarVis(prepareData(data), 'vis-age', 8*22, false);

    ageVis.update = data => ageVis.vis.update(prepareData(data));

    return ageVis;

    function prepareData(data) {

      var ageBands = ageVis.ageBands.map( band => {
        return {type: band, groupType: 'age', Fatal: 0, Severe: 0, Slight: 0, total: 0 };
      });

      var dataSeverityTypes = Array.from( new Set( data.map( d => d.severity ) ) ).sort();

      data.forEach( data => {
        ageBands.forEach( bandObj => {
          data.casualties.forEach( casualty => {
            if (casualty.age >= bandObj.type[0] && casualty.age <= bandObj.type[1]) {
              if (dataSeverityTypes.indexOf(casualty.severity) !== -1) {
                bandObj[casualty.severity] += 1;
              }
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

  function createModeVis(data) {

    var modeVis = {};

    modeVis.modeTypes;

    modeVis.vis = createHorBarVis(preprocessData(data), 'vis-vehicles', 11*22, true);

    modeVis.update = data => modeVis.vis.update(preprocessData(data));

    return modeVis;

    function preprocessData(data) {

      data.forEach( d => {
        d.casualties.forEach( casualty => preprocessCasualtyMode(casualty));
        d.vehicles.forEach( vehicle => preprocessVehicleType(vehicle));
      });

      var casultyModes = [
        { groupType: 'mode', type: 'AgriculturalVehicle', Slight: 0, Severe: 0, Fatal: 0, total: 0},
        { groupType: 'mode', type: 'BusOrCoach', Slight: 0, Severe: 0, Fatal: 0, total: 0},
        { groupType: 'mode', type: 'Car', Slight: 0, Severe: 0, Fatal: 0, total: 0},
        { groupType: 'mode', type: 'GoodsVehicle', Slight: 0, Severe: 0, Fatal: 0, total: 0},
        { groupType: 'mode', type: 'Motorcycle', Slight: 0, Severe: 0, Fatal: 0, total: 0},
        { groupType: 'mode', type: 'OtherMotorVehicle', Slight: 0, Severe: 0, Fatal: 0, total: 0},
        { groupType: 'mode', type: 'OtherNonMotorVehicle', Slight: 0, Severe: 0, Fatal: 0, total: 0},
        { groupType: 'mode', type: 'PedalCycle', Slight: 0, Severe: 0, Fatal: 0, total: 0},
        { groupType: 'mode', type: 'Pedestrian', Slight: 0, Severe: 0, Fatal: 0, total: 0},
        { groupType: 'mode', type: 'Taxi', Slight: 0, Severe: 0, Fatal: 0, total: 0},
        { groupType: 'mode', type: 'TramOrLightRail', Slight: 0, Severe: 0, Fatal: 0, total: 0}
      ];

      modeVis.modeTypes = casultyModes.map(d => d.type);

      casultyModes.forEach( mode => {
        data.forEach( data => {
          if (mode.type === 'Pedestrian') {
            data.casualties.forEach( casualty => {
              if (casualty.mode === 'Pedestrian') {
                mode[data.severity] += 1;
              }
            });
          } else {
            data.vehicles.forEach( vehicle => {
              if (vehicle.type === mode.type) {
                mode[data.severity] += 1;
              }
            });
          }
        });

        mode.total = mode.Slight + mode.Severe + mode.Fatal;
      });

      return casultyModes.sort((pre, cur) => cur.total-pre.total);

      function preprocessCasualtyMode(casualty) {
        switch (casualty.mode) {
          case 'PoweredTwoWheeler':
            casualty.type = 'Motorcycle';
            casualty.fullType = 'PoweredTwoWheeler';
            break;
          case 'OtherVehicle':
            casualty.type = 'OtherMotorVehicle';
            casualty.fullType = 'OtherVehicle';
            break;
          default:
            casualty.type = casualty.mode;
        }
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
  }

  function createHorBarVis(data, idElement, height, iconsEnabled) {

    var tip2 = d3.tip()
      .attr('class', 'd3-tip d3-tip2')
      .html(d => d)
      .direction('e')
      .offset([0,5])

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
      .range(severityColorRange);

    horBarVis.svg = d3.select('#'+idElement)
      .append('svg')
      .attr('width', visWidth + margin*2)
      .attr('height', visHeight + margin)
        .append('g')
        .attr('transform', 'translate('+margin+','+margin+')');

    appendBackground(horBarVis.svg, visWidth, visHeight);

    var xAxis = d3.axisTop(xScale)
      .ticks('4');

    horBarVis.svg.append('g')
        .attr('class', 'axis axis--x')
        .call(xAxis);

    horBarVis.update = function(data) {

      var max = d3.max(data, d => d.total);
      xScale.domain([0, max]).nice();

      var ticks = (max <= 5) ? (max <= 1 ? '1' : '2') : '4';
      xAxis.ticks(ticks);

      horBarVis.svg.select('.axis--x')
        .transition()
        .call(xAxis);

      horBarVis.svg.call(tip2);

      var bars = horBarVis.svg.selectAll('.serie')
        .data(stack.keys(severityTypes)(data), d => d);

      bars.selectAll('rect')
        .transition()
        .style('fill-opacity', 1)
        .attr('x', d => Math.max(shift, xScale(d[0])))
        .attr('width', d => (xScale(d[1]) - xScale(d[0]) === 0) ? 0 : Math.max(1, xScale(d[1]) - xScale(d[0])))

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
            .on('mouseover', d => tip2.show('Casualties: '+(d3.format(',')(d[1]-d[0])) ))
            .on('mouseout', tip2.hide)
          .transition()
            .attr('width', d => (xScale(d[1]) - xScale(d[0]) === 0) ? 0 : Math.max(1, xScale(d[1]) - xScale(d[0])))
            .style('fill-opacity', 1);

      bars.exit()
        .transition()
          .attr('width', 0)
          .remove();
    };

    var groupData = horBarVis.svg.selectAll('.g-bar')
      .data(data);

    var group = groupData.enter()
      .append('g')
        .attr('class', 'g-bar')
        .on('click', function(d) {
          horBarVis.svg.selectAll('.rect-background')
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

    if (iconsEnabled) {
      group.append('rect')
        .attr('class', 'rect-background')
        .attr('x', 0)
        .attr('y', d => yScale(d.type))
        .attr('width', yScale.bandwidth())
        .attr('height', yScale.bandwidth())
        .attr('fill', 'transparent');

      group.append('svg:image')
          .attr('class', 'icon-bar')
          //.on('mouseover', d => tip.show('Vehicle: '+d.type+'<br/> (click to show only<br/>casualties where this<br/>type participated)'))
          .on('mouseover', d => tip2.show('Vehicle: <br/>'+d.type))
          .on('mouseout', tip2.hide)
          .attr('x', 1.5)
          .attr('y', d => yScale(d.type)+1.5)
          .attr('width', yScale.bandwidth()-3)
          .attr('height', yScale.bandwidth()-3)
          .attr('xlink:href', d => 'icons/'+d.type+'.svg');

    } else {
      group.append('rect')
        .attr('class', 'rect-background')
        .attr('x', -8)
        .attr('y', d => yScale(d.type))
        .attr('width', yScale.bandwidth()*3)
        .attr('height', yScale.bandwidth())
        .attr('fill', 'transparent');

      group.append('text')
          .attr('class', 'label-bar label')
          //.on('mouseover', d => tip.show('Age range: '+d.type[0]+'-'+d.type[1]+'<br/> (click to show only<br/>casualties where this<br/>group participated)'))
          .on('mouseover', d => tip2.show('Age range: <br/>'+d.type[0]+'-'+d.type[1]))
          .on('mouseout', tip2.hide)
          .attr('x', margin/3*2)
          .attr('y', d => yScale(d.type)+yScale.bandwidth()/4*3)
          .text(d => {
            if (d.type[1]===100) {
              return d.type[0]+'+y';
            } else {
              return d.type[0]+'-'+d.type[1]+'y';
            }
          });
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

    boroughVis.londonBoroughs = londonBoroughs;

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
        .range(['#05cc7f', '#00472c']);

      boroughVis.svg = d3.select('#'+idElement)
        .append('svg')
          .attr('width', visWidth + margin)
          .attr('height', visHeight + margin)
        .append('g')
          .attr('transform', 'translate('+ margin +','+ margin +')');

      boroughVis.svg.call(tip);

      appendBackground(boroughVis.svg, visWidth, visHeight);

      boroughVis.update = function(data) {

        casualtiesScale.domain(d3.extent(data.map(d => d.casualties)));

        var groupData = boroughVis.svg.selectAll('.g-borough')
          .data(data, d => d);

        var group = groupData.enter()
          .append('g')
            .attr('class', 'g-borough')
          .on('click', function(d) {
            boroughVis.svg.selectAll('.rect-selected')
              .classed('rect-selected', false);

            toggleClass(d3.select(this), '.borough-rect', 'rect-selected', true);

            updateAllVis('borough', d.name);
          })
          .on('mouseover', function (d) {
            toggleClass(d3.select(this), '.borough-rect', 'rect-hover', true);
            tip.show(d.name+'<br/>Number of casualties: '+d.casualties);
            //tip.show(d.name+'<br/>Number of casualties: '+d.casualties+'<br/><br/>(click to filter)');
          })
          .on('mouseout', function (d) {
            toggleClass(d3.select(this), '.borough-rect', 'rect-hover', false);
            tip.hide();
          });

        var rect = group.append('rect')
          .attr('class', 'borough-rect');

        rect.exit()
          .transition()
            .style('opacity', 1e-6)
            .remove();

        rect.transition()
          .attr('fill', d => casualtiesScale(d.casualties));

        rect.attr('id', d => 'borough-rect-'+d.nameShort)
            .attr('class', 'borough-rect')
            .attr('x', d => d.pos[0]*boxWidth + d.pos[0]*shift)
            .attr('y', d => d.pos[1]*boxWidth + d.pos[1]*shift)
            .attr('width', boxWidth)
            .attr('height', boxWidth)
            .style('fill-opacity', 0)
          .transition()
            .attr('fill', d => casualtiesScale(d.casualties))
            .style('fill-opacity', 1);

        group.append('text')
            .attr('id', d => 'borough-num-'+d.nameShort)
            .attr('class', 'borough-num label')
            .attr('x', d => d.pos[0]*boxWidth + d.pos[0]*shift + boxWidth - shift*2)
            .attr('y', d => d.pos[1]*boxWidth + d.pos[1]*shift + boxWidth - shift*2)
            .style('font-size', d => (boxWidth < 40) ? '10px' : '13px' )
          .text(d => d.casualties);

        group.append('text')
            .attr('id', d => 'borough-label-'+d.nameShort)
            .attr('class', 'borough-label label')
            .attr('x', d => d.pos[0]*boxWidth + d.pos[0]*shift + shift*2)
            .attr('y', d => d.pos[1]*boxWidth + d.pos[1]*shift + shift*6)
            .style('font-size', d => (boxWidth < 40) ? '9px' : '13px' )
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

  function createSeverityVis(types) {

    var severityVis = {};

    var severityTypes = types.map( d => {
      if (d === 'Slight') {
        return { type: d, selected: false };
      } else {
        return { type: d, selected: true };
      }
    });

    var boxWidth = 20;

    var severityColor = d3.scaleOrdinal()
      .domain(types)
      .range(severityColorRange);

    var margin = 10;
    var visWidth = width - margin*4;
    var visHeight = 70 - margin*2;

    var svg = d3.select('#options-severity')
      .append('svg')
        .attr('width', visWidth + margin*4)
        .attr('height', visHeight + margin)
      .append('g')
        .attr('transform', 'translate('+ margin*4 +','+ margin +')');

    var options = svg.selectAll('.option-severity')
      .data(severityTypes)
      .enter()
      .append('rect')
        .attr('class', 'option-severity')
        .attr('x', (d, i) => i*80 + boxWidth)
        .attr('y', 5)
        .attr('width', boxWidth)
        .attr('height', boxWidth)
        .attr('stroke', d => severityColor(d.type))
        .attr('stroke-width', 5)
        .attr('fill', d => d.selected ? severityColor(d.type) : 'transparent')
      .on('click', function(d) {
        d3.select(this).attr('fill', () => d.selected ? 'transparent' : severityColor(d.type));
        d.selected = !d.selected;
        updateAllVis('severity', severityTypes.filter(d => d.selected).map(d => d.type));
      });

    var labels = svg.selectAll('.label-severity')
      .data(types)
      .enter()
      .append('text')
        .attr('class', 'label label-severity')
        .attr('x', (d, i) => i*80 + boxWidth*2 + 10)
        .attr('y', 20)
        .text(d => d);

    severityVis.severityTypes = types;

    severityVis.resetAll = () => {
      options.each(function(d) {
        if (d.type === 'Slight') {
          d3.select(this).attr('fill', 'transparent');
          d.selected = false;
        } else {
          d3.select(this).attr('fill', severityColor(d.type));
          d.selected = true;
        }
      });
    };

    return severityVis;
  }
}
