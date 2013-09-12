var nforce = require('nforce');

var org = nforce.createConnection({
  clientId: '3MVG9yZ.WNe6byQDvf0fNZBfASMP90Z0fKygi8.HrvWcwzWmfnwHZsutu0.O3ihi4E5oD2ur9rU5VLLjBs2e4',
  clientSecret: '1553956264060283912',
  redirectUri: 'http://salesforce-inbox.aws.af.cm/oauth/_callback',
  environment: 'production',  // optional, salesforce 'sandbox' or 'production', production default
  mode: 'multi' // optional, 'single' or 'multi' user mode, multi default
});

var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    _ = require('underscore');

//AppFog doesn't support websockets yet, boo.
io.set('transports', ['htmlfile', 'xhr-polling', 'jsonp-polling']);

// -- MIDDLEWARE --
app.use(express.basicAuth('martone', 'hospital'));
app.use(express.cookieParser());
app.use(express.session({ secret: 'blah blah blah'}));
app.use(express.static(__dirname + '/public'));

// -- CREDENTIALS --
var authCredentials = {
  username: 'matt@clixlocal.net',
  password: 'Diablo123',
  securityToken: 'gndMn2mAQA3LGddS3gkaLWe9v'
};

var postFields = [
  'Content__c',
  'Sentiment__c',
  'Publish_Date__c',
  'Hospital_Name__c',
  'Post_URL__c',
  'Influencer__c',
  'Type__c',
  'Topic_Tags__c',
  'Tagged__c',
  'Descriptive_Keywords__c',
  'Author__r.Name',
  'Author__r.Picture_URL__c'
];

var whereFieldsDefault = [
  "Author__r.name != 'Tara Pomkoski'",
  "Publish_date__c = LAST_N_DAYS:30",
  "Hospital__r.Account__c = '001A000000Ou4TB'"
];

function getPosts(socket, oauth, filter){
  var whereFields = _.union(whereFieldsDefault, processFilter(filter));
  var query = 'SELECT ' + postFields.join(', ') + ' FROM Post__c WHERE ' + whereFields.join(' AND ') + ' ORDER BY Publish_Date__c DESC LIMIT 20';
  org.query(query, oauth, function(err, resp){
    if(!err && resp.records) {
      socket.emit('posts', resp.records);
    } else {
      socket.emit(err);
    }
  });
}

// --- SOCKETS ---

io.sockets.on('connection', function (socket) {
  authenticate(socket);

  socket.on('getPosts', function(filter){
    socket.get('oauth', function(err, oauth){
      if (err){
        console.log(err);
        socket.emit('error', err);
      } else {
        getPosts(socket, oauth, filter);
      }
    });
  });
});

function authenticate(socket){
  org.authenticate(authCredentials, function(err, resp){
    if (err){
      console.log(err);
      socket.emit('error', err)
    } else {
      socket.set('oauth', resp, function(){
        socket.emit('authenticated');
      });
    }
  });
}

function processFilter(filter){
  var result = [];
  if (!filter) return result;

  if (filter.sentiment){
    result.push('Sentiment__c IN (' + quotify(filter.sentiment).join(',') + ')');
  }
  return result;
}

function quotify(array){
  return _.map(array, function(x){ return "'" + x + "'"; });
}

server.listen(process.env.OPENSHIFT_NODEJS_PORT || 3000);