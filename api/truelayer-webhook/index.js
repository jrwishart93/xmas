const { POST } = require('../../build-server/app/api/truelayer-webhook/route.js');
const { createVercelRoute } = require('../_lib/vercelRoute.js');

module.exports = createVercelRoute({ POST });
