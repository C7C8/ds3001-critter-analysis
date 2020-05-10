let feature_data;
let selected_country_code = 'USA';
let selected_country_name = 'United States of America';
let selected_agency = 'doj';
let forest = null;
let tree_svg = null;
let tree_map = null;
let map = null;
let tooltip_div = null;
let map_scale = null;

const TREE_MARGIN = {top: 0, right: 90, bottom: -500, left: 220};
let tree_i = 0;
const tree_duration = 750;
let tree_root = null;

const tree_link_width_scale = d3.scaleLinear()
    .domain([1/168.0, 0.75])
    .range([4, 20])

const tree_link_dem_color_scale = d3.scaleLinear()
    .domain([0.5, 1])
    .range(['#800080', '#00f']);
const tree_link_rep_color_scale = d3.scaleLinear()
    .domain([0.5, 1])
    .range(['#800080', '#f00']);

function updateTree(source) {

    // Assigns the x and y position for the nodes
    const treeData = tree_map(tree_root);

    // Compute the new tree layout.
    const nodes = treeData.descendants(),
        links = treeData.descendants().slice(1);

    // Normalize for fixed-depth.
    nodes.forEach(function (d) {
        d.y = d.depth * 180
    });

    // ****************** Nodes section ***************************

    // Update the nodes...
    const node = tree_svg.selectAll('g.node')
        .data(nodes, function (d) {
            return d.id || (d.id = ++tree_i);
        });

    // Enter any new modes at the parent's previous position.
    const nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr("transform", function () {
            return "translate(" + source.y0 + "," + source.x0 + ")";
        })
        .on('click', click);

    // Add Circle for the nodes
    nodeEnter.append('circle')
        .attr('class', 'node')
        .attr('r', 1e-6)
        .style("fill", function (d) {
            return d._children ? "lightsteelblue" : "#fff";
        });

    // Add labels for the nodes
    nodeEnter.append('text')
        .style('font-weight', 'bold')
        .attr("y", function (d) {
            return d.children || d._children ? ((d.parent !== null && d.data.feature === d.parent.children[0].data.feature) ? -13 : 23) : 4;
        })
        .attr("x", function (d) {
            return d.children || d._children ? 0 : 13;
        })
        .attr("text-anchor", function (d) {
            return d.children || d._children ? "end" : "start";
        })
        .text(function (d) {
            if (d.data.classification !== undefined) return d.data.classification;
            else return `${d.data.feature} <= ${d.data.threshold}`
        });

    // UPDATE
    const nodeUpdate = nodeEnter.merge(node);

    // Transition to the proper position for the node
    nodeUpdate.transition()
        .duration(tree_duration)
        .attr("transform", function (d) {
            return "translate(" + d.y + "," + d.x + ")";
        });

    // Update the node attributes and style
    nodeUpdate.select('circle.node')
        .attr('r', 10)
        .style("fill", function (d) {
            if (d.data.evaluation === undefined && d.data.visited) return '#0c0'
            else if (d.data.evaluation !== undefined && d.data.visited) {
                if (d.data.evaluation) return '#0c0'
                else return '#c00';
            } else return '#fff'
        })
        .attr('cursor', 'pointer');


    // Remove any exiting nodes
    const nodeExit = node.exit().transition()
        .duration(tree_duration)
        .attr("transform", function () {
            return "translate(" + source.y + "," + source.x + ")";
        })
        .remove();

    // On exit reduce the node circles size to 0
    nodeExit.select('circle')
        .attr('r', 1e-6);

    // On exit reduce the opacity of text labels
    nodeExit.select('text')
        .style('fill-opacity', 1e-6);

    // ****************** links section ***************************

    // Update the links...
    const link = tree_svg.selectAll('path.link')
        .data(links, function (d) {
            return d.id;
        });

    // Enter any new links at the parent's previous position.
    const linkEnter = link.enter().insert('path', "g")
        .attr("class", "link")
        .attr('d', function () {
            const o = {x: source.x0, y: source.y0}
            return diagonal(o, o)
        })
        .style('opacity', d => {
            return d.data.visited ? 1 : 0.3
        })
        .style('stroke-width', d => {
            let parent = d.parent;
            while (parent.parent !== undefined && parent.parent !== null) parent = parent.parent;
            return tree_link_width_scale((d.data.samples === undefined ? 1.0 : d.data.samples) / parent.data.samples);
        })
        .style('stroke', d => {
            if (d.data.classification !== undefined) {
                if (d.data.classification === 'Republican') return tree_link_rep_color_scale(1);
                else return tree_link_dem_color_scale(1);
            }
            else {
                if (d.data.value[0] > d.data.value[1]) return tree_link_rep_color_scale(d.data.value[0] / (d.data.value[0] + d.data.value[1]));
                else if (d.data.value[1] > d.data.value[0]) {
                    return tree_link_dem_color_scale(d.data.value[1] / (d.data.value[0] + d.data.value[1]));
                }
                else return tree_link_rep_color_scale(0);
            }
        });

    // UPDATE
    const linkUpdate = linkEnter.merge(link);

    // Transition back to the parent element position
    linkUpdate.transition()
        .duration(tree_duration)
        .attr('d', function (d) {
            return diagonal(d, d.parent)
        });

    // Remove any exiting links
    link.exit().transition()
        .duration(tree_duration)
        .attr('d', function () {
            const o = {x: source.x, y: source.y}
            return diagonal(o, o)
        })
        .remove();

    // Store the old positions for transition.
    nodes.forEach(function (d) {
        d.x0 = d.x;
        d.y0 = d.y;
    });

    // Creates a curved (diagonal) path from parent to the child nodes
    function diagonal(s, d) {

        return `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`
    }

    // Toggle children on click.
    function click(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
        updateTree(d);
    }
}


const displayTree = tree_num => {
    tree_root = d3.hierarchy(forest.trees[tree_num].buildModelForDisplay(feature_data), function (d) {
        return d.children;
    });
    tree_root.x0 = (window.innerHeight - TREE_MARGIN.top - TREE_MARGIN.bottom) / 2;
    tree_root.y0 = 0;

    updateTree(tree_root);
};

const load_month = async file => {
    return await Promise.all([d3.csv(`../data/models/rf_trees/meta/${file}.csv`)]).then(data => {
        return data[0];
    });
};


const extract_data_for_agency = (data, agency) => {
    const agency_data = {};
    let search_string = '';

    if ('total' === agency) search_string = `pct_total_`;
    else search_string = `pct_${agency}_total_to_`;

    data.forEach(d => {
        if (d['feature'].startsWith(search_string)) {
            agency_data[d['feature'].substring(d['feature'].length - 3)] = {
                'value': d['value'],
                'format': (d['value'] * 100) + '%'
            }
        }
    });

    return agency_data;
}


const predict = () => {
    const results = forest.predict(feature_data);

    document.querySelector('#vote_high').innerHTML = "" + Math.max(results[0], results[1]);
    document.querySelector('#vote_low').innerHTML = "" + Math.min(results[0], results[1]);
    document.querySelector('#party_res').innerHTML = results[0] > results[1] ? 'Republican' : 'Democrat';
    document.querySelector('#party_res').className = results[0] > results[1] ? 'republican' : 'democrat';

    displayTree(document.querySelector('#select_tree').value);
}


const selectMonth = async () => {
    const value = document.querySelector('#file_selector').value;
    feature_data = await load_month(value);

    setFields();
    color_map(map, map_scale, extract_data_for_agency(feature_data, document.querySelector('#department_select').value), tooltip_div);
    predict();
}


const getFeatureValue = feature => {
    let value = null;
    feature_data.forEach(f => {
        if (f['feature'] === feature)
            value = f['value'];
    });

    return parseFloat(value).toFixed(13);
};


const modifyFeature = element => {
    const feature = element.substring(1).replace('country', selected_country_code).replace('agency', selected_agency);
    let value = document.querySelector(element).value;

    if (feature.startsWith('pct_')) value /= 100.0;

    feature_data.forEach(f => {
        if (f['feature'] === feature)
            f['value'] = "" + value;
    });
    color_map(map, map_scale, extract_data_for_agency(feature_data, document.querySelector('#department_select').value), tooltip_div);

    predict();
}


const setFields = () => {
    document.querySelector('#selected_country').innerText = selected_country_name;
    document.querySelector('#total').value = Math.round(getFeatureValue('total'));
    document.querySelector('#total_agency').value = Math.round(getFeatureValue(`total_${selected_agency}`));
    document.querySelector('#pct_foreign').value = (getFeatureValue('pct_foreign') * 100).toFixed(13);
    document.querySelector('#pct_foreign_agency').value = (getFeatureValue(`pct_foreign_${selected_agency}`) * 100).toFixed(13);


    document.querySelector('#pct_total_to_country').value = (getFeatureValue(`pct_total_to_${selected_country_code}`) * 100).toFixed(13);

    const agencies = ['dos', 'usda', 'doc', 'hud', 'treas', 'doj', 'dod', 'ed', 'hhs', 'doi', 'va', 'doe', 'dot', 'dol', 'dhs'];

    agencies.forEach(a => {
        document.querySelector(`#pct_${a}_total_to_country`).value = (getFeatureValue(`pct_${a}_total_to_${selected_country_code}`) * 100).toFixed(13);
    });

    document.querySelector('#selected_country').onchange = () => modifyFeature('#selected_country');
    document.querySelector('#total').onchange = () => modifyFeature('#total');
    document.querySelector('#total_agency').onchange = () => modifyFeature('#total_agency');
    document.querySelector('#pct_foreign').onchange = () => modifyFeature('#pct_foreign');
    document.querySelector('#pct_foreign_agency').onchange = () => modifyFeature('#pct_foreign_agency');


    document.querySelector('#pct_total_to_country').onchange = () => modifyFeature('#pct_total_to_country');

    agencies.forEach(a => {
        document.querySelector(`#pct_${a}_total_to_country`).onchange = () => modifyFeature(`#pct_${a}_total_to_country`);
    });
}


const map_clicked = d => {
    if (isoCountries[d['properties']['name']] === undefined) {
        return;
    }
    if (iso2Toiso3[isoCountries[d['properties']['name']]] === undefined) {
        return;
    }
    selected_country_code = iso2Toiso3[isoCountries[d['properties']['name']]];
    selected_country_name = d['properties']['name'];

    setFields();
}


const initTreeView = () => {
    tree_svg = d3.select('#tree_svg').attr('width', window.innerWidth - 40).attr('height', window.innerHeight + 550)
    .append("g")
    .attr("transform", "translate("
        + TREE_MARGIN.left + "," + TREE_MARGIN.top + ")");
    tree_map = d3.tree().size([window.innerHeight - TREE_MARGIN.top - TREE_MARGIN.bottom, window.innerWidth - TREE_MARGIN.left - TREE_MARGIN.right]);
    const select_tree = document.querySelector('#select_tree');

    for (let i = 0; i < 185; i++)
    {
        const option = document.createElement('option');
        option.value = "" + i;
        option.innerText = `Decision Tree ${i}`;
        select_tree.appendChild(option);
    }

    select_tree.selectedIndex = 0;

    displayTree(0);
}


const init = async () => {
    const map_data = await initializeMap('#map_svg', 1200, 600, map_clicked);

    map = map_data[0];
    map_scale = map_data[1];
    tooltip_div = map_data[2];

    document.querySelector('#file_selector').selectedIndex = 0;
    feature_data = await load_month(document.querySelector('#file_selector').value);

    setFields();

    RandomForest.loadForest(185).then(f => {
        forest = f;
        initTreeView();
        predict();
    });

    color_map(map, map_scale, extract_data_for_agency(feature_data, 'dos'), tooltip_div);

    const department_select = document.querySelector('#department_select');
    department_select.selectedIndex = 0;
    department_select.addEventListener('change', () => {
        selected_agency = department_select.value;
        setFields();
        color_map(map, map_scale, extract_data_for_agency(feature_data, department_select.value), tooltip_div);
    });
}

init();