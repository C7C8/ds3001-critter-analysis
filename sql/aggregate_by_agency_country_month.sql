SELECT SUM(ts.federal_action_obligation) as sum, ts.awarding_agency_name, SUBSTRING(ts.period_of_performance_star, 1, 4) as year, SUBSTRING(ts.period_of_performance_star, 6, 2) as month, cc.country_code as country
FROM transaction_fpds ts
    JOIN ref_country_code cc ON (cc.country_name = ts.legal_entity_country_code or cc.country_code = ts.legal_entity_country_code)
WHERE ts.legal_entity_country_code != 'NAN'
GROUP BY ts.awarding_agency_name, SUBSTRING(ts.period_of_performance_star, 1, 7), cc.country_code, SUBSTRING(ts.period_of_performance_star, 1, 4) , SUBSTRING(ts.period_of_performance_star, 6, 2),  ts.awarding_agency_name;
