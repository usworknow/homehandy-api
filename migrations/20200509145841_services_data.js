
exports.up = async function(knex) {
    const services =
        [ 
            {label: 'Gardening'},
            {label: 'Cleaning'},
            {label: 'Handyman / Home Maintenance'},
            {label: 'Lawn Care'},
            {label: 'Pool Maintenance'},
            {label: 'Dog Grooming'},
            {label: 'Dog Walking'},
            {label: 'Firewood'},
            {label: 'Chimney Cleaning'},
            {label: 'Car Wash'},
        ]

    await knex('services').del()
    await knex('services').insert(services)
}

exports.down = async function(knex) {
  
}
