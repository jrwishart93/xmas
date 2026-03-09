const { POST } = require('../../../build-server/app/api/team/join/route.js');
const { createVercelRoute } = require('../../_lib/vercelRoute.js');

module.exports = createVercelRoute({ POST });
