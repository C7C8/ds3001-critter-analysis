let agencies = null;
let countries = null;
const features = {};
let forest = null;

Promise.all([d3.csv(`../data/models/rf_trees/meta/agencies.csv`),
	d3.csv('../data/models/rf_trees/meta/2018_january.csv'),
	d3.csv(`../data/models/rf_trees/meta/countries.csv`)]).then(async data => {
	data[1].sort((a,b ) => ((a['country'] < b['country']) ? -1 : ((a['country'] > b['country']) ? 1 : 0)))
	const rows = data[1].length + 1;
	const cols = data[0].length + 1;

	agencies = data[0];
	countries = data[2];

	const body = document.getElementsByTagName('body')[0];
	const tbl = document.createElement('table');
	tbl.style.width = '100%';
	tbl.setAttribute('border', '1');
	const tbdy = document.createElement('tbody');
	for (let i = 0; i < rows; i++) {
		const tr = document.createElement('tr');
		for (let j = 0; j < cols; j++) {
			const td = document.createElement('td');
			if (i === 0) {
				if (j === 0) td.innerText = 'Country/Agency'
				else if (j <= data[0].length) td.innerText = data[0][j-1]['agency']
			} else if (j === 0 && i >= 1) td.innerText = data[1][i - 1]['country']
			else {
				const input = document.createElement('input');
				input.setAttribute('type', 'number');
				if (j <= data[0].length) input.id = data[0][j-1]['agency'];
				input.value = Math.round(data[1][i-1][data[0][j-1]['agency']]);
				input.id += '-' + data[1][i-1]['country'];
				input.onchange = predict;
				td.appendChild(input)
			}
			tr.appendChild(td)
		}
		tbdy.appendChild(tr);
	}
	tbl.appendChild(tbdy);
	body.appendChild(tbl);
	forest = await RandomForest.loadForest(185);
	predict();
});

const predict = () => {
	console.log('Predict');
	const results = forest.predict(calculateFeatures());
	document.querySelector('#prediction_label').innerText = `Based on your spending, your administration would likely be ${results[0] > results[1] ? 'Republican' : 'Democrat'}.`;
}

const calculateFeatures = () => {
	// Expect 3456 features
	const features = {
		'total': 0,
		'total_foreign': 0
	}

	agencies.forEach(agency => {
		features[`total_${agency['agency']}`] = 0;
		features[`total_foreign_${agency['agency']}`] = 0;
	});

	countries.forEach(country => {
		features[`total_to_${country['country']}`] = 0;
	});

	agencies.forEach(agency => {
		countries.forEach(country => {
			const value = parseInt(document.querySelector(`#${agency['agency']}-${country['country']}`).value);

			features['total'] += value;
			features[`total_${agency['agency']}`] += value;
			features[`total_to_${country['country']}`] += value;

			if ('USA' !== country['country']) {
				features[`total_foreign_${agency['agency']}`] += value;
				features['total_foreign'] += value;
			}
		});
	});

	features['pct_foreign'] = features['total_foreign'] / features['total'];

	delete features['total_foreign'];

	agencies.forEach(agency => {
		features[`pct_foreign_${agency['agency']}`] = features[`total_foreign_${agency['agency']}`] / features[`total_${agency['agency']}`];
		delete features[`total_foreign_${agency['agency']}`];
	});

	countries.forEach(country => {
		features[`pct_total_to_${country['country']}`] = features[`total_to_${country['country']}`] / features['total'];
	});

	agencies.forEach(agency => {
		countries.forEach(country => {
			features[`pct_${agency['agency']}_total_to_${country['country']}`] = features[`total_to_${country['country']}`] / features[`total_${agency['agency']}`];
			delete features[`total_to_${country['country']}`];
		});
	});

	Object.keys(features).forEach(key => {
		if (isNaN(features[key])) features[key] = 0;
	})

	return features;
}