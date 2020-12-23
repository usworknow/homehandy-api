const baseProfile = `select p.*, 
	(select json_agg(svcs) from 
		(select services.id, services.label
		from services 
		inner join property_services on property_services.service_id = services.id
		WHERE property_services.property_id = p.id
		ORDER BY services.label asc) svcs
	) as services,
	(select json_agg(usrs) from 
		(select users.*
		from users
		inner join user_properties on user_properties.user_id = users.id
		WHERE user_properties.property_id = p.id
		ORDER BY users.created_at desc) usrs
  	) as users
from properties p `

module.exports.getAll = baseProfile
module.exports.getSearch = baseProfile + ` ORDER BY levenshtein(LOWER(CONCAT(p.address, ' ', p.city, ' ', p.state, ' ', p.postcode)), LOWER(:term),1,0,4)`
module.exports.getPropertyById = baseProfile + ` WHERE p.id = :propertyId`
module.exports.getPropertyForUser = baseProfile + ` INNER JOIN user_properties on user_properties.property_id = p.id WHERE user_properties.user_id = :userId AND p.id = :propertyId`
module.exports.getPropertiesForUser = baseProfile + ` INNER JOIN user_properties on user_properties.property_id = p.id WHERE user_properties.user_id = :userId`
