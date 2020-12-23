# Home Handy API
The API for the Home Handy platform, using NodeJs Express, Postgres database and Knex query builder.

## ENV Variables:

Set up config folder files with local database info for Postgres, default user, sendgrid API key, frontend domain for email links, profile image default size and cloudinary key

* Available NODE_ENV options are `localhost` and `dev`

## Knex database schema updates

 * `NODE_ENV=localhost knex migrate:make db_name_OR_action` - locally creates new sql migration file in the migrations folder

 * `NODE_ENV=localhost knex migrate:rollback` - rollback latest update locally

## Deployment

For a local deployment, ensure that you have docker installed. To run, use
`npm run dev`. A Postgres database will be spun up, with a persistent data
volume. To fully teardown the volume and database container, run `npm run clean`.

## Authenticationn

Registration and Authentication is managed via the auth route. After logging in, a random, expiring Bearer Token will be issued for the user. Default account will be  created based on config variables.

## Scripts

 * ./scripts/dev_pg - handles database setup for dev environments.  Sets a default super admin user and password.  Defined in the config folder per environment

 * ./scripts/dev_cleanup - removes the database container and data volume. Does *not* clear the docker image cache.

## Database Design Overview

When a user first registers for the site they are added to the `users` database table.  The user can have one of two authentication types, either Google or Local.  When the user logs in, they will be given an authentication token that must be used for all API calls.

A user can add zero-to-many "Properties", which makes the user a "Customer".  The user is associated with those properties, and the properties have "Services" and "Subscriptions".  

A user can have zero-to-many "Companies", which makes the user an "Agent" or "Agency".  The user is associated with the companies, and the companies have "Services", "Service Areas", "Service Packages", and "Appointments".

## API Design Overview

The login API and registration API will verify the user information in the request and return basic information for the user.  The `default_profile` property will indicate if the user should start as an "admin", "customer", or "agency".  

Using the companies API and properties API will provide the companies and properties created by that user.  "Admin" users will be returned all companies and all properties for all users.  The company objects returned will include the services, service areas, and service packages created for that company.  The property objects returned will include the services and subscriptions for that property.

The service areas API and services API will provide the reference data for all service areas and services available to all companies and properties.

All API calls are logged to the `api_log` table, including the user_id where applicable, the request and the response.

