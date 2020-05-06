const PLOT_WIDTH = window.innerWidth - 40;
const PLOT_HEIGHT = window.innerHeight - 100;


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
	'Secretary of Homeland Security': 'DEPARTMENT OF HOMELAND SECURITY (DHS)'};


const color_map = (map, color, data, div) => {
	map.attr("fill", d => {
		if (isoCountries[d['properties']['name']] === undefined) {
			return "#ccc"; // Can't find ISO 2
		}
		if (iso2Toiso3[isoCountries[d['properties']['name']]] === undefined) {
			return "#ccc"; // Can't find ISO 3
		}
		if (data[iso2Toiso3[isoCountries[d['properties']['name']]]] === undefined) {
			data[iso2Toiso3[isoCountries[d['properties']['name']]]] = 0;
		}
		return color(data[iso2Toiso3[isoCountries[d['properties']['name']]]]);
	}).on("mouseover", function(d) {
			const sel = d3.select(this);
			d3.select(this).transition().duration(300).style("opacity", 0.8);
			div.transition().duration(300)
				.style("opacity", 1)
			div.text(d['properties']['name'] + ": " + Formatter.humanReadable(data[iso2Toiso3[isoCountries[d['properties']['name']]]], 1, '', true))
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


const init = async () => {
	await Promise.all([d3.csv('../data/csv/Aggregate_federal_spending_country_month_agency.csv'),
	d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')]).then(data => {
		const spending = data[0];
		const world = data[1];

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
			s = .95 / Math.max((b[1][0] - b[0][0]) / PLOT_WIDTH, (b[1][1] - b[0][1]) / PLOT_HEIGHT),
			t = [(PLOT_WIDTH - s * (b[1][0] + b[0][0])) / 2, (PLOT_HEIGHT - s * (b[1][1] + b[0][1])) / 2];
		projection
			.scale(s)
			.translate(t);

		const svg = d3.select('#map_svg').attr('width', PLOT_WIDTH).attr('height', PLOT_HEIGHT);

		const list_spending_by_country = d3.nest()
			.key(function(d) { return d['country']; })
			.rollup(v => d3.sum(v, d => d['sum']))
			.entries(spending);

		const spending_by_country = {};
		list_spending_by_country.forEach(d => {
			spending_by_country[d['key']] = d['value']
		});

		const color_range = d3.schemeGreens[8]

		const color = d3.scaleThreshold()
			.domain([
				Math.pow(10, 6),
				Math.pow(10, 7),
				Math.pow(10, 8),
				Math.pow(10, 9),
				Math.pow(10, 10),
				Math.pow(10, 11),
				Math.pow(10, 12),])
			.range(color_range);

		const map_group = svg.append("g")
		const map = map_group.selectAll("path")
			.data(countries)
			.join("path")
			.attr("fill", '#ccc')
			.attr('stroke', "#000")
			.attr("d", path);

		color_map(map, color, spending_by_country, div);

		const department_select = document.querySelector('#department_select');
		department_select.selectedIndex = 0;
		department_select.addEventListener('change', () => {
			const value = department_select.value;

			if ('all' === value) {
				color_map(map, color, spending_by_country, div);
			} else if ('cabinet' === value) {
				const list_cabinet_spending_by_country = d3.nest()
					.key(function(d) { return d['country']; })
					.rollup(v => d3.sum(v, d => d['sum']))
					.entries(spending.filter(d => Object.values(position_agency_mappings).includes(d['agency'])));

				const cabinet_spending_by_country = {};
				list_cabinet_spending_by_country.forEach(d => {
					cabinet_spending_by_country[d['key']] = d['value']
				})
				color_map(map, color, cabinet_spending_by_country, div);
			} else {
				const list_department_spending_by_country = d3.nest()
					.key(function(d) { return d['country']; })
					.rollup(v => d3.sum(v, d => d['sum']))
					.entries(spending.filter(d => d['agency'] === position_agency_mappings[value]));

				const department_spending_by_country = {};
				list_department_spending_by_country.forEach(d => {
					department_spending_by_country[d['key']] = d['value']
				})
				color_map(map, color, department_spending_by_country, div);
			}
		});
	});
};

window.onload = init;
