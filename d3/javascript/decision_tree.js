const Node = class {
	constructor (feature, threshold, child_0=null, child_1=null, classification=-1, samples=0, value) {
		this.feature = feature;
		this.threshold = threshold;
		this.child_0 = child_0;
		this.child_1 = child_1;
		this.classification = classification;
		this.samples = samples;
		this.value = value;
	}

	getClassification() {
		return this.classification;
	}

	isLeaf () {
		return null === this.child_0 && null === this.child_1;
	}

	decide (data) {
		return this.evaluate(data) ? this.child_0 : this.child_1;
	}

	evaluate (data) {
		let result = false;
		data.forEach(f => {
			if (f['feature'] === this.feature)
				result = parseFloat(f['value']) <= this.threshold;
		})
		return result;
	}

	buildModelForDisplay (data, visited) {
		if (!this.isLeaf()) {
			let visited_0 = false
			if (this.decide(data) === this.child_0) visited_0 = true;

			return {
				'feature': this.feature,
				'threshold': this.threshold,
				'visited': visited,
				'samples': this.samples,
				'value': this.value,
				'evaluation': this.evaluate(data),
				'children': [this.child_0.buildModelForDisplay(data, visited_0 && visited), this.child_1.buildModelForDisplay(data, !visited_0 && visited)]
			}
		} else {
			return {
				'classification': this.classification === 0 ? 'Republican' : 'Democrat',
				'visited': visited
			}
		}
	}
}

const DecisionTree = class {
	constructor (root) {
		this.root = root;
	}

	static async loadTree(json_path) {
		const model_json = await d3.json(json_path);
		return new DecisionTree(DecisionTree.buildTree(model_json));
	}

	static buildTree(root) {
		if ('leaf' === root.type) {
			return new Node(null, null, null, null, root.value[0] > 0 ? 0 : 1);
		} else {
			const child_0 = DecisionTree.buildTree(root.children[0]);
			const child_1 = DecisionTree.buildTree(root.children[1]);
			return new Node(root.feature, root.threshold, child_0, child_1, -1, root.samples, root.value);
		}
	}

	classify(data) {
		let node = this.root;

		while (false === node.isLeaf()) {
			node = node.decide(data);
		}

		return node.getClassification();
	}

	buildModelForDisplay(data) {
		return this.root.buildModelForDisplay(data, true);
	}
}
