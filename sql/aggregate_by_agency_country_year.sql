SELECT SUM(ts.federal_action_obligation) as sum, ts.awarding_agency_name, SUBSTRING(ts.period_of_performance_star, 1, 4) as year, cc.country_code as country
FROM transaction_fpds ts
    JOIN ref_country_code cc ON (cc.country_name = ts.legal_entity_country_code or cc.country_code = ts.legal_entity_country_code)
WHERE ts.legal_entity_country_code != 'NAN'
GROUP BY ts.awarding_agency_name, SUBSTRING(ts.period_of_performance_star, 1, 4), cc.country_code, ts.awarding_agency_name;
