const { POST } = require('../../build-server/app/api/create-checkout-session/route.js');
const { createVercelRoute } = require('../_lib/vercelRoute.js');

module.exports = createVercelRoute({ POST });
