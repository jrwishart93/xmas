const { GET } = require('../../../build-server/app/api/truelayer/callback/route.js');
const { createVercelRoute } = require('../../_lib/vercelRoute.js');

module.exports = createVercelRoute({ GET });
