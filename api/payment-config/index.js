const { GET } = require('../../build-server/app/api/payment-config/route.js');
const { createVercelRoute } = require('../_lib/vercelRoute.js');

module.exports = createVercelRoute({ GET });
