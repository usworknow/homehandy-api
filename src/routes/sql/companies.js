const baseProfile = `select c.*, 
	(select json_agg(usrs) from 
		(select users.*, user_companies.role
		from users
		inner join user_companies on user_companies.user_id = users.id
		WHERE user_companies.company_id = c.id
		ORDER BY users.created_at desc) usrs
	  ) as users,
	(select json_agg(hrs) from 
	  (select h.* from company_hours h
	  	WHERE h.company_id = c.id
	  ORDER BY h.day_of_week asc) hrs
	) as hours,
	(select json_agg(svcs) from 
		(select services.id, services.label
		from services 
		inner join company_services on company_services.service_id = services.id
		WHERE company_services.company_id = c.id
		ORDER BY services.label asc) svcs
	  ) as services,
	(select json_agg(areas) from 
		(select id, place_id, lat, lng, radius, description
			from  company_service_areas 
			WHERE company_service_areas.company_id = c.id
		) areas
	) as service_areas,
	(select json_agg(pcks) from 
		(select service_packages.*, services.label as service_label,
			(select json_agg(sps) from 
				(select si.id as service_inclusion_id, si.label as inclusion_label, pi.frequency_id, pi.value, pi.price, si.inclusion_type, si.description from service_package_inclusions pi
					inner join service_inclusions si on si.id = pi.service_inclusion_id
					where pi.service_package_id = service_packages.id
				) sps
			) as inclusions
		from service_packages 
		inner join companies on service_packages.company_id = companies.id
		inner join services on services.id = service_packages.service_id
		WHERE service_packages.company_id = c.id
		AND service_packages.archived_at is null
		ORDER BY service_packages.price asc) pcks
  	) as service_packages
from companies c `

module.exports.getAll = baseProfile
module.exports.getSearch = baseProfile + ` ORDER BY levenshtein(LOWER(c.name), LOWER(:term),1,0,4)`
module.exports.getCompanyById = baseProfile + ` WHERE c.id = :companyId`
module.exports.getCompanyForUser = baseProfile + ` INNER JOIN user_companies on user_companies.company_id = c.id WHERE user_companies.user_id = :userId AND c.id = :companyId`
module.exports.getCompaniesForUser = baseProfile + ` INNER JOIN user_companies on user_companies.company_id = c.id WHERE user_companies.user_id = :userId`
