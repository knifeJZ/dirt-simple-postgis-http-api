// route query
const sql = (params, query) => {
  const [startId, endId] = params.point.match(/^((-?\d+\.?\d+)(,-?\d+\.?\d+)(,[0-9]{4}))/)[0].split(',')
  return `
  SELECT
    min(r.seq) AS seq,
    e.old_id AS id,
    e.name,
    sum(e.distance) AS distance,
    ST_AsText(ST_Collect(e.geom)) AS geom 
      FROM pgr_dijkstra('SELECT id,source,target,distance AS cost 
 FROM ${params.table}',${startId},${endId},false) AS r,${params.table} AS e 
 WHERE r.edge=e.id GROUP BY e.old_id,e.name
  `
}

// route schema
const schema = {
  description: '返回给定点的路径.',
  tags: ['brainapi'],
  summary: '表的字段列表',
  params: {
    table: {
      type: 'string',
      description: '表或视图的名字.'
    }
  }
}

// create route
module.exports = function (fastify, opts, next) {
  fastify.route({
    method: 'GET',
    url: '/path_geojson/:table/:point',
    schema: schema,
    handler: function (request, reply) {
      fastify.pg.connect(onConnect)

      function onConnect(err, client, release) {
        if (err) return reply.send({
          "statusCode": 500,
          "error": "Internal Server Error",
          "message": "unable to connect to database server"
        })

        client.query(
          sql(request.params),
          function onResult(err, result) {
            release()
            reply.send(err || result.rows)
          }
        )
      }
    }
  })
  next()
}

module.exports.autoPrefix = '/v1'
