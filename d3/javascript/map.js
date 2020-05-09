const position_agency_mappings = {
	'Secretary of State': 'DEPARTMENT OF STATE (DOS)',
	'Secretary of Agriculture': 'DEPARTMENT OF AGRICULTURE (USDA)',
	'Secretary of Commerce': 'DEPARTMENT OF COMMERCE (DOC)',
	'Secretary of Housing and Urban Development': 'DEPARTMENT OF HOUSING AND URBAN DEVELOPMENT (HUD)',
	'Secretary of the Treasury': 'DEPARTMENT OF THE TREASURY (TREAS)',
	'Attorney General': 'DEPARTMENT OF JUSTICE (DOJ)',
	'Secretary of Defense': 'DEPARTMENT OF DEFENSE (DOD)',
	'Secretary of Education': 'DEPARTMENT OF EDUCATION (ED)',
	'Secretary of Health and Human Services': 'DEPARTMENT OF HEALTH AND HUMAN SERVICES (HHS)',
	'Secretary of the Interior': 'DEPARTMENT OF THE INTERIOR (DOI)',
	'Secretary of Veterans Affairs': 'DEPARTMENT OF VETERANS AFFAIRS (VA)',
	'Secretary of Energy': 'DEPARTMENT OF ENERGY (DOE)',
	'Secretary of Transportation': 'DEPARTMENT OF TRANSPORTATION (DOT)',
	'Secretary of Labor': 'DEPARTMENT OF LABOR (DOL)',
	'Secretary of Homeland Security': 'DEPARTMENT OF HOMELAND SECURITY (DHS)'
};


/* data: {
	country: {value: 0.00, format: '0.00'}
}
 */
const color_map = (map, color, data, div) => {
	map.attr("fill", d => {
		if (isoCountries[d['properties']['name']] === undefined) {
			return "#ccc"; // Can't find ISO 2
		}
		if (iso2Toiso3[isoCountries[d['properties']['name']]] === undefined) {
			return "#ccc"; // Can't find ISO 3
		}
		if (data[iso2Toiso3[isoCountries[d['properties']['name']]]] === undefined) {
			data[iso2Toiso3[isoCountries[d['properties']['name']]]] = {
				'value': 0.0,
				'format': '0.0%'
			};
		}
		return color(data[iso2Toiso3[isoCountries[d['properties']['name']]]]['value']);
	}).on("mouseover", function(d) {
			const sel = d3.select(this);
			d3.select(this).transition().duration(300).style("opacity", 0.8);
			div.transition().duration(300)
				.style("opacity", 1)
			div.text(d['properties']['name'] + ": " + data[iso2Toiso3[isoCountries[d['properties']['name']]]]['format'])
				.style("left", (d3.event.pageX) + "px")
				.style("top", (d3.event.pageY -30) + "px");
		})
		.on("mouseout", function() {
			const sel = d3.select(this);
			d3.select(this)
				.transition().duration(300)
				.style("opacity", 1);
			div.transition().duration(300)
				.style("opacity", 0);
		});
}

/**
 * Returns [map, color scale, tooltip div]
 */
const initializeMap = async (map_id, width, height, map_clicked) => {
	return await Promise.all([d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')]).then(data => {
		const world = data[0];

		const div = d3.select("body").append("div")
			.attr("class", "tooltip")
			.style("opacity", 0);

		const projection = d3.geoEqualEarth().scale(400);

		projection
			.scale(1)
			.translate([0, 0]);

		const countries = topojson.feature(world, world.objects['countries']).features
		const path = d3.geoPath().projection(projection);

		const b = [[-1.5, -1.5], [1.5, 1.5]],
			s = .95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height),
			t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];
		projection
			.scale(s)
			.translate(t);

		const svg = d3.select(map_id).attr('width', width).attr('height', height);

		const color_range = d3.schemeGreens[8]

		const color = d3.scaleThreshold()
			.domain([
				Math.pow(10, -8),
				Math.pow(10, -7),
				Math.pow(10, -6),
				Math.pow(10, -5),
				Math.pow(10, -4),
				Math.pow(10, -2),
				Math.pow(10, -1),
				Math.pow(10, 0),])
			.range(color_range);

		const map_group = svg.append("g")
		const map = map_group.selectAll("path")
			.data(countries)
			.join("path")
			.attr("fill", '#ccc')
			.attr('stroke', "#000")
			.attr("d", path)
			.on('mousedown', map_clicked);

		return [map, color, div];
	});
};
