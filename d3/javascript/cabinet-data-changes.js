const PLOT_WIDTH = window.innerWidth / 2 - 20;
const PLOT_HEIGHT = 400;
const MARGIN_LEFT = 75;
const MARGIN_RIGHT = 75;
const MARGIN_BOTTOM = 40;
const MARGIN_TOP = 50;

// Add function to date for determining leap year
Date.prototype.isLeapYear = function() {
	const year = this.getFullYear();
	if((year & 3) !== 0) return false;
	return ((year % 100) !== 0 || (year % 400) === 0);
};

// Get Day of Year
Date.prototype.getDOY = function() {
	const dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
	const mn = this.getMonth();
	const dn = this.getDate();
	let dayOfYear = dayCount[mn] + dn;
	if(mn > 1 && this.isLeapYear()) dayOfYear++;
	return dayOfYear;
};

// Add and format a plot title
const plot_title = (elem, title) => {
	return elem.append('text')
		.attr('font-size', '16px')
		.attr('font-family', 'sans-serif')
		.attr('dominant-baseline', 'hanging')
		.attr('text-anchor', 'middle')
		.attr('x', PLOT_WIDTH / 2)
		.attr('y', 25)
		.text(title);
};

const build_x_scale = (x_data) => {
	return d3.scaleLinear()
		.domain([x_data[0], x_data[x_data.length - 1]])
		.range([MARGIN_LEFT, PLOT_WIDTH - MARGIN_RIGHT]);
}

// Based on: https://bl.ocks.org/gordlea/27370d1eea8464b04538e6d8ced39e89
const plot_data = (group, x_data, y_data, x_scale) => {

	const y_scale = d3.scaleLinear()
		.domain([Math.min(...y_data), Math.max(...y_data)])
		.range([PLOT_HEIGHT - MARGIN_BOTTOM, MARGIN_TOP]);

	const line = d3.line()
		.x(d => x_scale(d[0]))
		.y(d => y_scale(d[1]))
		.curve(d3.curveMonotoneX);

	// Zip x and y
	const dataset = x_data.map((e, i) => [e, y_data[i]]);

	group.append('path')
		.datum(dataset)
		.attr('class', 'line')
		.attr('d', line)
		.style("pointer-events", "none");

	group.append("g")
		.attr("class", "x_axis")
		.attr("transform", `translate(0,${PLOT_HEIGHT-MARGIN_BOTTOM})`)
		.call(d3.axisBottom(x_scale)
			.tickFormat(d => d)); // Create an axis component with d3.axisBottom

	group.append("g")
		.attr("class", "x_axis")
		.attr("transform", `translate(0,${MARGIN_TOP})`)
		.call(d3.axisTop(x_scale).tickValues([]));

	group.append("g")
		.attr("class", "y_axis")
		.attr("transform", `translate(${MARGIN_LEFT},0)`)
		.call(d3.axisLeft(y_scale)
			.tickFormat(d => Formatter.humanReadable(d, 1, '', true))); // Create an axis component with d3.axisLeft

	group.append('text')
		.attr('x', PLOT_WIDTH / 2)
		.attr('y', PLOT_HEIGHT - 5)
		.attr('font-family', 'sans-serif')
		.attr('text-anchor', 'middle')
		.text('Year');

	group.append('text')
		.attr('font-family', 'sans-serif')
		.attr('text-anchor', 'middle')
		.attr("transform", `translate(20, ${(PLOT_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM) / 2 + MARGIN_TOP}) rotate(-90)`)
		.text('Total Spending ($)');

	group.append('text')
		.attr('font-family', 'sans-serif')
		.attr('text-anchor', 'middle')
		.attr("transform", `translate(${(PLOT_WIDTH - 15)}, ${(PLOT_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM) / 2 + MARGIN_TOP}) rotate(90)`)
		.text('Percent of Total Spending');

	return x_scale;
};

const plot_confirmation = (group, x_data, position_confirmations, x_scale, title) => {
	position_confirmations = position_confirmations.filter(d => convert_to_relative_year(d['Confirmed']) >= x_data[0] && convert_to_relative_year(d['Confirmed']) <= x_data[x_data.length - 1]);
	position_confirmations.push({'Confirmed': x_data[x_data.length - 1] + "-01-01", 'Party': position_confirmations[position_confirmations.length - 1]['Party']});

	group.selectAll('.conf_box')
		.data(position_confirmations)
		.enter()
		.append('rect')
		.attr('class', (d, i) => {
			if (i === 0) return `conf_box ${d['Party'].toLowerCase()}`;
			else return `conf_box ${position_confirmations[i - 1]['Party'].toLowerCase()}`;
		})
		.attr('x', (d, i) => {
			if (i === 0) return x_scale(x_data[0]);
			else return x_scale(convert_to_relative_year(position_confirmations[i - 1]['Confirmed']));
		})
		.attr('y', MARGIN_TOP)
		.attr('width', (d, i) => {
			if (i === 0) return x_scale(convert_to_relative_year(d['Confirmed'])) - x_scale(x_data[0]);
			else return x_scale(convert_to_relative_year(d['Confirmed'])) - x_scale(convert_to_relative_year(position_confirmations[i-1]['Confirmed']));
		})
		.on('mouseover', (d, i) => {
			let text_parts = title.text().split(' - ');

			if (i === 0) return;
			else if (2 === text_parts.length) text_parts.splice(1, 0, position_confirmations[i-1]['Nominee']);

			title.text(text_parts.join(' - '));
		})
		.on('mouseout', d => {
			let text_parts = title.text().split(' - ');
			if (3 === text_parts.length) text_parts.splice(1, 1);
			title.text(text_parts.join(' - '));
		})
		.attr('height', PLOT_HEIGHT - MARGIN_BOTTOM - MARGIN_TOP);

	position_confirmations.pop();

	group.selectAll('.conf_line')
		.data(position_confirmations.slice())
		.enter()
		.append('line')
		.attr('class', d => `conf_line ${d['Party'].toLowerCase()}`)
		.attr('y1', MARGIN_TOP)
		.attr('y2', PLOT_HEIGHT - MARGIN_BOTTOM)
		.attr('x1', d => x_scale(convert_to_relative_year(d['Confirmed'])))
		.attr('x2', d => x_scale(convert_to_relative_year(d['Confirmed'])))
		.on('mouseover', d => {
			let text_parts = title.text().split(' - ');
			if (2 === text_parts.length) text_parts.splice(1, 0, d['Nominee']);
			title.text(text_parts.join(' - '));
		})
		.on('mouseout', d => {
			let text_parts = title.text().split(' - ');
			if (3 === text_parts.length) text_parts.splice(1, 1);
			title.text(text_parts.join(' - '));
		})
		.style('stroke-width', '6px');

}

const plot_percent_data = (group, x_data, y_data, x_scale) => {
	const y_scale = d3.scaleLinear()
		.domain([Math.min(...y_data), Math.max(...y_data)])
		.range([PLOT_HEIGHT - MARGIN_BOTTOM, MARGIN_TOP]);

	const line = d3.line()
		.x(d => x_scale(d[0]))
		.y(d => y_scale(d[1]))
		.curve(d3.curveMonotoneX);

	// Zip x and y
	const dataset = x_data.map((e, i) => [e, y_data[i]]);

	group.append('path')
		.datum(dataset)
		.attr('class', 'line line_percent')
		.attr('d', line)
		.style("pointer-events", "none");

	group.append("g")
		.attr("class", "y_axis")
		.attr("transform", `translate(${PLOT_WIDTH - MARGIN_RIGHT},0)`)
		.call(d3.axisRight(y_scale)
			.tickFormat(d => (d*100.0).toFixed(2) + '%')); // Create an axis component with d3.axisLeft


};

const plot_position = (svg, y_offset, position_data, position_confirmations) => {
	const domestic_group = svg.append('g').attr('transform', `translate(0, ${y_offset})`);
	const foreign_group = svg.append('g').attr('transform', `translate(${PLOT_WIDTH}, ${y_offset})`);

	const domestic_title = plot_title(domestic_group, `${position_data['position']} - Domestic Spending`);
	const foreign_title = plot_title(foreign_group, `${position_data['position']} - Foreign Spending`);

	const domestic_data = position_data['domestic_spending'].map(d => isNaN(d) ? 0 : d).slice(11);
	const foreign_data = position_data['foreign_spending'].map(d => isNaN(d) ? 0 : d).slice(11);

	const domestic_percent = domestic_data.map((d, i) => i >= foreign_data.length ? 1 : (d) / (d + foreign_data[i]));
	const foreign_percent = foreign_data.map((d, i) => i >= domestic_data.length ? 1 : (d) / (d + domestic_data[i]));

	const x_data = position_data['domestic_dates'].slice(11);
	const x_scale = build_x_scale(x_data);

	plot_confirmation(domestic_group, x_data, position_confirmations, x_scale, domestic_title);
	plot_confirmation(foreign_group, x_data, position_confirmations, x_scale, foreign_title);

	plot_percent_data(domestic_group, x_data, domestic_percent, x_scale);
	plot_percent_data(foreign_group, x_data, foreign_percent, x_scale)

	plot_data(domestic_group, x_data, domestic_data, x_scale);
	plot_data(foreign_group, x_data, foreign_data, x_scale);

	return [domestic_group, foreign_group];
};

const convert_to_relative_year = (date_str) => {
	const date = new Date(date_str);
	return date.getFullYear() + date.getDOY() / (date.isLeapYear() ? 366.0 : 365.0);
}

const create_option = (value, text) => {
	const option = document.createElement('option');
	option.value = value;
	option.innerText = text;
	return option;
}


const init = async () => {
	await Promise.all([d3.json('../data/json/cabinet-data-changes.json'),
		d3.csv('../data/csv/cabinet.csv')]).then(data => {
			const num_positions = data[0].length;

			const svg = d3.select('#main_svg').attr('width', PLOT_WIDTH*2).attr('height', PLOT_HEIGHT*num_positions);

			const groups = {};

			const departmentSelect = document.querySelector('#department_select');
			// Clear options for the select
			departmentSelect.innerHTML = '';
			departmentSelect.appendChild(create_option('all', 'All'));
			departmentSelect.selectedIndex = 0;

			data[0].forEach((position_data, index) => {
				const position_confirmations = data[1].filter(d => d["Position"] === position_data['position']);
				groups[position_data['position']] =
					plot_position(svg, PLOT_HEIGHT*index, position_data, position_confirmations);
				departmentSelect.appendChild(create_option(position_data['position'], position_data['position']))
			});


			departmentSelect.addEventListener('change', () => {
				if (departmentSelect.value === 'all') {
					let y_offset = 0;
					for (let [key, value] of Object.entries(groups)) {
						value[0].style('display', '').attr('transform', `translate(0, ${y_offset})`);
						value[1].style('display', '').attr('transform', `translate(${PLOT_WIDTH}, ${y_offset})`);
						y_offset += PLOT_HEIGHT
					}

					svg.attr('height', PLOT_HEIGHT*num_positions);
				} else {
					for (let [key, value] of Object.entries(groups)) {
						if (key === departmentSelect.value) {
							value[0].style('display', '').attr('transform', `translate(0, 0) scale(2.0)`);
							value[1].style('display', '').attr('transform', `translate(0, ${PLOT_HEIGHT*2}) scale(2.0)`);
						} else {
							value[0].style('display', 'none');
							value[1].style('display', 'none');
						}
					}
					svg.attr('height', PLOT_HEIGHT*4);
				}
			});

	});
};

window.onload = init;
