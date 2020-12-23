const baseProfile = `select u.*, 
        user_google_auths.google_id,
        (select json_agg(vers) from 
            (select * from user_verifications uv
                WHERE uv.user_id = u.id
                ORDER BY uv.created_at desc) vers
        ) as verifications
    from users u 
    LEFT JOIN user_google_auths on user_google_auths.user_id = u.id `

module.exports.getAll = baseProfile
module.exports.getSearch = baseProfile + ` ORDER BY levenshtein(LOWER(CONCAT(u.first_name, ' ', u.last_name), LOWER(:term),1,0,4)`
module.exports.getUserById = baseProfile + ` WHERE u.id = :userId`
