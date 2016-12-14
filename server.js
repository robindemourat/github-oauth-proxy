var http = require('http');
var https = require('https');

var cors = require('cors');
var express = require('express')
var app = express();

var config = require('./config.json');

function getToken(code, res) {
  if (typeof code != 'string') {
    res.writeHead(400, 'Must supply code');
    res.end();
    return;
  }

  console.log('getting token');

  var ghreq = https.request({
    hostname:'github.com',
    path:'/login/oauth/access_token',
    method:'POST',
    headers:{
      "Content-Type":"application/json",
      "Accept":"application/json"
    }
  }, function(ghres){
    var data = '';

    if (ghres.statusCode === 404) {
      res.writeHead(500);
      res.end();
      return;
    }

    ghres.on('data', function(chunk){data += chunk;});
    ghres.on('end', function() {
      var body = JSON.parse(data);
      if (body['error'] != null)
        res.writeHead(400, body['error']);
      else
        res.writeHead(200);

      res.write(data);
      res.end();
    });
  });

  var data = {
    client_id: config.client_id,
    client_secret: config.client_secret,
    code:code
  };
  ghreq.write(JSON.stringify(data));
  ghreq.end();
}

app.use(cors());

app.post('/', function (req, res) {
  console.log('got request');
  res.setHeader('Allow', 'POST');
  res.setHeader('Accept', 'application/json');
  var data = '';

  console.log('got request with method ', req.method);

  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end();
    return;
  }

  console.log('request is a post as expected');

  var lcHeaders = {};
  for (k in req.headers)
    lcHeaders[k.toLowerCase()] = req.headers[k];

  if (lcHeaders['content-type'] !== 'application/json') {
    res.writeHead(415, 'Content-Type must be application/json');
    res.end();
    return;
  }

  req.on('data', function(chunk) {
    data += chunk;
    if (data.length > 1e6) {
      // body too large
      res.writeHead(413);
      req.connection.destroy();
    }
  });
  req.on('end', function(){
    var body = data != '' ? JSON.parse(data) : undefined;
    getToken(body['code'], res);
  });
});

app.listen(3001, function(){
  console.log('app listening on 3001');
});