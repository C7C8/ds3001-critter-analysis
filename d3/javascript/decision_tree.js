const Node = class {
	constructor (feature, threshold, child_0=null, child_1=null, classification=-1) {
		this.feature = feature;
		this.threshold = threshold;
		this.child_0 = child_0;
		this.child_1 = child_1;
		this.classification = classification;
	}

	getClassification() {
		return this.classification;
	}

	isLeaf () {
		return null === this.child_0 && null === this.child_1;
	}

	decide (data) {
		let result = null;
		data.forEach(f => {
			if (f['feature'] === this.feature)
				result = parseFloat(f['value']) <= this.threshold ? this.child_0 : this.child_1;
		})
		return result;
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
			return new Node(root.feature, root.threshold, child_0, child_1, -1);
		}
	}

	classify(data) {
		let node = this.root;

		while (false === node.isLeaf()) {
			node = node.decide(data);
		}

		return node.getClassification();
	}
}
