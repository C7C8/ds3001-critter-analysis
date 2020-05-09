let feature_data = null;
let selected_country_code = 'USA';
let selected_country_name = 'United States of America';
let selected_agency = 'doj';
let forest = null;

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
                'format': (d['value']*100) + '%'
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
    const value = document.querySelector(element).value;

    feature_data.forEach(f => {
        if (f['feature'] === feature)
            f['value'] = "" + value;
    });

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


const init = async () => {
    const map_data = await initializeMap('#map_svg', 1200, 600, map_clicked);

    const map = map_data[0], map_scale = map_data[1], tooltip_div = map_data[2];
    const month_data = await load_month('2014_september');

    feature_data = month_data;

    setFields();

    RandomForest.loadForest(185).then(f => {
        forest = f;
        predict();
    });

    color_map(map, map_scale, extract_data_for_agency(month_data, 'dos'), tooltip_div);

    const department_select = document.querySelector('#department_select');
    department_select.selectedIndex = 0;
    department_select.addEventListener('change', () => {
        selected_agency = department_select.value;
        setFields();
        color_map(map, map_scale, extract_data_for_agency(month_data, department_select.value), tooltip_div);
    });
}

init();