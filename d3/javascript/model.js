let agencies = null;
let countries = null;
let initial_data = null;
const features = {};
let forest = null;

Promise.all([d3.csv(`../data/models/rf_trees/meta/agencies.csv`),
	d3.csv('../data/models/rf_trees/meta/2014_september.csv'),
	d3.csv(`../data/models/rf_trees/meta/countries.csv`)]).then(async data => {
	agencies = data[0];
	initial_data = data[1];
	countries = data[2];

	data[1].forEach(d => {
		document.body.append(document.createElement('br'));
		const label = document.createElement('p');
		label.innerText = d['feature'];
		const input = document.createElement('input');
		input.value = d['value'];
		input.setAttribute('id', d['feature'])
		input.onchange = predict;
		document.body.append(label);
		document.body.append(input);
	});

	forest = await RandomForest.loadForest(185);
	predict();
});

const reload = () => {
	const value = document.querySelector('#file_selector').value;
	Promise.all([d3.csv(`../data/models/rf_trees/meta/${value}.csv`)]).then(async data => {
		data[0].forEach(d => {
			const input = document.querySelector(`#${d['feature']}`);
			input.value = d['value'];
		});
		predict();
	});
}

const predict = () => {
	const results = forest.predict(calculateFeatures());
	console.log(results);
	document.querySelector('#prediction_label').innerText = `By a ${Math.max(results[0], results[1])}-${Math.min(results[0], results[1])} margin, our forest thinks your administration would likely be ${results[0] > results[1] ? 'Republican' : 'Democrat'}.`;
}

const calculateFeatures = () => {
	const features = {};
	initial_data.forEach(k => {
		features[k.feature] = parseFloat(document.querySelector(`#${k.feature}`).value);
	});

	return features;
}