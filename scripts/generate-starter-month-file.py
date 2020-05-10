import pandas as pd
import sys
import calendar
import os.path


def main():
    if len(sys.argv) != 3:
        print('Usage: ./generate-start-month-file.py month year')
        return

    month = int(sys.argv[1])
    year = int(sys.argv[2])

    data = pd.read_pickle('../data/df/dt_dataset_by_month.pkl.gz')

    data = data.fillna(0)

    month_data = data.loc[year + month/12]

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

    # Technically vulnerable to path traversal but 1) this is a small dumb script, 2) these are supposed to be integers
    # so we don't really have to worry about it.
    file_name = f'{year}_{calendar.month_name[month].lower()}.csv'
    file_path = os.path.join('../data/models/rf_trees/meta/', file_name)
    month_data.to_csv(file_path, index_label='feature', header=['value'])


if __name__ == "__main__":
    main()
