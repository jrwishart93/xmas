const { POST } = require('../../../build-server/app/api/scn/payment-method/route.js');
const { createVercelRoute } = require('../../_lib/vercelRoute.js');

module.exports = createVercelRoute({ POST });
