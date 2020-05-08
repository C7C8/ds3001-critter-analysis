const RandomForest = class {

	constructor(trees) {
		this.trees = trees;
	}

	static async loadForest(count) {
		const trees_ids = [];

		for(let i = 0; i < count; i++) {
			trees_ids.push(i);
		}

		const tree_promises = trees_ids.map(async i => await DecisionTree.loadTree(`../data/models/rf_trees/model_${i}.json`))

		const trees = await Promise.all(tree_promises).then(d => d);

		return new RandomForest(trees);
	}

	predict(data) {
		const votes = [0, 0];

		this.trees.forEach(tree => {
			votes[tree.classify(data)] += 1;
		});

		return votes;
	}
}
