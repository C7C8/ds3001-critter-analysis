import pandas as pd


def main():
    data = pd.read_pickle('../data/df/dt_dataset_by_month.pkl.gz')

    data = data.fillna(0)

    month_data = data.loc[2014.6666666666667]

    countries = pd.read_csv('../data/models/rf_trees/meta/countries.csv')['country'].to_list()
    agencies = pd.read_csv('../data/models/rf_trees/meta/agencies.csv')['agency'].to_list()

    agencies.remove('oth')

    sample_month = pd.DataFrame(columns=agencies, index=countries)

    other_agency_total = month_data['total']
    for agency in agencies:
        other_agency_total -= month_data['total_{}'.format(agency)]

    for country in countries:
        country_total_from_other_agencies = month_data['pct_total_to_{}'.format(country)] * month_data['total']
        for agency in agencies:
            country_total_from_other_agencies -= month_data['total_{}'.format(agency)] * month_data['pct_{}_total_to_{}'.format(agency, country)]
            sample_month.at[country, agency] = month_data['total_{}'.format(agency)] * month_data['pct_{}_total_to_{}'.format(agency, country)]
        sample_month.at[country, 'oth'] = country_total_from_other_agencies

    for agency in agencies:
        print('{} total: {}'.format(agency, month_data['total_{}'.format(agency)]))

    print('Total: {}'.format(month_data['total']))

    sample_month.to_csv('../data/models/rf_trees/meta/2014_august.csv')


if __name__ == "__main__":
    main()
