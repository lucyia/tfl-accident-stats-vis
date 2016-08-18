d3.json('data.json', data => createVis(data) );

function createVis(data) {

  // severity - 3 unique values
  // ["Slight", "Severe", "Fatal"]
  var severityTypes = Array.from( new Set( data.map( d => d.severity ) ) );

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

}
