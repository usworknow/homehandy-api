// https://github.com/lorenwest/node-config/wiki
module.exports = {
  dbHost: process.env.RDS_HOSTNAME || 'localhost',
  dbPort: process.env.RDS_PORT || 5444,
  db: process.env.RDS_DB_NAME || 'homehandy_local',
  dbUser: process.env.RDS_USERNAME || 'hhdbuser',
  dbPassword: process.env.RDS_PASSWORD || 'localpwd1',
  superuser: process.env.SUPERUSER || 'user@example.com',
  superpassword: process.env.SUPERPASSWORD || 'thisisalongpasswordJustfor1time',
  sendgridAPI: process.env.SENDGRID || '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',
  frontendDomain: process.env.FRONTEND || 'localhost:3033',
  profileImageWidth: process.env.PROFILE_IMAGE_WIDTH || 300,
  profileImageHeight: process.env.PROFILE_IMAGE_HEIGHT || 300,
  cloudinary: 'cloudinary://667235199166863:BnYPWzuPurNd8z3fmKSy9ukRIZk@homehandy',
  stripeKey: 'sk_test_RslmyAX4GGWg9lWnUIb0dGYj004xcoDLf1',
  datazooUser: '',
  datazooPass: ''
}
