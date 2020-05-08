Promise.all([d3.csv(`../data/models/rf_trees/meta/agencies.csv`),
	d3.csv('../data/models/rf_trees/meta/countries.csv')]).then(data => {
	data[1].sort((a,b ) => ((a['country'] < b['country']) ? -1 : ((a['country'] > b['country']) ? 1 : 0)))
	const rows = data[1].length + 1;
	const cols = data[0].length + 2;

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
				else td.innerText = 'other'
			} else if (j === 0 && i >= 1) td.innerText = data[1][i - 1]['country']
			else {
				const input = document.createElement('input');
				input.setAttribute('type', 'number');
				if (j <= data[0].length) input.id = data[0][j-1]['agency'];
				else input.id = 'other';

				input.id += '-' + data[1][i-1]['country'];
				td.appendChild(input)
			}
			tr.appendChild(td)
		}
		tbdy.appendChild(tr);
	}
	tbl.appendChild(tbdy);
	body.appendChild(tbl);
});

const testForest = async () => {
	const forest = await RandomForest.loadForest(185);
	console.log(forest.trees.length);
}
