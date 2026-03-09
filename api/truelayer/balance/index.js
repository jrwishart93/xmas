const { GET } = require('../../../build-server/app/api/truelayer/balance/route.js');
const { createVercelRoute } = require('../../_lib/vercelRoute.js');

module.exports = createVercelRoute({ GET });
