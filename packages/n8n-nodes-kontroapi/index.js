module.exports = {
  nodes: [
    require('./dist/nodes/KontroAPI/KontroAPI.node'),
    require('./dist/nodes/KontroAPI/KontroAPITrigger.node'),
  ],
  credentials: [
    require('./dist/credentials/KontroAPIApi.credentials'),
  ],
};